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

    # Redundant method definition removed.

        
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
        # - Fix missing closing braces
        open_braces = cleaned.count("{")
        close_braces = cleaned.count("}")
        if open_braces > close_braces:
            cleaned += "}" * (open_braces - close_braces)
            
        # - Fix unclosed quotes in the last property
        if cleaned.count('"') % 2 != 0:
            last_quote = cleaned.rfind('"')
            if last_quote > 0:
                cleaned = cleaned[:last_quote+1] + '"'
                # Re-check braces after quote fix
                if cleaned.count("{") > cleaned.count("}"):
                    cleaned += "}" * (cleaned.count("{") - cleaned.count("}"))
        
        try:
            return json.loads(cleaned)
        except Exception as e:
            logger.warning(f"Failed to recover malformed JSON: {e}")
            # Final attempt: find the first { and last }
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start >= 0 and end > start:
                try:
                    return json.loads(cleaned[start:end+1])
                except:
                    pass
            return {}

    async def analyze_opportunities(self, conversations: List[Dict[str, Any]], db: Any = None, customer_id: Any = None) -> Dict[str, Any]:
        """
        Gemini AI를 사용하여 대화 로그에서 비즈니스 기회(Opportunities)와 트렌드를 분석합니다.
        Content-Based Hashing을 사용하여 데이터가 변경된 경우에만 API를 호출합니다.
        """
        import hashlib
        from sqlalchemy import select
        from app.models.ai_insight import AiInsight

        if not conversations:
            return {
                "opportunities": [],
                "trends": None,
                "content_ideas": None
            }
        
        # Prepare context
        target_convs = conversations[:20]
        
        hashable_data = []
        for conv in target_convs:
            hashable_conv = {
                "thread_id": conv.get("thread_id"),
                "username": conv.get("username"),
                "messages": [
                    {
                        "text": msg.get("text", ""),
                        "role": msg.get("role", "")
                    }
                    for msg in conv.get("messages", [])
                ]
            }
            hashable_data.append(hashable_conv)
        content_string = json.dumps(hashable_data, sort_keys=True, default=str)
        current_hash = hashlib.sha256(content_string.encode('utf-8')).hexdigest()
        
        if db and customer_id:
            try:
                from datetime import datetime, timedelta, timezone
                cache_ttl = timedelta(minutes=5)
                cache_expiry = datetime.now(timezone.utc) - cache_ttl
                
                stmt = select(AiInsight).where(
                    AiInsight.customer_id == customer_id
                ).order_by(AiInsight.updated_at.desc()).limit(1)
                cached_insight = result.scalars().first() # Robust retrieval
                
                if cached_insight:
                    if cached_insight.data_hash == current_hash:
                        logger.info(f"⚡ Cache Hit: AI insights for customer {customer_id} (Hash match)")
                        return cached_insight.analysis_json
                    
                    if cached_insight.updated_at and cached_insight.updated_at.replace(tzinfo=timezone.utc) > cache_expiry:
                        logger.info(f"⚡ Cache Hit: AI insights for customer {customer_id} (TTL cache)")
                        return cached_insight.analysis_json
            except Exception as e:
                logger.warning(f"Failed to check AI insight cache: {e}")

        full_context_data = ""
        for conv in target_convs:
            username = conv.get('username', 'Unknown')
            msgs = conv.get('messages', [])
            full_context_data += f"[Chat with Customer: {username}]\\n"
            for m in reversed(msgs):
                role = m.get('role', 'CUSTOMER')
                label = "[Customer]" if role == "CUSTOMER" else "[Business/Staff]"
                full_context_data += f"{label}: {m.get('text', '')}\\n"
            full_context_data += "\\n"
            
        prompt = f"""
        당신은 세계적인 세일즈 및 고객 지원 AI 어시스턴트입니다.
        다음 인스타그램 DM 데이터를 분석하여 "비즈니스 기회(Missed Business Opportunities)"를 식별하세요.
        
        대화 데이터:
        {full_context_data}
        
        ---
        
        핵심 지침:
        - 고객의 응답이 필요하거나 스태프의 조치가 필요한 대화를 식별하세요.
        - 이미 해결되었거나 마지막 메시지가 스태프인 경우(고객 문제 해결됨)는 제외하세요.
        - 예외: 스태프가 스토리 언급에 감사하거나 쿠폰/선물을 보낸 경우, 이 고객은 활발히 소통하는 우량 고객이므로 항상 'VIP' 기회로 분류하세요.
        
        작업: 모든 "기회"를 식별하세요 (개수 제한 없음)
        우선순위:
        1. SALES (판매): 가격 문의, 구매 의사 표시.
        2. URGENT (긴급): 불만 사항, 배송 문제, 긴급 질문.
        3. VIP (정기 관리): 고가치 고객, 브랜드 스토리 언급 사용자.
            
            ---
            
            출력 형식 (JSON Only):
            {{
                "opportunities": [
                    {{
                        "type": "SALES",  // "SALES", "URGENT", 또는 "VIP" 중 하나
                        "thread_id": "데이터에서 추출 (없을 경우 사용자 아이디 사용)", 
                        "username": "인스타그램 핸들만 입력 (예: swan.7125111). 상태 텍스트나 영어 설명을 추가하지 마세요.",   
                        "reason": "왜 기회인지에 대한 이유 (반드시 한국어)",
                        "suggestion": "권장 조치 사항 (반드시 한국어)"
                    }}
                ]
            }}
            
            중요:
            - "username": 반드시 인스타그램 핸들(아이디)만 포함해야 합니다.
            - "reason" & "suggestion": 반드시 전문적인 한국어로 작성하세요.
            - JSON 형식을 엄격히 준수하세요.
            - 기회가 없는 경우 빈 리스트([])를 반환하세요.
            - 사용자에게 보여지는 텍스트에 영어를 사용하지 마세요.
        """
        
        try:
            generation_config = {
                "response_mime_type": "application/json",
                "response_schema": OpportunityAnalysis
            }
            response = await self.model.generate_content_async(prompt, generation_config=generation_config)
            
            # Use robust parsing
            result = self._robust_json_loads(response.text)
            
            if not result or "opportunities" not in result:
                result = {"opportunities": []}
            
            # Build a ground-truth set of known usernames from conversation data
            import re as _re
            known_usernames = {conv.get("username", ""): conv.get("thread_id", conv.get("username", "")) 
                               for conv in target_convs if conv.get("username")}
            
            # Sanitize: validate AI-generated usernames against known conversation participants
            cleaned_opps = []
            seen_thread_ids = set()
            for opp in result.get("opportunities", []):
                raw_uname = str(opp.get("username", "") or "")
                
                # Skip duplicates by thread_id
                tid = opp.get("thread_id", "")
                if tid and tid in seen_thread_ids:
                    continue
                if tid:
                    seen_thread_ids.add(tid)
                
                # Priority 1: check if any known username appears in the raw string
                matched_known = None
                for known in known_usernames:
                    if known and known in raw_uname:
                        matched_known = known
                        break
                
                if matched_known:
                    opp["username"] = matched_known
                    if not opp.get("thread_id"):
                        opp["thread_id"] = known_usernames[matched_known]
                    cleaned_opps.append(opp)
                else:
                    # Priority 2: try to extract a clean Instagram handle from the raw string
                    extracted = _re.findall(r'[a-zA-Z0-9][\w.]{0,28}[a-zA-Z0-9_]', raw_uname)
                    valid = [u for u in extracted if len(u) <= 30]
                    if valid:
                        opp["username"] = valid[0]
                        logger.warning(f"Username regex-extracted: '{raw_uname}' -> '{valid[0]}'")
                        cleaned_opps.append(opp)
                    else:
                        # Drop this entry entirely — no reliable username found
                        logger.warning(f"Dropping opportunity with unresolvable username: '{raw_uname}'")
                        
            result["opportunities"] = cleaned_opps
                
            result["trends"] = None
            result["content_ideas"] = None
            
            if db and customer_id:
                try:
                    stmt = select(AiInsight).where(AiInsight.customer_id == customer_id).order_by(AiInsight.updated_at.desc()).limit(1)
                    result_check = await db.execute(stmt)
                    existing_insight = result_check.scalars().first() # Robust retrieval
                    
                    if existing_insight:
                        existing_insight.analysis_json = result
                        existing_insight.data_hash = current_hash
                        await db.commit()
                    else:
                        new_insight = AiInsight(customer_id=customer_id, analysis_json=result, data_hash=current_hash)
                        db.add(new_insight)
                        await db.commit()
                except Exception as e:
                    logger.error(f"Failed to save AI insight to cache: {e}")
                
            return result

        except Exception as e:
            logger.error(f"AI Opportunity Analysis failed: {e}")
            return {"opportunities": [], "trends": None, "content_ideas": None}

    async def analyze_post_performance(self, media_data: List[Dict[str, Any]], account_info: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        인스타그램 게시물 데이터를 분석하여 성과 요약 및 전략적 통찰을 제공합니다.
        
        Args:
            media_data: 최근 게시물 데이터 리스트
            account_info: 계정 정보 (followers_count, username 등)
        """
        if not media_data:
            return {
                "summary": "분석할 데이터가 부족합니다.",
                "analysis": "계정에 게시물을 업로드한 후 다시 시도해 주세요.",
                "best_post": None,
                "strategy": ["지속적으로 게시물을 업로드하여 데이터를 쌓아보세요."]
            }

        # 최근 게시물 데이터 요약 (AI용 컨텍스트) - 최근 5개만 분석
        context = ""
        total_reach = 0
        total_engagement = 0
        post_details = []
        
        for i, m in enumerate(media_data[:5]):
            reach = m.get('reach', 0) or 0
            likes = m.get('like_count', 0) or 0
            comments = m.get('comments_count', 0) or 0
            caption = m.get('caption', '') or ''
            media_type = m.get('media_type', 'UNKNOWN')
            timestamp = m.get('timestamp', '')
            
            total_reach += reach
            total_engagement += (likes + comments)
            
            # 게시물 타입 한글 변환
            type_map = {
                'IMAGE': '사진',
                'VIDEO': '동영상',
                'CAROUSEL_ALBUM': '캐러셀',
                'REELS': '릴스'
            }
            media_type_kr = type_map.get(media_type, media_type)
            
            # 타임스탬프 포맷팅 (YYYY-MM-DD)
            date_str = ''
            if timestamp:
                try:
                    from datetime import datetime
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    date_str = dt.strftime('%Y-%m-%d')
                except:
                    date_str = timestamp[:10] if len(timestamp) >= 10 else timestamp
            
            # 참여율 계산 (조회수 대비 우선, 없으면 도달 수 대비)
            denominator = m.get('impressions', 0) or reach
            engagement_rate = (likes + comments) / denominator * 100 if denominator > 0 else 0
            
            # 캡션 전체 포함 (계정 컨셉 파악을 위해) - 토큰 비용 최적화를 위해 300자로 제한
            # 인스타그램 캡션 최대 2,200자이지만, AI 분석에는 300자면 충분하며 토큰 비용 절감
            full_caption = (caption[:300] if caption else "(캡션 없음)")
            if caption and len(caption) > 300:
                full_caption += "..."
            
            # 캡션이 없을 때 프롬프트 표현 개선
            caption_display = full_caption if caption else f"캡션 없음 (게시물 타입: {media_type_kr})"
            
            post_info = f"""[게시물 {i+1}]
- 타입: {media_type_kr}
- 날짜: {date_str}
- 캡션: {caption_display}
- 도달(Reach): {reach:,}명
- 좋아요: {likes:,}개
- 댓글: {comments:,}개
- 참여율: {engagement_rate:.2f}%
"""
            post_details.append(post_info)
        
        context = "\n".join(post_details)
        
        # ⚡ 1.5 Vision Analysis: Fetch images for top 3 posts to provide REAL visual insights
        image_parts = []
        if self.model: # Only attempt if model initialized
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as client:
                # Analyze top 3 posts visually to save tokens/time while ensuring accuracy
                for i, m in enumerate(media_data[:3]):
                    # For videos/reels, use thumbnail. For images, use media_url.
                    img_url = m.get('thumbnail_url') if m.get('media_type') in ['VIDEO', 'REELS'] else m.get('media_url')
                    
                    if img_url and img_url.startswith('http'):
                        try:
                            img_resp = await client.get(img_url)
                            if img_resp.is_success:
                                # Instagram often serves JPEG/WebP
                                # We'll treat them as image/jpeg for Gemini
                                image_parts.append(f"\n[게시물 {i+1} 이미지 데이터]")
                                image_parts.append({
                                    "mime_type": "image/jpeg",
                                    "data": img_resp.content
                                })
                                logger.info(f"📸 [AI Vision] Successfully fetched image for post {i+1}")
                        except Exception as e:
                            logger.warning(f"⚠️ [AI Vision] Failed to fetch image {i+1}: {e}")
                            # Continue to next image, don't fail the whole request
        else:
            logger.warning("⚠️ Skipping AI Vision as model is not initialized")

        # 계정 정보 추출
        followers_count = account_info.get('followers_count', 0) if account_info else 0
        username = account_info.get('username', '') if account_info else ''
        
        # 통계 계산
        avg_reach = total_reach / len(media_data[:5]) if len(media_data[:5]) > 0 else 0
        avg_engagement = total_engagement / len(media_data[:5]) if len(media_data[:5]) > 0 else 0
        avg_denominator = (total_impressions / len(media_data[:5])) if 'total_impressions' in locals() and len(media_data[:5]) > 0 else avg_reach
        avg_engagement_rate = (avg_engagement / avg_denominator * 100) if avg_denominator > 0 else 0
        
        # 팔로워 대비 도달률 계산
        reach_vs_followers = (avg_reach / followers_count * 100) if followers_count > 0 else 0
        
        # 게시물 간 성과 비교 (최고/최저)
        post_performances = []
        for m in media_data[:5]:
            reach = m.get('reach', 0) or 0
            likes = m.get('like_count', 0) or 0
            comments = m.get('comments_count', 0) or 0
            engagement = likes + comments
            rate = (engagement / reach * 100) if reach > 0 else 0
            post_performances.append({
                'reach': reach,
                'engagement': engagement,
                'rate': rate,
                'caption': (m.get('caption', '') or '')[:50]
            })
        
        best_performance = max(post_performances, key=lambda x: x['engagement']) if post_performances else None
        worst_performance = min(post_performances, key=lambda x: x['engagement']) if post_performances else None
        
        # 트렌드 분석 (최신 게시물 vs 이전 게시물)
        if len(media_data) >= 2:
            latest = media_data[0]
            previous = media_data[1]
            latest_reach = latest.get('reach', 0) or 0
            previous_reach = previous.get('reach', 0) or 0
            latest_eng = (latest.get('like_count', 0) or 0) + (latest.get('comments_count', 0) or 0)
            previous_eng = (previous.get('like_count', 0) or 0) + (previous.get('comments_count', 0) or 0)
            
            reach_trend = ((latest_reach - previous_reach) / previous_reach * 100) if previous_reach > 0 else 0
            engagement_trend = ((latest_eng - previous_eng) / previous_eng * 100) if previous_eng > 0 else 0
        else:
            reach_trend = 0
            engagement_trend = 0

        # 콜드 스타트 (데이터 부족) 여부 확인
        is_cold_start = (total_reach <= 10 and total_engagement <= 5)

        if is_cold_start:
            # ---------------------------------------------------------
            # [시나리오 A] 초기 계정 (Launch Phase) -> "브랜드 런칭 컨설턴트" 모드
            # ---------------------------------------------------------
            system_instruction = """
            당신은 세계적인 '소셜 미디어 브랜드 런칭 컨설턴트'입니다.
            현재 이 계정은 **초기 단계(Cold Start)**입니다.
            **함께 제공된 게시물 이미지들을 정밀하게 분석하여 이 계정의 본질(Concept)을 정확히 파악하는 것이 가장 중요한 임무입니다.**

            [CRITICAL - 시각적 분석 기반 계정 컨셉 파악]
            1. **이미지 분석**: 제공된 이미지들 속에 무엇이 들어있는지(제품, 인물, 풍경 등)와 사진의 분위기(색감, 조도, 구도)를 직접 확인하세요.
            2. **컨셉 파악**: 이미지와 캡션을 결합하여 산업군을 정확히 맞추세요. 
               - 예: "휴지통 하이엔드 브랜드", "업사이클링 가구 전문", "미니멀 가전" 등 아주 구체적으로 파악해야 합니다.
               - 이미지와 전혀 다른 엉뚱한 추측(예: 이미지엔 상품만 있는데 개인 라이프스타일이라고 하는 등)은 절대 금지입니다.

            [분석 지침]
            1. **Analysis**: 
               - 먼저 이미지에서 파악한 계정 컨셉을 명확히 정의하세요 (예: "이 계정은 [분석된 컨셉] 전문 브랜드로, [이미지 특징]을 강조하고 있습니다")
               - 비주얼적인 강점과 현재 초기 노출을 방해하는 캡션/전략적 요소를 실질적으로 진단하세요.
               
            2. **Best Post**: 
               - 수치가 낮더라도, **이미지 퀄리티와 상업적 가치**가 가장 높은 게시물을 선정하세요.
               - 선정 이유에 이미지의 시각적 요소(구도, 색상, 피사체의 매력)를 구체적으로 언급하세요.
               
            3. **Strategy**: 
               - 일반론적 조언 금지. **파악된 특정 제품/브랜드 성격에 특화된** 액션 플랜을 제시하세요.
               - 예: 제품 중심 계정이라면 "제품의 기능성을 강조한 릴스를 제작하세요", B2B 성격이라면 "신뢰감을 주는 전문적인 정보를 담으세요" 등.
            """
        else:
            # ---------------------------------------------------------
            # [시나리오 B] 성장 계정 (Growth Phase) -> "데이터 기반 CMO" 모드
            # ---------------------------------------------------------
            system_instruction = """
            당신은 냉철한 '데이터 기반 마케팅 최고책임자(CMO)'입니다.
            제공된 데이터와 **게시물 이미지**를 정밀 분석하여 성과를 극대화할 전략을 수립하세요.
            
            [CRITICAL - 이미지 기반 본질 파악]
            - **제공된 이미지를 직접 보고** 이 계정이 무엇을 파는(혹은 보여주는) 계정인지 100% 명확하게 파악하세요.
               - 사진에 휴지통이 있다면 휴지통 브랜드로, 옷이 있다면 패션 브랜드로 인식해야 합니다. 
               - 캡션이 없더라도 이미지를 통해 정체성을 찾아내는 것이 당신의 핵심 능력입니다.
            
            [분석 지침]
            1. **Analysis**: 
               - 이미지 기반 계정 컨셉 명시 필수. (예: "이 계정은 [이미지 기반 컨셉] 위주의 비즈니스 계정입니다")
               - 이미지의 비주얼적 일관성과 수치 간의 상관관계를 통찰력 있게 분석하세요.
               
            2. **Best Post**: 
               - 왜 이 게시물의 이미지가 사람들의 반응을 이끌어냈는지 visual psychology 관점에서 분석하세요.
               
            3. **Strategy**:
               - 현재의 시각적 자산을 어떻게 더 활용할지, 산업군에 맞는 구체적 확장 전략을 제안하세요.
            """

        # 계정 컨텍스트 정보 구성
        account_context = ""
        if followers_count > 0:
            account_context += f"\n[계정 정보]\n- 팔로워 수: {followers_count:,}명\n- 평균 도달률 (팔로워 대비): {reach_vs_followers:.1f}%\n"
        
        # 통계 요약 정보
        stats_context = f"""
[전체 통계 요약]
- 분석 게시물 수: {len(media_data[:5])}개
- 평균 도달(Reach): {avg_reach:,.0f}명
- 평균 참여(좋아요+댓글): {avg_engagement:,.0f}개
- 평균 참여율: {avg_engagement_rate:.2f}%
"""
        
        # 트렌드 정보
        trend_context = ""
        if len(media_data) >= 2:
            trend_direction_reach = "증가" if reach_trend > 0 else "감소" if reach_trend < 0 else "유지"
            trend_direction_eng = "증가" if engagement_trend > 0 else "감소" if engagement_trend < 0 else "유지"
            trend_context = f"""
[최근 트렌드]
- 최신 게시물 대비 이전 게시물: 도달 {abs(reach_trend):.1f}% {trend_direction_reach}, 참여 {abs(engagement_trend):.1f}% {trend_direction_eng}
"""
        
        # 성과 비교 정보
        comparison_context = ""
        if best_performance and worst_performance and best_performance != worst_performance:
            comparison_context = f"""
[게시물 간 성과 비교]
- 최고 성과 게시물: 도달 {best_performance['reach']:,}명, 참여 {best_performance['engagement']:,}개, 참여율 {best_performance['rate']:.2f}%
- 최저 성과 게시물: 도달 {worst_performance['reach']:,}명, 참여 {worst_performance['engagement']:,}개, 참여율 {worst_performance['rate']:.2f}%
- 성과 차이: 최고 게시물이 최저 게시물 대비 참여 {(best_performance['engagement'] / worst_performance['engagement'] * 100) if worst_performance['engagement'] > 0 else 0:.1f}% 높음
"""

        prompt = f"""
        {system_instruction}

        [분석 대상 데이터]
        {context}
        {account_context}
        {stats_context}
        {trend_context}
        {comparison_context}

        ---
        
        [분석 요구사항 - 반드시 포함해야 할 내용]
        
        [STEP 1: 계정 컨셉 파악 (필수)]
        - 제공된 모든 게시물의 캡션을 분석하여 이 계정의 정확한 컨셉을 파악하세요
        - 산업/카테고리: 패션, 뷰티, 음식, 여행, 교육, 기술, 건강, 반려동물, 인테리어 등
        - 계정 성격: 브랜드, 인플루언서, 개인, 비즈니스 등
        - 콘텐츠 스타일: 교육적, 엔터테인먼트, 영감, 제품 중심, 스토리텔링 등
        - 이 정보를 Analysis에 반드시 포함하세요
        
        1. **Summary (성과 요약)**: 
           - 계정 컨셉을 간단히 언급하며 핵심 인사이트와 트렌드 방향성 요약
           - 예: "패션 브랜드 계정으로, 최근 게시물들이 상승 추세를 보이며 스타일링 콘텐츠에서 강한 참여를 이끌어내고 있습니다"
           - 수치(X명, Y% 등)는 절대 포함하지 마세요. 수치는 프론트엔드에서 별도로 표시됩니다.
           
        2. **Analysis (전문가 인사이트)**:
           - **반드시 첫 문장에 계정 컨셉을 명시하세요** (예: "이 계정은 뷰티 브랜드로, 제품 리뷰와 메이크업 튜토리얼을 중심으로 합니다")
           - 제공된 수치 데이터를 기반으로 분석하되, 응답 텍스트에는 수치를 직접 언급하지 마세요
           - 트렌드 분석: 최신 게시물이 이전 대비 개선/악화 여부와 원인 분석 (상승/하락 추세만 언급)
           - **실제 게시물의 캡션 내용과 주제를 구체적으로 언급하며 분석하세요**
           - 예: "신제품 출시 소식이 담긴 게시물이 높은 참여를 이끌었으며, 제품 사용법을 보여주는 콘텐츠도 좋은 반응을 보였습니다"
           - 게시물 타입별 성과를 해당 산업/카테고리 관점에서 분석
           - 참여율이 높은/낮은 게시물의 공통점을 실제 캡션 내용 기반으로 분석
           - 일반론적 분석 금지. 반드시 실제 게시물 내용을 기반으로 하세요
           
        3. **Best Post (최고 성과 게시물)**:
           - 반드시 실제 데이터에서 가장 높은 수치를 가진 게시물을 선정하세요
           - **caption 필드**: 해당 게시물의 실제 캡션 내용을 40자 이내로 요약하세요. 캡션이 없으면 "(캡션 없음)"을 그대로 사용하지 말고, 게시물 타입과 내용을 바탕으로 간단히 설명하세요 (예: "사진 게시물", "동영상 콘텐츠", "제품 소개 이미지" 등)
           - **reason 필드**: 선정 이유에는 수치를 포함하지 말고, 성공 요인만 분석하세요
           - **해당 게시물의 캡션 내용을 구체적으로 언급하며 성공 요인을 설명하세요** (캡션이 없으면 시각적 요소나 게시물 타입을 기반으로 분석)
           - 예: "이 게시물은 신제품 출시 소식과 할인 정보를 조합하여 구매 욕구를 자극했으며, 제품의 시각적 매력을 강조한 점이 효과적이었습니다"
           - 성공 요인: 캡션 내용의 특징, 게시물 타입의 효과, 타이밍, 콘텐츠 주제 등
           - 계정 컨셉에 맞는 성공 요인 분석
           
        4. **Strategy (향후 제언 및 전략)**:
           - **계정 컨셉과 산업에 특화된 전략만 제시하세요. 일반론적 조언 절대 금지**
           - 최고 성과 게시물의 성공 요인을 레버리지한 구체적 전략
           - 실제 게시물 내용을 기반으로 한 제안 (예: "신제품 출시 소식 형식의 게시물을 정기적으로 업로드하세요")
           - 트렌드가 하락세라면 개선 방안, 상승세라면 유지/확대 방안
           - 게시물 타입별 최적화 전략 (해당 산업에 맞게)
           - 각 전략은 명확한 행동 지침으로 작성하되, 수치나 퍼센트는 포함하지 마세요
           - 예시:
             * 패션 브랜드: "일상 스타일링 콘텐츠를 주 2회, 제품 소개를 주 1회 업로드하세요"
             * 음식점: "메뉴 제작 과정을 보여주는 릴스를 주 3회 업로드하세요"
             * 뷰티 브랜드: "제품 사용 전후 비교 콘텐츠를 시리즈로 기획하세요"
        
        [가장 중요한 규칙 - 절대 엄수]
        1. 모든 출력 텍스트는 반드시 **완벽한 한국어**로만 작성하세요. 영어를 미량이라도 섞어 쓸 경우 시스템 오류로 간주됩니다.
        2. 분석 대상 데이터나 캡션이 영어더라도, 그 핵심 의미를 파악하여 **자연스러운 한국어 마케팅 분석 톤**으로 번역 및 요약하세요.
        3. 전문 용어조차도 가능한 한국어로 풀어서 설명하거나 범용적인 한국어 마케팅 용어를 사용하세요.
        4. "데이터 부족", "분석 어려움" 같은 핑계 표현 절대 금지.
        5. 마크다운 포맷팅(**볼드** 등) 절대 금지.
        6. 수치(X명, Y%, Z개) 절대 포함 금지. 수치는 프론트엔드에서 표시됩니다.
        7. 실제 게시물 캡션을 분석하여 계정 컨셉 파악 후 맞춤형 전략만 제시.
        8. 영어를 단 한 단어도 사용하지 마세요. (JSON 키 제외)
        
        [출력 양식]
        반드시 지정된 JSON Schema 에 따라 응답하세요.
        """

        try:
            generation_config = {
                "response_mime_type": "application/json",
                "response_schema": PerformanceAnalysis,
                "max_output_tokens": 4096,
                "temperature": 0.0
            }
            # 데이터가 아무리 없어도 LLM을 통해 '정성적 컨설팅' 결과를 생성함 (하드코딩 제거)
            logger.info(f"[AI Strategy] Cold Start: {is_cold_start}, Prompt Length: {len(prompt)}")
            
            # Gemini API 호출 (타임아웃 60초)
            import asyncio
            # Vision 데이터(이미지)가 있으면 프롬프트와 함께 전달
            prompt_content = [prompt]
            if image_parts:
                prompt_content.extend(image_parts)
                logger.info(f"🚀 [AI Vision] Sending prompt with {len(image_parts)//2} images to Gemini")

            if not self.model:
                logger.error("❌ Gemini model is not initialized. Skipping API call.")
                raise Exception("AI 모델이 초기화되지 않았습니다. API 키 설정을 확인해 주세요.")

            try:
                # system_instruction이 적용된 모델을 사용하여 콘텐츠 생성
                response = await asyncio.wait_for(
                    self.model.generate_content_async(
                        prompt_content, 
                        generation_config=generation_config
                    ),
                    timeout=60.0
                )
            except asyncio.TimeoutError:
                logger.error(f"[AI Strategy] Gemini API timeout after 60s")
                raise Exception("Gemini API 호출 시간 초과 (60초). 잠시 후 다시 시도해 주세요.")
            
            # Structured Output에서 완전한 텍스트 추출
            # response_schema를 사용하면 response.text에 JSON이 직접 들어있을 수 있음
            try:
                raw_response = ""
                
                # candidates에서 모든 parts를 합쳐서 전체 응답 가져오기 (잘린 응답 방지)
                if response.candidates and len(response.candidates) > 0:
                    if response.candidates[0].content and response.candidates[0].content.parts:
                        # 모든 parts를 합쳐서 전체 응답 구성
                        all_parts = []
                        for part in response.candidates[0].content.parts:
                            if hasattr(part, 'text') and part.text:
                                all_parts.append(part.text)
                        if all_parts:
                            raw_response = "".join(all_parts).strip()
                            logger.info(f"[AI Strategy] Extracted from {len(all_parts)} parts, total length: {len(raw_response)}")
                
                # parts에서 가져온 것이 없거나 짧으면 response.text 시도
                if not raw_response or len(raw_response) < 50:
                    if hasattr(response, 'text') and response.text:
                        text_response = response.text.strip()
                        # response.text가 더 길면 사용
                        if len(text_response) > len(raw_response):
                            raw_response = text_response
                            logger.info(f"[AI Strategy] Using response.text, length: {len(raw_response)}")
                
                if not raw_response:
                    raise ValueError("No response text found")
                    
            except (AttributeError, IndexError, ValueError) as e:
                logger.warning(f"[AI Strategy] Failed to extract response, trying alternative method: {e}")
                # 최후의 수단: response 객체 전체를 문자열로 변환
                raw_response = str(response).strip()
            
            # 빈 응답 체크
            if not raw_response or len(raw_response.strip()) == 0:
                logger.error(f"[AI Strategy] Empty response from Gemini")
                raise Exception("Gemini API가 빈 응답을 반환했습니다.")
            
            logger.info(f"[AI Strategy] Raw Response Length: {len(raw_response)}")
            logger.info(f"[AI Strategy] Raw Response (first 1000 chars): {raw_response[:1000]}")
            # 전체 응답도 로깅 (디버깅용, 너무 길면 잘림)
            if len(raw_response) <= 2000:
                logger.info(f"[AI Strategy] Full Raw Response: {raw_response}")
            else:
                logger.info(f"[AI Strategy] Full Raw Response (last 1000 chars): ...{raw_response[-1000:]}")
            
            # JSON 파싱 (재시도 로직 포함)
            result = None
            max_retries = 3
            
            for attempt in range(max_retries):
                try:
                    # JSON 추출 시도 (마크다운 코드 블록 제거)
                    cleaned_response = raw_response
                    
                    # 마크다운 코드 블록 제거
                    if "```json" in cleaned_response:
                        cleaned_response = cleaned_response.split("```json")[1].split("```")[0].strip()
                    elif "```" in cleaned_response:
                        cleaned_response = cleaned_response.split("```")[1].split("```")[0].strip()
                    
                    # 앞뒤 공백 제거
                    cleaned_response = cleaned_response.strip()
                    
                    # JSON이 잘린 경우 마지막 부분 복구 시도
                    if not cleaned_response.endswith("}"):
                        # 마지막 닫는 중괄호가 없으면 추가
                        if cleaned_response.count("{") > cleaned_response.count("}"):
                            cleaned_response += "}" * (cleaned_response.count("{") - cleaned_response.count("}"))
                    
                    # 불완전한 문자열 처리 (따옴표가 닫히지 않은 경우)
                    if cleaned_response.count('"') % 2 != 0:
                        # 마지막 따옴표 찾기
                        last_quote_idx = cleaned_response.rfind('"')
                        if last_quote_idx > 0:
                            # 마지막 따옴표 이후를 제거하고 닫는 따옴표 추가
                            cleaned_response = cleaned_response[:last_quote_idx+1] + '"'
                    
                    # JSON 유효성 사전 검증 (기본 구조 확인)
                    if not cleaned_response.strip().startswith("{"):
                        raise ValueError("JSON이 '{'로 시작하지 않습니다")
                    if cleaned_response.count("{") != cleaned_response.count("}"):
                        # 중괄호 불일치 - 복구 시도
                        diff = cleaned_response.count("{") - cleaned_response.count("}")
                        if diff > 0:
                            cleaned_response += "}" * diff
                        else:
                            # 닫는 중괄호가 더 많으면 마지막부터 제거
                            for _ in range(-diff):
                                last_brace = cleaned_response.rfind("}")
                                if last_brace > 0:
                                    cleaned_response = cleaned_response[:last_brace] + cleaned_response[last_brace+1:]
                    
                    # JSON 파싱 시도
                    result = json.loads(cleaned_response)
                    
                    # 응답 품질 검증 (필수 필드 확인)
                    if not result.get("summary") or not isinstance(result.get("summary"), str) or len(result.get("summary", "").strip()) == 0:
                        raise ValueError("summary 필드가 없거나 비어있습니다")
                    if not result.get("analysis") or not isinstance(result.get("analysis"), str) or len(result.get("analysis", "").strip()) == 0:
                        raise ValueError("analysis 필드가 없거나 비어있습니다")
                    
                    # best_post 검증
                    if result.get("best_post"):
                        if not isinstance(result.get("best_post"), dict):
                            result["best_post"] = None
                        elif not result["best_post"].get("caption") or not result["best_post"].get("reason"):
                            logger.warning(f"best_post 필드가 불완전함, None으로 설정")
                            result["best_post"] = None
                    
                    # strategy 배열 검증 및 수정
                    if not isinstance(result.get("strategy"), list):
                        logger.warning(f"Strategy is not a list, converting...")
                        strategy_value = result.get("strategy")
                        if isinstance(strategy_value, str):
                            result["strategy"] = [strategy_value]
                        else:
                            result["strategy"] = []
                    
                    # strategy 최소 개수 확인 (3개 미만이면 fallback 전략 추가)
                    if len(result.get("strategy", [])) < 3:
                        logger.warning(f"Strategy list has only {len(result.get('strategy', []))} items, adding fallback strategies")
                        fallback_strategies = [
                            "게시물을 꾸준히 업로드하여 데이터를 쌓아보세요.",
                            "다양한 콘텐츠 타입(사진, 동영상, 릴스)을 시도해보세요.",
                            "팔로워와의 소통을 늘려보세요."
                        ]
                        # 기존 전략과 중복되지 않는 것만 추가
                        existing = set(result.get("strategy", []))
                        for fallback in fallback_strategies:
                            if fallback not in existing and len(result.get("strategy", [])) < 4:
                                result["strategy"].append(fallback)
                    
                    # 최종 검증: 모든 필수 필드가 올바른 타입인지 확인
                    if not isinstance(result, dict):
                        raise ValueError("Parsed result is not a dictionary")
                    
                    # 필수 필드 재검증 (안전장치)
                    if "summary" not in result or not isinstance(result["summary"], str):
                        raise ValueError("summary 필드가 없거나 문자열이 아닙니다")
                    if "analysis" not in result or not isinstance(result["analysis"], str):
                        raise ValueError("analysis 필드가 없거나 문자열이 아닙니다")
                    if "strategy" not in result or not isinstance(result["strategy"], list):
                        raise ValueError("strategy 필드가 없거나 리스트가 아닙니다")
                    
                    logger.info(f"[AI Strategy] Successfully parsed JSON on attempt {attempt + 1}")
                    logger.info(f"[AI Strategy] Validated fields: summary={len(result.get('summary', ''))} chars, analysis={len(result.get('analysis', ''))} chars, strategy={len(result.get('strategy', []))} items")
                    return result
                    
                except (json.JSONDecodeError, ValueError) as json_err:
                    if attempt < max_retries - 1:
                        logger.warning(f"JSON parsing failed on attempt {attempt + 1}, retrying...")
                        # 재시도 전에 간단한 수정 시도
                        if "```" in raw_response:
                            raw_response = raw_response.replace("```json", "").replace("```", "").strip()
                        continue
                    else:
                        logger.error(f"JSON Decode Error after {max_retries} attempts: {json_err}")
                        logger.error(f"Problematic JSON: {raw_response[:500]}")
                        raise Exception(f"Invalid JSON from Gemini after {max_retries} attempts: {json_err}")

        except Exception as e:
            import traceback
            logger.error(f"AI Performance Analysis failed: {e}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            
            # 에러 타입에 따른 구분된 fallback 응답
            if "JSON" in str(e) or "Invalid" in str(e):
                # JSON 파싱 실패 - 데이터는 있지만 분석 실패
                return {
                    "summary": "AI 분석 중 기술적 오류가 발생했습니다.",
                    "analysis": "게시물 데이터는 확인되었으나 분석 결과를 생성하는 과정에서 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
                    "best_post": None,
                    "strategy": [
                        "게시물을 꾸준히 업로드하여 데이터를 쌓아보세요.",
                        "다양한 콘텐츠 타입(사진, 동영상, 릴스)을 시도해보세요.",
                        "팔로워와의 소통을 늘려보세요."
                    ]
                }
            else:
                # 기타 에러 (API 호출 실패 등)
                return {
                    "summary": "AI 분석 서비스를 일시적으로 사용할 수 없습니다.",
                    "analysis": "시스템 점검 중입니다. 잠시 후 다시 시도해 주시거나, 계정 관리자에게 문의해 주세요.",
                    "best_post": None,
                    "strategy": [
                        "게시물을 꾸준히 업로드하여 데이터를 쌓아보세요.",
                        "다양한 콘텐츠 타입(사진, 동영상, 릴스)을 시도해보세요.",
                        "팔로워와의 소통을 늘려보세요."
                    ]
                }
