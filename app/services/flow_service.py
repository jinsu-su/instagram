import asyncio
from uuid import UUID
import typing
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.models.flow import Flow
from app.models.instagram_account import InstagramAccount
from app.services.contact_service import ContactService
import json
import google.generativeai as genai
from typing_extensions import TypedDict
from app.config import get_settings
from app.utils.logging import get_logger

class FlowMatch(TypedDict):
    match_index: typing.Optional[int] # int or None (None means no match)

logger = get_logger(__name__)
settings = get_settings()

class FlowService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.contact_service = ContactService(db)

    async def execute_flow(self, flow_id: UUID, instagram_id: str, account: InstagramAccount, access_token: Optional[str] = None, page_id: Optional[str] = None, instagram_user_id: Optional[str] = None, user_message: Optional[str] = None, comment_id: Optional[str] = None, source: Optional[str] = None, mention_id: Optional[str] = None, media_id: Optional[str] = None, username: Optional[str] = None):
        """Executes a sequence of actions defined in a Flow."""
        result = await self.db.execute(select(Flow).where(Flow.id == flow_id))
        flow = result.scalar_one_or_none()
        
        if not flow or not flow.is_active:
            logger.warning(f"Flow {flow_id} not found or inactive")
            return

        # Local copy to avoid scoping issues with async/try blocks
        recipient_id = str(instagram_id)
        
        # Pre-extract attributes to avoid MissingGreenlet after commits in _add_tag
        access_token = access_token or account.access_token
        page_id = page_id or getattr(account, "page_id", None)
        instagram_user_id = instagram_user_id or getattr(account, "instagram_user_id", None)

        actions = flow.actions or []
        logger.info(f"Executing flow '{flow.name}' for user {instagram_id}")

        for action in actions:
            action_type = action.get("type")
            try:
                if action_type == "send_text":
                    await self._send_text(account, instagram_id, action.get("content"), access_token, page_id, instagram_user_id, image_url=action.get("url"), comment_id=comment_id)
                elif action_type == "send_image":
                    await self._send_image(account, instagram_id, action.get("url"), access_token, page_id, instagram_user_id, comment_id=comment_id)
                elif action_type == "send_rich_message":
                    await self._send_rich_message(account, instagram_id, action.get("content"), action.get("buttons"), access_token, page_id, instagram_user_id, image_url=action.get("url"), comment_id=comment_id)
                elif action_type == "send_card":
                    await self._send_card(
                        account, instagram_id, 
                        action.get("title"), action.get("subtitle"), 
                        action.get("url"), action.get("buttons"),
                        access_token, page_id, instagram_user_id,
                        comment_id=comment_id
                    )
                elif action_type == "send_ai_message":
                    # 🛡️ SECURITY: Basic 플랜 사용자는 AI 메시지 전송 불가 (Premium 전용)
                    if await self._is_premium_ai_user(flow.customer_id):
                        await self._send_ai_message(
                            account, instagram_id, flow.customer_id,
                            action.get("prompt"), action.get("reply_type", "dm"),
                            access_token, page_id, instagram_user_id,
                            user_message=user_message, comment_id=comment_id, source=source
                        )
                    else:
                        logger.warning(f"⚠️ [TIER RESTRICTION] AI action skipped for BASIC customer: {flow.customer_id}")
                elif action_type == "add_tag":
                    await self._add_tag(flow.customer_id, instagram_id, action.get("tag"))
                elif action_type == "wait":
                    seconds = action.get("seconds", 1)
                    await asyncio.sleep(seconds)
                elif action_type == "reply_to_comment":
                    if source == "story_mention":
                        # For story mentions, a public reply is impossible, so we fallback to DM
                        await self._send_text(account, recipient_id, action.get("content"), access_token, page_id, instagram_user_id, comment_id=None)
                    else:
                        await self._reply_to_comment(account, comment_id, action.get("content"), access_token)
                # Future: Support for 'condition', 'notify_admin', etc.
            except Exception as e:
                logger.error(f"Error executing action {action_type} in flow {flow.id}: {e}")

    async def _send_text(self, account: InstagramAccount, recipient_id: str, content: str, access_token: str, page_id: str, instagram_user_id: str, image_url: Optional[str] = None, comment_id: Optional[str] = None):
        from app.services.campaign_processor import CampaignProcessor
        processor = CampaignProcessor(self.db)
        await processor.send_dm(
            account, recipient_id, content,
            image_url=image_url,
            comment_id=comment_id,
            access_token=access_token,
            page_id=page_id,
            instagram_user_id=instagram_user_id
        )

    async def _send_rich_message(self, account: InstagramAccount, recipient_id: str, content: str, buttons: List[Dict[str, Any]], access_token: str, page_id: str, instagram_user_id: str, image_url: Optional[str] = None, comment_id: Optional[str] = None):
        from app.services.campaign_processor import CampaignProcessor
        processor = CampaignProcessor(self.db)
        await processor.send_dm_with_buttons(
            account, recipient_id, content, buttons,
            image_url=image_url,
            comment_id=comment_id,
            access_token=access_token,
            page_id=page_id,
            instagram_user_id=instagram_user_id
        )

    async def _send_image(self, account: InstagramAccount, recipient_id: str, url: str, access_token: str, page_id: str, instagram_user_id: str, comment_id: Optional[str] = None):
        from app.services.campaign_processor import CampaignProcessor
        processor = CampaignProcessor(self.db)
        await processor.send_dm(
            account, recipient_id, "", image_url=url,
            comment_id=comment_id,
            access_token=access_token,
            page_id=page_id,
            instagram_user_id=instagram_user_id
        )

    async def _send_card(self, account: InstagramAccount, recipient_id: str, title: str, subtitle: Optional[str], image_url: Optional[str], buttons: List[Dict[str, Any]], access_token: str, page_id: str, instagram_user_id: str, comment_id: Optional[str] = None):
        from app.services.campaign_processor import CampaignProcessor
        processor = CampaignProcessor(self.db)
        await processor.send_generic_card(
            account, recipient_id, title, subtitle, image_url, buttons,
            comment_id=comment_id,
            access_token=access_token,
            page_id=page_id,
            instagram_user_id=instagram_user_id
        )

    async def _reply_to_comment(self, account: InstagramAccount, comment_id: str, content: str, access_token: str):
        if not comment_id or not content: return
        from app.services.campaign_processor import CampaignProcessor
        processor = CampaignProcessor(self.db)
        await processor.reply_to_comment(account, comment_id, content, access_token=access_token)


    async def _add_tag(self, customer_id: UUID, instagram_id: str, tag: str):
        if not tag: return
        contact = await self.contact_service.get_or_create_contact(customer_id, instagram_id)
        current_tags = contact.tags or []
        if tag not in current_tags:
            contact.tags = current_tags + [tag]
            await self.db.commit()
            logger.info(f"Added tag '{tag}' to contact {instagram_id}")

    async def _send_ai_message(
        self, 
        account: InstagramAccount, 
        instagram_id: str, 
        customer_id: UUID,
        user_prompt: Optional[str],
        reply_type: str,
        access_token: str, 
        page_id: str, 
        instagram_user_id: str,
        user_message: Optional[str] = None,
        comment_id: Optional[str] = None,
        source: Optional[str] = None
    ):
        """
        AI가 프롬프트를 기반으로 메시지를 생성하여 DM 또는 댓글로 전송합니다.
        
        Args:
            user_prompt: 사용자가 입력한 프롬프트 (예: "친절하게 가격을 안내해주세요")
            reply_type: "dm" 또는 "comment" (기본값: "dm")
            user_message: 고객의 원본 메시지 (컨텍스트용)
        """
        from app.services.campaign_processor import CampaignProcessor
        from app.models.chat import ChatMessage, ChatSession
        
        if not user_prompt:
            logger.warning("send_ai_message: user_prompt is required")
            return
        
        # 1. Contact 정보 가져오기
        contact = await self.contact_service.get_or_create_contact(customer_id, instagram_id)
        contact_ai_summary = getattr(contact, "ai_summary", None)
        contact_tags = getattr(contact, "tags", []) or []
        
        # 2. 계정별 system_prompt 가져오기
        system_prompt = getattr(account, "system_prompt", None)
        if not system_prompt:
            # Customer 레벨 system_prompt 확인
            from app.models.customer import Customer
            customer_result = await self.db.execute(
                select(Customer).where(Customer.id == customer_id)
            )
            customer = customer_result.scalar_one_or_none()
            if customer:
                system_prompt = getattr(customer, "system_prompt", None)
        
        if not system_prompt:
            system_prompt = "당신은 인스타그램 브랜드 어시스턴트입니다."
        
        # 3. Knowledge Base 정보 가져오기
        kb_url = getattr(account, "ai_knowledge_base_url", None)
        kb_filename = getattr(account, "ai_knowledge_base_filename", None)
        if not kb_url:
            from app.models.customer import Customer
            customer_result = await self.db.execute(
                select(Customer).where(Customer.id == customer_id)
            )
            customer = customer_result.scalar_one_or_none()
            if customer:
                kb_url = getattr(customer, "ai_knowledge_base_url", None)
                kb_filename = getattr(customer, "ai_knowledge_base_filename", None)
        
        # 4. Chat History 가져오기 (최근 10개 메시지)
        # ⚠️ CRITICAL: customer_id와 instagram_account_id로 격리하여 다른 고객의 데이터 접근 방지
        chat_history_str = None
        try:
            # account의 page_id 또는 instagram_user_id를 사용하여 해당 계정의 세션만 조회
            account_identifier = page_id or instagram_user_id
            if account_identifier:
                session_result = await self.db.execute(
                    select(ChatSession).where(
                        ChatSession.customer_id == customer_id,  # 고객별 격리
                        ChatSession.instagram_account_id == account_identifier,  # 계정별 격리
                        ChatSession.participant_id == instagram_id  # 사용자별 격리
                    )
                )
                session = session_result.scalar_one_or_none()
                
                if session:
                    msg_result = await self.db.execute(
                        select(ChatMessage)
                        .where(ChatMessage.session_id == session.id)
                        .order_by(ChatMessage.created_at.desc())
                        .limit(10)
                    )
                    history_msgs = msg_result.scalars().all()
                    
                    chat_history_list = []
                    for hm in reversed(history_msgs):
                        role = "브랜드" if hm.is_from_me else "고객"
                        chat_history_list.append(f"[{role}]: {hm.content}")
                    chat_history_str = "\n".join(chat_history_list) if chat_history_list else None
        except Exception as e:
            logger.warning(f"Failed to fetch chat history for customer {customer_id}: {e}")
        
        # 5. AI 메시지 생성 (플로우 전용 Gemini API 호출)
        # 플로우 생성 시 입력한 프롬프트를 기반으로 메시지 생성
        context_message = user_message or "고객이 메시지를 보냈습니다."
        
        # 플로우 전용 프롬프트 구성
        tags_str = ", ".join(contact_tags) if contact_tags else "정보 없음"
        contact_context = f"고객 요약(페르소나): {contact_ai_summary or '정보 없음'}, 태그: {tags_str}"
        
        history_section = ""
        if chat_history_str:
            history_section = f"\n[최근 대화 내역 (맥락)]:\n{chat_history_str}"
        
        # Knowledge Base 내용 추가
        # ✅ SECURITY: kb_url은 account 또는 customer에서 가져온 것이므로 이미 해당 고객의 것임이 보장됨
        kb_section = ""
        if kb_url:
            try:
                import os
                local_path = kb_url.lstrip("/")
                
                # 파일 존재 및 형식 확인
                if os.path.exists(local_path) and local_path.endswith(".txt"):
                    with open(local_path, "r", encoding="utf-8") as f:
                        kb_content = f.read()
                        kb_section = f"\n[참고 파일 정보]\n{kb_content}"
                else:
                    logger.warning(f"KB file not found or invalid format: {local_path} for customer {customer_id}")
            except Exception as e:
                logger.warning(f"Failed to read KB file for customer {customer_id}: {e}")
        
        # 플로우 전용 프롬프트 (기존 채팅 응답과 다른 구조)
        flow_prompt = f"""[지침]: {system_prompt}
[고객 정밀 정체성]: {contact_context}{history_section}{kb_section}

[플로우 액션 프롬프트]: {user_prompt}
[고객의 원본 메시지]: {context_message}

규칙:
1. 위 [지침]에 정의된 페르소나와 어투를 엄격히 준수하여 답변하세요.
2. [플로우 액션 프롬프트]의 지시사항을 정확히 따르세요.
3. [고객의 원본 메시지]를 참고하여 맥락에 맞는 답변을 생성하세요.
4. 자연스럽고 친절한 태도를 유지하며 적절한 이모지를 사용하세요.
5. 답변은 1~3문장 이내로 간결하게 핵심만 전달하세요.
6. 오직 답변 내용만 텍스트로 출력하세요.
"""
        
        # 플로우 전용 Gemini API 호출
        if not settings.google_api_key:
            logger.error("Google API key not configured")
            return
        
        api_key = settings.google_api_key.get_secret_value()
        genai.configure(api_key=api_key)
        
        # 플로우 전용 모델 선택
        # 플로우 전용 모델 선택
        last_error = None
        for m_name in ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"]:
            try:
                model = genai.GenerativeModel(m_name)
                break
            except Exception:
                continue
        
        if not model:
            logger.error("No valid Gemini model found for flow AI message")
            return
        
        try:
            import asyncio
            from app.services.contact_service import AI_SEMAPHORE
            
            async with AI_SEMAPHORE:
                resp = await asyncio.to_thread(model.generate_content, flow_prompt)
                ai_message = resp.text.strip()
        except Exception as e:
            logger.error(f"Failed to generate flow AI message for {instagram_id}: {e}")
            return
        
        if not ai_message:
            logger.error("Failed to generate AI message")
            return
        
        # 6. DM 또는 댓글로 전송 (또는 둘 다)
        processor = CampaignProcessor(self.db)
        
        if reply_type == "both":
            # DM과 댓글 모두 전송
            if comment_id:
                # 댓글 답장
                await processor.reply_to_comment(
                    account, comment_id, ai_message, access_token=access_token
                )
                logger.info(f"✅ AI-generated comment reply sent: {ai_message[:50]}...")
            # DM 전송
            await processor.send_dm(
                account, instagram_id, ai_message,
                comment_id=comment_id,
                access_token=access_token,
                page_id=page_id,
                instagram_user_id=instagram_user_id
            )
            logger.info(f"✅ AI-generated DM sent: {ai_message[:50]}...")
        elif reply_type == "comment" and comment_id:
            # 댓글 답장만
            await processor.reply_to_comment(
                account, comment_id, ai_message, access_token=access_token
            )
            logger.info(f"✅ AI-generated comment reply sent: {ai_message[:50]}...")
        else:
            # DM 전송만 (기본값)
            await processor.send_dm(
                account, instagram_id, ai_message,
                comment_id=comment_id,
                access_token=access_token,
                page_id=page_id,
                instagram_user_id=instagram_user_id
            )
            logger.info(f"✅ AI-generated DM sent: {ai_message[:50]}...")

    async def find_matching_flow(self, customer_id: UUID, text: str, source: str = "all") -> Optional[Flow]:
        """Finds an active flow that matches the keyword or ai_semantic trigger and source."""

        # For story_mention, try to find an exact-source match (highest priority).
        if source == "story_mention" and not (text or "").strip():
            exact_result = await self.db.execute(
                select(Flow).where(
                    Flow.customer_id == customer_id,
                    Flow.trigger_type == "keyword",
                    Flow.is_active == True,
                    Flow.trigger_source == "story_mention"
                ).order_by(Flow.updated_at.desc())
            )
            exact_flows = exact_result.scalars().all()
            for flow in exact_flows:
                config = flow.trigger_config or {}
                m_sources = config.get("mention_sources", [])
                if not m_sources or "story" in m_sources:
                    logger.info(f"Story mention flow matched (exact): {flow.name}")
                    return flow
            logger.info(f"No dedicated story_mention flow found.")
            return None

        # Broaden source matching for other sources
        source_filter = [Flow.trigger_source == "all", Flow.trigger_source == source]

        result = await self.db.execute(
            select(Flow).where(
                Flow.customer_id == customer_id,
                Flow.trigger_type == "keyword",
                Flow.is_active == True,
                or_(*source_filter)
            ).order_by(Flow.updated_at.desc())
        )
        flows = result.scalars().all()
        
        text_lower = text.lower().strip()
        semantic_candidates = []

        # 1. First Pass: Exact/Contains matching (Fast)
        for flow in flows:
            config = flow.trigger_config or {}
            keyword = config.get("keyword", "").lower().strip()
            match_type = config.get("match_type", "contains") # exact, contains, ai_semantic
            
            # Special ManyChat-style logic: if it's a mention-capable source, check mention_sources
            if source in ["story_mention", "mention", "comment"]:
                config_sources = config.get("mention_sources", [])
                
                # If no specific sources are restricted, and it's a mention-tagged flow, 
                # be inclusive based on the flow's primary source or just allow all mention types
                if not config_sources:
                    # Default behavior: if it's a mention flow, allow all types unless restricted
                    is_sub_match = True
                else:
                    is_sub_match = False
                    if source == "story_mention" and "story" in config_sources:
                        is_sub_match = True
                    elif source in ["mention", "comment"] and ("post" in config_sources or "comment" in config_sources):
                        is_sub_match = True
                
                # If it's a sub-match for mention, and the text includes our handle (official mention),
                # we treat it as a strong match even if 'keyword' is a placeholder like STORY_MENTION_TRIGGER
                if is_sub_match:
                    # If keyword is placeholder or matches text or IS EMPTY, return it
                    if not keyword or keyword == "story_mention_trigger" or keyword in text_lower:
                        logger.info(f"✅ Mention-special flow matched: {flow.name}")
                        return flow

            if not keyword: continue

            
            if match_type == "exact" and text_lower == keyword:
                return flow
            elif match_type == "contains" and keyword in text_lower:
                return flow
            elif match_type == "ai_semantic":
                semantic_candidates.append(flow)
                
        # 2. Second Pass: AI Semantic matching (If needed)
        # 🛡️ SECURITY: AI 매칭 기능은 Premium (ai- 시작 플랜) 사용자 전용입니다.
        if semantic_candidates and settings.google_api_key and await self._is_premium_ai_user(customer_id):
            logger.info(f"Checking {len(semantic_candidates)} flows via AI Semantic matching")
            api_key = settings.google_api_key.get_secret_value()
            genai.configure(api_key=api_key)
            
            # Select model
            model = None
            for m_name in ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-pro"]:
                try:
                    model = genai.GenerativeModel(m_name)
                    break
                except Exception:
                    continue
            
            if not model:
                logger.error("❌ Failed to initialize any Gemini model for Semantic Matching")
                return None

            intent_list = []
            for i, f in enumerate(semantic_candidates):
                intent_list.append({
                    "index": i,
                    "intent_description": f.trigger_config.get("keyword", f.name)
                })

            prompt = f"""고객의 메시지가 아래 목록 중 어떤 '의도'에 가장 잘 부합하는지 분석하세요.
고객 메시지: "{text}"

의도 목록:
{json.dumps(intent_list, ensure_ascii=False, indent=2)}

요구사항:
1. 가장 잘 어울리는 의도의 'index'를 match_index에 반환하세요.
2. 만약 어떠한 의도와도 관련이 없다면 match_index에 null을 반환하세요.
"""
            try:
                generation_config = {
                    "response_mime_type": "application/json",
                    "response_schema": FlowMatch
                }
                resp = model.generate_content(prompt, generation_config=generation_config)
                match_data = json.loads(resp.text.strip())
                match_idx = match_data.get("match_index")
                
                if isinstance(match_idx, int) and 0 <= match_idx < len(semantic_candidates):
                    matched_flow = semantic_candidates[match_idx]
                    logger.info(f"AI Semantic Match Found: Flow '{matched_flow.name}'")
                    return matched_flow
            except Exception as e:
                logger.error(f"AI Semantic matching failed: {e}")

        return None

    async def _is_premium_ai_user(self, customer_id: UUID) -> bool:
        """
        🛡️ 고객의 구독 플랜이 AI 기능을 지원하는지 확인합니다.
        'ai-' 로 시작하는 모든 플랜(ai-starter, ai-pro 등)을 프리미엄으로 간주합니다.
        """
        try:
            from app.models.subscription import Subscription
            result = await self.db.execute(
                select(Subscription).where(Subscription.customer_id == customer_id)
            )
            sub = result.scalar_one_or_none()
            
            # 구독 정보가 없거나 'free', 'basic-' 계열은 AI 기능 차단
            if not sub or not sub.plan_name:
                return False
                
            plan = sub.plan_name.lower()
            # AI 플랜(ai-starter, ai-pro, ai-free 포함)만 허용
            # 단, status가 active여야 함
            return plan.startswith("ai-") and sub.status == "active"
        except Exception as e:
            logger.error(f"Error checking premium status for {customer_id}: {e}")
            return False
