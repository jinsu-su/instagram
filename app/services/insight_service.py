import json
import google.generativeai as genai
from typing_extensions import TypedDict
from typing import List, Dict, Any
import typing
from app.config import get_settings
from app.utils.logging import get_logger

class OpportunityItem(TypedDict):
    type: str # Must be "SALES", "URGENT", or "VIP"
    thread_id: str
    username: str
    reason: str
    suggestion: str

class OpportunityAnalysis(TypedDict):
    opportunities: typing.List[OpportunityItem]

class BestPost(TypedDict, total=False):
    caption: str
    reason: str

class PerformanceAnalysis(TypedDict):
    summary: str
    analysis: str
    best_post: typing.Optional[BestPost]
    strategy: typing.List[str]

logger = get_logger(__name__)
settings = get_settings()

class InsightService:
    def __init__(self):
        if settings.google_api_key:
             genai.configure(api_key=settings.google_api_key.get_secret_value())
        # Unified model selection
        self.model = None
        self.system_instruction = "당신은 세계적인 Instagram 마케팅 전문가이자 브랜드 전략가입니다. 모든 응답(요약, 분석, 제언 등)은 반드시 전문적이고 정중한 **한국어**로만 작성해야 합니다. 영어를 단 한 단어라도 섞어 쓰지 마세요. 분석 대상 데이터에 영어가 포함되어 있더라도 반드시 한국어로 번역/의역하여 설명하세요."
        for m_name in ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"]:
            try:
                self.model = genai.GenerativeModel(m_name, system_instruction=self.system_instruction)
                break
            except Exception:
                continue
        
        if not self.model:
            logger.error("❌ Failed to initialize any Gemini model for Insights")

    def _robust_json_loads(self, raw_text: str) -> Dict[str, Any]:
        """Attempts to parse JSON from AI response with several recovery strategies."""
        if not raw_text:
            return {}
            
        cleaned = raw_text.strip()
        
        # 1. Handle Markdown blocks
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()
            
        # 2. Basic cleanup
        cleaned = cleaned.strip()
        
        # 3. Try direct load
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass
            
        # 4. Recovery: Fix common truncation/formatting issues
        if not cleaned.endswith("}"):
            last_comma = cleaned.rfind(",")
            if last_comma > 0:
                cleaned = cleaned[:last_comma] + "}"
            else:
                cleaned += "}"

        # Fix missing closing braces
        open_braces = cleaned.count("{")
        close_braces = cleaned.count("}")
        if open_braces > close_braces:
            cleaned += "}" * (open_braces - close_braces)
            
        # Fix unclosed quotes in the last property
        if cleaned.count('"') % 2 != 0:
            last_quote = cleaned.rfind('"')
            if last_quote > 0:
                cleaned = cleaned[:last_quote+1] + '"'
                if cleaned.count("{") > cleaned.count("}"):
                    cleaned += "}" * (cleaned.count("{") - cleaned.count("}"))
        
        try:
            return json.loads(cleaned)
        except Exception as e:
            logger.warning(f"Failed to recover malformed JSON: {e}")
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start >= 0 and end > start:
                try:
                    return json.loads(cleaned[start:end+1])
                except:
                    pass
            return {}

    def _generate_statistical_fallback(self, media_data: List[Dict[str, Any]], account_info: Dict[str, Any] = None) -> Dict[str, Any]:
        """AI 실패 시 데이터 기반의 통찰력을 수치형으로 생성하여 사용자에게 오류 대신 제공합니다."""
        logger.info("📊 Generating statistical fallback insight report...")
        
        if not media_data:
            return {
                "summary": "분석할 데이터가 충분하지 않습니다.",
                "analysis": "게시물 데이터가 확인되지 않아 분석이 어렵습니다. 콘텐츠를 업로드한 후 다시 시도해 주세요.",
                "best_post": None,
                "strategy": ["인스타그램에 첫 게시물을 업로드해 보세요.", "꾸준한 포스팅은 계정 성장의 첫걸음입니다."]
            }
        
        # 기본 통계 계산
        target_media = media_data[:5]
        best_item = max(target_media, key=lambda x: (x.get('like_count', 0) or 0) + (x.get('comments_count', 0) or 0))
        
        likes_count = best_item.get('like_count', 0) or 0
        comments_count = best_item.get('comments_count', 0) or 0
        caption = (best_item.get('caption', '') or '')[:30]
        if caption: caption += "..."
        
        best_post_info = {
            "caption": caption or "콘텐츠 분석 완료",
            "reason": f"좋아요 {likes_count}개와 댓글 {comments_count}개로 가장 높은 반응을 얻었습니다."
        }
        
        media_count = len(target_media)
        avg_engagement = sum((m.get('like_count', 0) or 0) + (m.get('comments_count', 0) or 0) for m in target_media) / media_count
        
        summary = f"최근 {media_count}개의 게시물을 분석한 결과, 평균 {avg_engagement:.1f}개의 반응이 집계되었습니다."
        analysis = f"가장 성과가 좋았던 게시물은 '{best_post_info['caption']}'이며, 전반적으로 팔로워들의 활발한 소통이 확인됩니다. 데이터 기반 분석 결과는 성장에 큰 도움이 됩니다."
        
        return {
            "summary": summary,
            "analysis": analysis,
            "best_post": best_post_info,
            "strategy": [
                "반응이 좋았던 게시물의 스타일을 참고하여 다음 콘텐츠를 기획해 보세요.",
                "사용자들이 많이 언급하는 키워드를 캡션에 활용해 보세요.",
                "정기적인 업로드 주기를 유지하여 팔로워와의 신뢰를 쌓으세요."
            ]
        }

    async def analyze_opportunities(self, conversations: List[Dict[str, Any]], db: Any = None, customer_id: Any = None) -> Dict[str, Any]:
        """Gemini AI를 사용하여 대화 로그에서 비즈니스 기회(Opportunities)를 식별합니다."""
        import hashlib
        from sqlalchemy import select
        from app.models.ai_insight import AiInsight

        if not conversations:
            return {"opportunities": [], "trends": None, "content_ideas": None}
        
        target_convs = conversations[:20]
        hashable_data = [{"thread_id": c.get("thread_id"), "username": c.get("username"), "messages": [{"text": m.get("text", ""), "role": m.get("role", "")} for m in c.get("messages", [])]} for c in target_convs]
        content_string = json.dumps(hashable_data, sort_keys=True, default=str)
        current_hash = hashlib.sha256(content_string.encode('utf-8')).hexdigest()
        
        if db and customer_id:
            try:
                from datetime import datetime, timedelta, timezone
                stmt = select(AiInsight).where(AiInsight.customer_id == customer_id).order_by(AiInsight.updated_at.desc()).limit(1)
                result_exec = await db.execute(stmt)
                cached_insight = result_exec.scalars().first()
                if cached_insight and cached_insight.data_hash == current_hash:
                    return cached_insight.analysis_json
            except Exception as e:
                logger.warning(f"Cache check failed: {e}")

        full_context_data = ""
        for conv in target_convs:
            username = conv.get('username', 'Unknown')
            msgs = conv.get('messages', [])
            full_context_data += f"[Chat: {username}]\n"
            for m in reversed(msgs):
                label = "[Customer]" if m.get('role', 'CUSTOMER') == "CUSTOMER" else "[Staff]"
                full_context_data += f"{label}: {m.get('text', '')}\n"
            full_context_data += "\n"
            
        prompt = f"""인스타그램 DM 분석: {full_context_data}
        기회 식별(SALES, URGENT, VIP)하여 JSON으로만 응답하세요.
        - username은 반드시 아이디만 입력. 모든 텍스트는 한국어만 사용."""
        
        try:
            generation_config = {"response_mime_type": "application/json", "response_schema": OpportunityAnalysis}
            response = await self.model.generate_content_async(prompt, generation_config=generation_config)
            result = self._robust_json_loads(response.text)
            if not result or "opportunities" not in result: result = {"opportunities": []}
            
            if db and customer_id:
                try:
                    stmt = select(AiInsight).where(AiInsight.customer_id == customer_id).order_by(AiInsight.updated_at.desc()).limit(1)
                    res = await db.execute(stmt)
                    existing = res.scalars().first()
                    if existing:
                        existing.analysis_json, existing.data_hash = result, current_hash
                    else:
                        db.add(AiInsight(customer_id=customer_id, analysis_json=result, data_hash=current_hash))
                    await db.commit()
                except: pass
            return result
        except Exception as e:
            logger.error(f"Opportunity Analysis failed: {e}")
            return {"opportunities": [], "trends": None, "content_ideas": None}

    async def analyze_post_performance(self, media_data: List[Dict[str, Any]], account_info: Dict[str, Any] = None) -> Dict[str, Any]:
        """인스타그램 게시물 데이터를 분석하여 성과 요약 및 전략적 통찰을 제공합니다."""
        if not media_data:
            return self._generate_statistical_fallback(media_data, account_info)

        try:
            post_details = []
            for i, m in enumerate(media_data[:5]):
                caption = str(m.get('caption', ''))[:50]
                reach = m.get('reach', 0) or 0
                likes = m.get('like_count', 0) or 0
                comments = m.get('comments_count', 0) or 0
                post_details.append(f"[{i+1}] 캡션:{caption}, 도달:{reach}, 좋아요:{likes}, 댓글:{comments}")
            
            context = "\n".join(post_details)
            prompt = f"인스타그램 마케팅 분석 (한국어로만, JSON 응답):\n{context}\n\n[제약] summary(100자), analysis(200자), strategy(3개), best_post 필수. 영어를 단 한 단어도 사용하지 마세오."
            
            generation_config = {"response_mime_type": "application/json", "response_schema": PerformanceAnalysis, "max_output_tokens": 1024, "temperature": 0.1}
            
            if not self.model: raise Exception("Model missing")
            response = await self.model.generate_content_async([prompt], generation_config=generation_config)
            result = self._robust_json_loads(response.text)
            
            if not result.get("summary") or not result.get("analysis"): raise ValueError("AI Error")
            return result
        except Exception as e:
            logger.error(f"❌ AI Analysis failed: {e}. Falling back to statistics.")
            return self._generate_statistical_fallback(media_data, account_info)
