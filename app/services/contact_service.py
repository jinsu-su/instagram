import json
import asyncio
import os
import httpx
from datetime import datetime
from uuid import UUID
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import google.generativeai as genai
from typing_extensions import TypedDict
import typing

class ContactAnalysis(TypedDict):
    ai_summary: str
    tags: typing.List[str]
    interaction_type: str
    engagement_score: float
    needs_review: bool

from app.models.contact import Contact
from app.models.instagram_account import InstagramAccount
from app.utils.logging import get_logger
from app.config import get_settings

logger = get_logger(__name__)
settings = get_settings()

# Production Robustness: Limit concurrent AI operations to prevent OOM/CPU spikes
AI_SEMAPHORE = asyncio.Semaphore(5)

class ContactService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_contact(self, customer_id: UUID, instagram_id: str, username: str = None, full_name: str = None, profile_pic: str = None, access_token: str = None) -> Contact:
        """Finds or creates a contact for a customer. Optimized for latency."""
        result = await self.db.execute(
            select(Contact).where(
                Contact.customer_id == customer_id,
                Contact.instagram_id == instagram_id
            ).order_by(Contact.created_at.desc())
        )
        # Use scalars().all() then first() to handle 'Multiple rows' race conditions
        contacts = result.scalars().all()
        contact = contacts[0] if contacts else None
        
        # Identity Cleanup: If duplicates were created in a race condition, remove older ones
        if len(contacts) > 1:
            logger.warning(f"🧹 Identity Cleanup: Found {len(contacts)} duplicate contacts for {instagram_id}. Deleting stale records.")
            for stale_c in contacts[1:]:
                await self.db.delete(stale_c)
            await self.db.commit() # Commit deletion immediately to stabilize
            # Refetch to ensure session stability
            return await self.get_or_create_contact(customer_id, instagram_id, username, full_name, profile_pic)
        
        if not contact:
            # For Scoped IDs (from webhooks), we cannot fetch profile directly via Profile API
            # Profile data will be synced from Conversations API instead
            # This avoids 400 Bad Request errors
            # However, if profile_pic and full_name are provided from webhook real-time fetch, use them
            numeric_ig_id = None
            
            contact = Contact(
                customer_id=customer_id,
                instagram_id=instagram_id,
                numeric_ig_id=numeric_ig_id,
                username=username,  # Will be set from webhook real-time fetch
                full_name=full_name,  # Use provided full_name from webhook if available
                profile_pic=profile_pic,  # Use provided profile_pic from webhook if available
                interaction_count=1,
                last_interaction_at=datetime.utcnow()
            )
            self.db.add(contact)
            await self.db.flush() # Get ID without committing
        else:
            contact.interaction_count += 1
            contact.last_interaction_at = datetime.utcnow()
            
            # Update username if provided from webhook real-time fetch
            if username and contact.username != username:
                logger.debug(f"🔄 Updating contact username for {instagram_id}: {contact.username} -> {username}")
                contact.username = username
            
            if full_name and contact.full_name != full_name:
                contact.full_name = full_name
            
            # Update profile_pic if provided and different, or if current is None
            if profile_pic and (not contact.profile_pic or contact.profile_pic != profile_pic):
                contact.profile_pic = profile_pic
            
            # Profile data (name, pic) will be synced from Conversations API
            # No direct Profile API calls to avoid 400 errors with Scoped IDs
        
        return contact

    async def update_contact_profile(self, contact_id: UUID, access_token: str, force: bool = False):
        """Fetches and updates contact profile info (name, pic) via Messaging API with throttling."""
        result = await self.db.execute(select(Contact).where(Contact.id == contact_id))
        contact = result.scalar_one_or_none()
        if not contact: return

        # Throttling Logic: Only update if forced, or if data is missing, or if last updated > 6 hours ago
        if not force and contact.profile_pic and contact.updated_at:
            from datetime import timedelta
            if datetime.utcnow() - contact.updated_at < timedelta(hours=6):
                logger.debug(f"⏭️ Skipping profile update for {contact.instagram_id} (Recently updated)")
                return
 
        # Instagram Business Login: always use graph.instagram.com
        url = f"https://graph.instagram.com/v25.0/{contact.instagram_id}"
        params = {
            "fields": "username,name,profile_pic",
            "access_token": access_token
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get(url, params=params)
                if resp.is_success:
                    data = resp.json()
                    contact.username = data.get("username") or contact.username
                    contact.full_name = data.get("name") or contact.full_name
                    contact.profile_pic = data.get("profile_pic") or contact.profile_pic
                    
                    # Update related ChatSessions immediately for Inbox visibility
                    from app.models.chat import ChatSession
                    await self.db.execute(
                        update(ChatSession)
                        .where(ChatSession.customer_id == contact.customer_id, ChatSession.participant_id == contact.instagram_id)
                        .values(
                            participant_username=contact.username,
                            participant_name=contact.full_name,
                            participant_profile_pic=contact.profile_pic
                        )
                    )
                    
                    await self.db.commit()
                    logger.info(f"✅ Successfully refreshed profile for contact: {contact.instagram_id} (@{contact.username})")
                else:
                    logger.warning(f"⚠️ Messaging Profile API failed: {resp.text}")
            except Exception as e:
                logger.error(f"Failed to update contact profile for {contact.instagram_id}: {e}")

    async def update_numeric_ig_id(self, contact_id: UUID, numeric_ig_id: str):
        """Updates just the numeric IG ID (Internal use)."""
        await self.db.execute(
            update(Contact)
            .where(Contact.id == contact_id)
            .values(numeric_ig_id=numeric_ig_id, updated_at=datetime.utcnow())
        )
        await self.db.commit()

    async def run_ai_analysis(self, contact_id: UUID, new_text: str, is_moderation_alert_active: bool = True):
        """
        Premium background task to analyze contact intent with deep context.
        Uses sliding window of recent messages + cumulative persona summary.
        """
        # 1. Basic Filtering (L1) - Noise reduction
        if len(new_text.strip()) < 3:
            logger.info(f"⏭️ Skipping AI analysis for short reaction: {new_text}")
            return

        result = await self.db.execute(select(Contact).where(Contact.id == contact_id))
        contact = result.scalar_one_or_none()
        if not contact or not settings.google_api_key: return

        # 2. Context Extraction (Sliding Window - Recent 15 msgs)
        from app.models.chat import ChatMessage, ChatSession
        
        # Get the session for this contact specifically for this customer
        session_result = await self.db.execute(
            select(ChatSession)
            .where(
                ChatSession.customer_id == contact.customer_id,
                ChatSession.participant_id == contact.instagram_id
            )
            .order_by(ChatSession.updated_at.desc())
            .limit(1)
        )
        session = session_result.scalars().first()
        
        recent_messages_text = ""
        if session:
            msg_result = await self.db.execute(
                select(ChatMessage)
                .where(ChatMessage.session_id == session.id)
                .order_by(ChatMessage.created_at.desc())
                .limit(15)
            )
            msgs = msg_result.scalars().all()
            # Reverse to get chronological order
            msg_list = []
            for m in reversed(msgs):
                sender = "고객" if not m.is_from_me else "브랜드"
                msg_list.append(f"[{sender}]: {m.content or '(미디어)'}")
            recent_messages_text = "\n".join(msg_list)

        api_key = settings.google_api_key.get_secret_value()
        genai.configure(api_key=api_key)
        
        # Robust model selection
        model = None
        for m_name in ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"]:
            try:
                model = genai.GenerativeModel(m_name)
                break
            except Exception:
                continue
        
        if not model:
            logger.error(f"Failed to initialize any Gemini model for analysis")
            return
        
        # 3. Premium Persona Prompt (Distilled Context)
        # 공식 Structured Output(Response Schema)과 System Instruction을 결합하여 한국어 출력을 강제합니다.
        system_instruction = "당신은 세계 최고의 비즈니스 CRM 전략가이자 브랜드 매니저입니다. 모든 분석 결과(ai_summary, tags 등)는 반드시 전문적인 **한국어**로만 작성해야 하며, 영어를 절대 사용하지 마세요. 데이터가 영어여도 한국어로 번역하여 요약하세요."
        model = genai.GenerativeModel(model.model_name, system_instruction=system_instruction)
        current_summary = contact.ai_summary or "신규 고객 (분석 내역 없음)"
        current_tags = contact.tags or []
        
        prompt = f"""고객의 [최근 대화 흐름]과 [이전 누적 페르소나]를 결합하여, 고객의 현재 상태를 정밀하게 진단하세요.

[이전 누적 페르소나]: 
{current_summary}

[최근 대화 흐름 (최대 15개)]:
{recent_messages_text}

[새로 도착한 메시지]:
{new_text}

요구사항:
1. 모든 출력(ai_summary, tags 등)은 반드시 **전문적인 한국어**로만 작성하세요. 영어를 절대 사용하지 마세요.
2. 'ai_summary': 오디언스의 성향, 관심사, 소통 특징을 종합하여 한 문장으로 압축하여 업데이트하세요. 만약 정보가 부족하여 분석이 어렵다면, "신규 고객입니다. 소통을 통해 고객의 니즈를 파악해 보세요."와 같이 정중한 한국어 문구로 대체하세요.
3. 'tags': 오디언스의 핵심 의도를 나타내는 짧고 직관적인 **한국어** 태그 리스트(예: #안부인사, #정보요청, #찐팬인증). 반드시 가장 중요한 핵심 키워드 3~5개 이내로만 선별하여 생성하세요.
4. 'interaction_type': 다음 중 하나 선택: "일상소통", "정보/문의", "비즈니스", "기타".
5. 'engagement_score': 0~100 점수.
6. 'needs_review': 응대 필요 상황 시 true, 아니면 false.
"""
        try:
            async with AI_SEMAPHORE:
                generation_config = {
                    "response_mime_type": "application/json",
                    "response_schema": ContactAnalysis
                }
                # Wrap synchronous generate_content in a thread
                resp = await asyncio.to_thread(
                    model.generate_content, 
                    prompt, 
                    generation_config=generation_config
                )
                data = json.loads(resp.text.strip())
            
            # 4. Update and Commit
            contact.ai_summary = data.get("ai_summary", contact.ai_summary)
            # Overwrite tags with the refined 3-5 tags from AI (Do not accumulate)
            contact.tags = data.get("tags", [])[:5] 
            
            # If needs_review is true, add a special tag for easy filtering
            if data.get("needs_review"):
                if "응대필요" not in contact.tags:
                    contact.tags.append("응대필요")
            else:
                if "응대필요" in contact.tags:
                    contact.tags.remove("응대필요")

            # Update metrics
            contact.buying_phase = data.get("interaction_type", contact.buying_phase)
            contact.engagement_score = float(data.get("engagement_score", contact.engagement_score))
            
            # 5. Priority Activity Logging (if needs_review and alerts are active)
            if data.get("needs_review") and is_moderation_alert_active:
                from app.services.activity_service import ActivityService
                activity_service = ActivityService(self.db)
                await activity_service.log_activity(
                    customer_id=contact.customer_id,
                    contact_id=contact.id,
                    event_type="HUMAN_INTERVENTION_NEEDED",
                    trigger_source="ai_analysis",
                    trigger_text=new_text,
                    action_text=f"AI detected frustration or human request. Summary: {data.get('ai_summary')}",
                    status="ALERT"
                )
                logger.info(f"🚨 Priority alert logged for {contact.instagram_id}")

            await self.db.commit()
            logger.info(f"💎 Premium AI Analysis completed for {contact.instagram_id}")
        except Exception as e:
            logger.error(f"❌ Premium AI Analysis failed for {contact.instagram_id}: {e}")
    async def generate_ai_response(
        self, 
        user_text: str, 
        system_prompt: Optional[str] = None, 
        ai_summary: Optional[str] = None, 
        tags: List[str] = None, 
        kb_url: Optional[str] = None, 
        kb_filename: Optional[str] = None,
        instagram_id: Optional[str] = None,
        chat_history: Optional[str] = None
    ) -> Optional[str]:
        """
        Generates a contextual AI response using Gemini based on pre-extracted data and history.
        """
        if not settings.google_api_key: return None

        api_key = settings.google_api_key.get_secret_value()
        genai.configure(api_key=api_key)
        
        # Robust model selection
        model = None
        for m_name in ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"]:
            try:
                model = genai.GenerativeModel(m_name)
                break
            except Exception:
                continue
        
        if not model:
            logger.error(f"Failed to initialize any Gemini model for response")
            return None
        
        system_prompt = system_prompt or "당신은 인스타그램 브랜드 어시스턴트입니다."
        
        # Knowledge Base Integration
        if kb_url:
            try:
                # URL is like /static/uploads/filename.ext -> local path: static/uploads/filename.ext
                local_path = kb_url.lstrip("/")
                if os.path.exists(local_path):
                    if local_path.endswith(".txt"):
                        with open(local_path, "r", encoding="utf-8") as f:
                            kb_content = f.read()
                            system_prompt = f"{system_prompt}\n\n[참고 파일 정보]\n{kb_content}"
                    elif local_path.endswith(".pdf") or local_path.endswith(".docx"):
                        system_prompt = f"{system_prompt}\n\n[참고 파일]: {kb_filename} 항목이 답변 참조용으로 연결되어 있습니다."
            except Exception as e:
                logger.error(f"Failed to read KB file: {e}")

        tags_str = ", ".join(tags) if tags else "정보 없음"
        # Context includes cumulative summary AND recent chat history
        contact_context = f"고객 요약(페르소나): {ai_summary or '정보 없음'}, 태그: {tags_str}"
        
        history_section = ""
        if chat_history:
            history_section = f"\n[최근 대화 내역 (맥락)]:\n{chat_history}"

        prompt = f"""[지침]: {system_prompt}
[고객 정밀 정체성]: {contact_context}{history_section}

[고객의 새로운 메시지]: {user_text}

규칙:
1. 위 [지침]에 정의된 페르소나와 어투를 엄격히 준수하여 답변하세요.
2. 자연스럽고 친절한 태도를 유지하며 적절한 이모지를 사용하세요.
3. 답변은 1~3문장 이내로 간결하게 핵심만 전달하세요.
4. 고객의 질문에 대해 [최근 대화 내역]을 참고하여 중복되지 않고 맥락에 맞는 답변을 하세요.
5. 오직 답변 내용만 텍스트로 출력하세요.
"""
        try:
            async with AI_SEMAPHORE:
                # Wrap synchronous generate_content in a thread
                resp = await asyncio.to_thread(model.generate_content, prompt)
                return resp.text.strip()
        except Exception as e:
            logger.error(f"Failed to generate AI response for {instagram_id}: {e}")
            return None

    async def list_contacts(self, customer_id: UUID) -> List[Contact]:
        result = await self.db.execute(
            select(Contact)
            .where(Contact.customer_id == customer_id)
            .order_by(Contact.last_interaction_at.desc())
        )
        return result.scalars().all()
