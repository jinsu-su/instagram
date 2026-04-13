from typing import List, Optional, Any, Dict
from uuid import UUID
import json
import httpx
import base64
import os
import tempfile
import time
import asyncio

from fastapi import APIRouter, HTTPException, Depends, status, Path
from pydantic import BaseModel, HttpUrl
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.utils.logging import get_logger
from app.database import get_db_session
from app.services.customer_service import CustomerService
from app.routers.admin_auth import get_current_user
from app.services.subscription_service import SubscriptionService
from app.models.customer import Customer

logger = get_logger(__name__)
router = APIRouter()

# --- AI Viral Post Maker Models ---

class ViralPostRequest(BaseModel):
    images: Optional[List[str]] = []  # Base64 encoded strings
    videos: Optional[List[str]] = []  # Base64 encoded strings (temporary for small videos) or URLs
    user_intent: Optional[str] = None
    model: Optional[str] = None
    customer_id: Optional[UUID] = None

def _get_viral_post_schema() -> dict:
    return {
        "type": "object",
        "properties": {
            "recommended_sequence": {
                "type": "array",
                "items": {"type": "integer"},
                "description": "추천 이미지 순서 (0-based index)"
            },
            "captions": {
                "type": "object",
                "properties": {
                    "engagement": {"type": "string", "description": "브랜드의 아이덴티티를 보여주는 가장 깔끔한 사진 1장 중심의 [기본 포스팅] 캡션 (NO EMOJI)"},
                    "informative": {"type": "string", "description": "여러 장의 사진을 통해 유용한 정보나 꿀팁을 전달하는 카드뉴스형 [정보성 슬라이드] 캡션 (NO EMOJI)"},
                    "emotional": {"type": "string", "description": "댓글 참여를 유도하여 실제 구매나 이벤트 참여로 연결하는 성과 중심의 [참여/홍보] 캡션 (NO EMOJI)"}
                },
                "required": ["engagement", "informative", "emotional"]
            },
            "automation_strategy": {
                "type": "object",
                "properties": {
                    "keyword": {"type": "string", "description": "댓글로 유도할 핵심 키워드 (예: '비법', '정보')"},
                    "phrase": {"type": "string", "description": "댓글 유도 문구 (예: '댓글로 [비법]이라고 남겨주시면...')"}
                },
                "required": ["keyword", "phrase"]
            },
            "seo_optimization": {
                "type": "object",
                "properties": {
                    "alt_text": {"type": "string", "description": "이미지별/전체 대체 텍스트(Alt Text)"},
                    "keywords": {"type": "array", "items": {"type": "string"}, "description": "본문에 자연스럽게 녹일 SEO 키워드"}
                },
                "required": ["alt_text", "keywords"]
            },
            "story_teasers": {
                "type": "array",
                "items": {"type": "string"},
                "description": "스토리 공유 시 클릭을 유도할 후킹 문구 (2~3개)"
            },
            "reasoning": {"type": "string", "description": "순서 배치 및 썸네일/후킹 선정의 전략적 사유"},
            "viral_score": {
                "type": "object",
                "properties": {
                    "total": {"type": "integer"},
                    "hook_power": {"type": "integer", "description": "초반 3초의 강렬함 (0-100)"},
                    "visual_aesthetic": {"type": "integer", "description": "시각적 미감 및 트렌디함 (0-100)"},
                    "strategic_intent": {"type": "integer", "description": "브랜드 메시지 전달력 (0-100)"}
                },
                "required": ["total", "hook_power", "visual_aesthetic", "strategic_intent"]
            },
            "video_critique": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "timestamp": {"type": "string", "description": "구간 (예: 00:00 - 00:03)"},
                        "critique": {"type": "string", "description": "해당 구간의 장점 및 개선점"},
                        "action": {"type": "string", "description": "즉각적인 수정 액션 가이드"}
                    }
                },
                "description": "영상의 경우 초 단위 정밀 분석 (이미지일 경우 빈 배열)"
            },
            "predicted_performance": {"type": "string", "description": "예상되는 오디언스 반응 및 알고리즘 타겟팅 예측"},
            "improvement_tips": {
                "type": "array",
                "items": {"type": "string"},
                "description": "성과를 즉시 극대화하기 위한 전문가용 수정 제안"
            },
            "benchmark_analysis": {"type": "string", "description": "과거 데이터 및 현재 트렌드와의 정밀 비교 분석"}
        },
        "required": ["recommended_sequence", "captions", "automation_strategy", "seo_optimization", "story_teasers", "reasoning", "viral_score", "video_critique", "predicted_performance", "improvement_tips", "benchmark_analysis"]
    }

@router.post("/generate-viral-post")
async def generate_viral_post(
    payload: ViralPostRequest,
    current_user: Customer = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
    subscription_service: SubscriptionService = Depends(SubscriptionService),
):
    """
    고객의 상품 이미지와 컨셉(user_intent)을 바탕으로 AI가 최적의 인스타그램 숏폼/게시물 본문과 전략을 생성합니다.
    """
    customer_id = current_user.id
    if not payload.images and not payload.videos:
        raise HTTPException(status_code=400, detail="최소 1개 이상의 이미지 또는 영상이 필요합니다.")

    # 0. Check AI Access & Usage Limit
    access = await subscription_service.check_ai_insight_access(customer_id, "performance_report")
    if not access["allowed"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=access["reason"]
        )

    # 0. Fetch Benchmark Data
    past_performance_context = ""
    if customer_id:
        try:
            instagram_account = await customer_service.get_instagram_account(db, customer_id)
            if instagram_account and instagram_account.cached_media_data:
                # Use top 5 performing posts as benchmark
                sorted_media = sorted(
                    instagram_account.cached_media_data, 
                    key=lambda x: (x.get('reach', 0) + x.get('like_count', 0) + x.get('comments_count', 0)), 
                    reverse=True
                )[:5]
                
                past_performance_context = "\n[Past Success Benchmarks]:\n"
                for m in sorted_media:
                    past_performance_context += f"- Caption: {m.get('caption', '')[:50]}... | Reach: {m.get('reach', 0)} | Likes: {m.get('like_count', 0)} | Comments: {m.get('comments_count', 0)}\n"
        except Exception as e:
            logger.warning(f"Failed to fetch benchmarks for AI: {e}")
            # Continue without benchmarks if fetch fails

    # 1. Base64 to Image Parts
    image_parts = []
    for base64_str in payload.images[:10]:
        try:
            # Handle data:image/jpeg;base64, prefix if present
            if "," in base64_str:
                header, base64_str = base64_str.split(",", 1)
                mime_type = header.split(";")[0].split(":")[1]
            else:
                mime_type = "image/jpeg" # Default

            img_bytes = base64.b64decode(base64_str)
            image_parts.append({"mime_type": mime_type, "data": img_bytes})
        except Exception as e:
            logger.warning(f"Image processing failed: {e}")
            continue

    if payload.images and not image_parts:
        raise HTTPException(status_code=400, detail="제공된 이미지를 처리할 수 없습니다.")

    # 2. Prompt
    prompt = """
    당신은 대한민국 상위 1% 인스타그램 성장을 담당하는 '바이럴 마케팅 디렉터'입니다.
    제공된 이미지들을 분석하여 팔로워 수와 상관없이 '탐색탭'을 점령하고 실질적인 전환(저장, 공유, 댓글)을 일으킬 수 있는 초고효율 게시물을 기획하세요.

    [핵심 지침 (Critical Rules)]
    1. AI 말투 금지: "안녕하세요", "추천드려요" 같은 뻔한 AI 말투는 절대 사용하지 마세요. 대신 요즘 트렌디한 인플루언서나 브랜드 공식 계정처럼 세련되고 전문적인 어조를 사용하세요.
    2. 후킹 전략: 모든 캡션의 '첫 줄'은 무조건 넘기려던 손가락을 멈추게 하는 강력한 후킹(Hook)으로 시작하세요.
    3. 가독성: 적절한 줄바꿈을 사용하여 모바일에서 읽기 편하게 만드세요.
    4. 이모지 금지: 모든 형태의 이모지(Emoticon)를 절대 사용하지 마세요. 오직 깔끔한 텍스트와 팩트 중심으로 신뢰감을 전달하세요.
    5. 심리적 트리거: '손실 회피', '희소성' 등을 녹여내되, 과장 없이 담백한 톤을 유지하세요.

    [Task 1: Smart Sequencing & Reasoning]
    - 0번 인덱스(대표 사진)는 가장 시각적으로 자극적이거나 궁금증을 유발하는 사진이어야 합니다.
    - `reasoning`에는 단순히 "좋아서"가 아니라, 시선의 흐름과 스토리텔링을 고려한 마케팅적 근거를 설명하세요.

    [Task 2: Channel Strategies (Korean - Universal Style)]
    - 기본 포스팅 (Standard Posting): 가장 대중적이고 깔끔한 1장/정석형 게시물. 브랜드 신뢰 구축 목적.
    - 정보성 슬라이드 (Informative Slide): 유용한 팁을 전달하여 고객이 끝까지 넘겨보게 만드는 카드뉴스형 게시물.
    - 참여/홍보 (Engagement/Promo): 댓글 참여를 유도하거나 제품/이벤트를 홍보하여 매출로 연결하는 성과형 게시물.

    [각 전략별 정형화된 포맷]:
    - 기본 포스팅: [헤드라인] -> [본문] -> [유익함] -> [행동유도] -> [SEO 해시태그]
    - 정보성 슬라이드: [내러티브 훅] -> [슬라이드 흐름] -> [인사이트] -> [핵심요약] -> [참여유도]
    - 참여/홍보: [욕구 자극] -> [가치 티징] -> [실행 트리거] -> [희소성 강조] -> [가이드]

    [Task 3: Viral Boost Package]
    1. Automation Trigger: 댓글 자동화 솔루션용 전략. 팔로워가 가장 갖고 싶어 할 만한 미끼(리드 마그넷)와 함께 남길 "핵심 키워드"를 정하세요. (예: "댓글로 [선물]이라고 남겨주시면 가이드북을 보내드려요!")
    2. SEO Optimization: 알고리즘이 게시물의 성격을 명확히 이해하도록 Alt Text와 본문에 숨길 핵심 키워드를 선별하세요.
    3. Story Teasers: 스토리에 공유될 때 클릭율을 500% 높일 수 있는 강력한 후킹 복선 문구 3가지를 작성하세요.

    [Task 4: High-Precision Scoring & Deep Critique]
    - viral_score: 단순한 점수가 아닌 다차원 평가를 수행하세요.
        * total: 전체적인 성공 가능성.
        * hook_power: 첫 인상의 강렬함.
        * visual_aesthetic: 이미지/영상의 퀄리티와 톤앤매너.
        * strategic_intent: 설정한 의도가 얼마나 잘 녹아있는가.
    - video_critique: **영상이 제공된 경우 반드시 작성하세요.** 
        * 초 단위로 영상을 쪼개어 분석하세요. (예: "0초~3초: 자막이 너무 작아 후킹이 약함 -> 텍스트 크기를 2배로 키우고 중앙 배치 권장")
        * 시각적 요소뿐만 아니라 음성/음악의 활용도에 대해서도 비평하세요.
    - predicted_performance: "좋을 것이다"가 아니라 데이터 기반으로 예측하세요. "이 정도 후킹이면 탐색탭 노출 시 클릭률(CTR) 8% 이상을 기대할 수 있음" 등 전문가스러운 식견을 담으세요.
    - improvement_tips: 즉시 실행 가능한 'Action Item'을 3~5개 제안하세요. (예: "썸네일에 빨간색 보더를 두르세요", "배경음악을 Trending 리스트의 00곡으로 바꾸세요")

    [Elite Content Framework]
    1. 후킹(Hook): "아는 사람만 아는...", "남들 다 하는데 나만 모르는..." 식의 심리적 결핍 트리거를 적극 활용하세요.
    2. 가치 제공(Value): 게시물을 본 사용자가 "이건 저장해야 돼"라고 느낄 만큼 압축된 정보를 제공하세요.
    3. 명확한 CTA: "나만 알고 싶어서 숨겨둔 비법, 댓글로 [공개] 남기면 바로 쏴드림" 식의 강력한 참여 유도를 설계하세요.

    [Native Video Understanding Rules]
    - 영상의 실제 흐름을 파악하여, 자막이 나오는 시점과 음악의 박자가 맞는지, 영상의 채도가 너무 낮아 어둡게 보이는지 등 '기술적 완성도'까지 평가에 반영하세요.
    - 만약 이미지라면 video_critique는 빈 배열([])로 반환하세요.
    """
    if past_performance_context:
        prompt += past_performance_context

    if payload.user_intent:
        prompt += f"\n[User Intent]: {payload.user_intent}"

    # 3. Call Gemini
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.google_api_key.get_secret_value())
        
        # Try models in order of price (Ascending: 1.5 Flash -> 2.5 Flash-Lite -> 2.5 Flash -> 3.1 Flash -> 1.5 Pro)
        available_models = ["gemini-1.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-3.1-flash", "gemini-1.5-pro"]
        model_id = payload.model or available_models[0]
        
        # Ensure models/ prefix is handled properly by the library
        # Actually, the library usually handles just the name, but our env seems to like prefix or standard names
        
        model = None
        last_error = None
        
        for m_name in available_models:
            if payload.model and m_name != payload.model:
                continue # If user specified a model, only try that one first
            
            try:
                # Try with name directly first
                model = genai.GenerativeModel(m_name)
                
                generation_config = genai.GenerationConfig(
                    temperature=0.0, # 결정론적인 한국어 출력을 위해 0.0으로 고정
                    response_mime_type="application/json",
                    response_schema=_get_viral_post_schema()
                )
                
                # 1.5 Handle Videos (Robustly via File API)
                video_parts = []
                if payload.videos:
                    for v_base64 in payload.videos[:1]: # Limit to 1 video for now to manage wait times
                        try:
                            # 1. Decode Base64 to Temp File
                            if "," in v_base64:
                                header, v_base64 = v_base64.split(",", 1)
                                mime_type = header.split(";")[0].split(":")[1]
                            else:
                                mime_type = "video/mp4"

                            v_bytes = base64.b64decode(v_base64)
                            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
                                tmp.write(v_bytes)
                                tmp_path = tmp.name

                            # 2. Upload to Gemini
                            logger.info(f"Uploading video to Gemini: {tmp_path}")
                            video_file = genai.upload_file(path=tmp_path, mime_type=mime_type)
                            
                            # 3. Wait for processing (Polling)
                            while video_file.state.name == "PROCESSING":
                                logger.debug("Waiting for video processing...")
                                await asyncio.sleep(5)
                                video_file = genai.get_file(video_file.name)
                            
                            if video_file.state.name == "FAILED":
                                raise Exception(f"Video processing failed on Gemini side: {video_file.name}")
                            
                            logger.info(f"Video uploaded and processed: {video_file.uri}")
                            video_parts.append(video_file)
                            
                            # Cleanup
                            if os.path.exists(tmp_path):
                                os.remove(tmp_path)
                                
                        except Exception as ve:
                            logger.warning(f"Robust video processing failed: {ve}")
                            # Fallback or log error
                
                contents = [prompt] + image_parts + video_parts
                response = await model.generate_content_async(contents, generation_config=generation_config)
                result = json.loads(response.text)
                
                # Increment AI Usage on Success
                await subscription_service.increment_ai_insight_usage(customer_id, "performance_report")
                
                return result
            except Exception as e:
                logger.warning(f"Failed with model {m_name}: {e}")
                last_error = e
                if payload.model: break # Don't fallback if user explicitly asked for a model
        
        # If we reach here, all tried models failed
        raise last_error or Exception("모든 AI 모델 호출에 실패했습니다.")

    except Exception as e:
        logger.error(f"Generate Viral Post Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI 분석 중 오류가 발생했습니다: {str(e)}")

# --- End Viral Post Maker ---









def _get_post_analysis_schema() -> dict:
    """게시물 단위 댓글 분석을 위한 JSON Schema"""
    return {
        "type": "object",
        "properties": {
            "results": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "post_id": {"type": "string", "description": "분석 대상 게시물 고유 ID"},
                        "post_summary": {"type": "string", "description": "게시물 여론 요약 (반드시 전문적인 한국어로 작성)"},
                        "dominant_sentiment": {"type": "string", "enum": ["POSITIVE", "NEGATIVE", "NEUTRAL"], "description": "가장 지배적인 감정 여론"},
                        "comments": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string", "description": "댓글 고유 ID"},
                                    "sentiment": {"type": "string", "enum": ["POSITIVE", "NEGATIVE", "NEUTRAL"], "description": "개별 댓글 감정"},
                                    "category": {"type": "string", "enum": ["COMPLAINT", "QUESTION", "FEEDBACK", "PRAISE", "NEUTRAL", "SPAM", "TOXIC"], "description": "댓글 분류 유형"},
                                    "urgency": {"type": "string", "enum": ["HIGH", "MEDIUM", "LOW"], "description": "조치 필요 긴급도"},
                                    "summary": {"type": "string", "description": "댓글 내용의 핵심 요약 (반드시 한국어로 작성)"},
                                    "action_required": {"type": "boolean", "description": "브랜드 측의 후속 조치 필요 여부"},
                                    "moderation_confidence": {"type": "number", "description": "스팸/악성 탐지 신뢰 점수 (0-1)"}
                                },
                                "required": ["id", "sentiment", "category", "urgency", "action_required"]
                            }
                        }
                    },
                    "required": ["post_id", "post_summary", "dominant_sentiment", "comments"]
                }
            }
        },
        "required": ["results"]
    }



class CommentItem(BaseModel):
    id: str
    text: str


class PostAnalysisRequest(BaseModel):
    post_id: str
    caption: str
    comments: List[CommentItem]


async def analyze_posts_batch(
    posts: List[PostAnalysisRequest],
    api_key: str,
    model_name: str = "gemini-2.0-flash",
    chunk_size: int = 15  # [Optimization] Split large parallel chunks for speed
) -> List[dict]:
    """
    Gemini를 사용하여 게시물별 댓글을 병렬로 분석하여 속도를 높입니다.
    """
    if not posts:
        return []

    import asyncio
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    
    response_schema = _get_post_analysis_schema()
    
    # 1. Chunking Logic: 큰 요청을 여러 개의 작은 요청으로 분할
    # 실서비스에서는 15개 정도가 지연시간과 정확도의 균형이 가장 좋습니다.
    all_chunks = []
    for p in posts:
        comments_list = p.comments
        if len(comments_list) <= chunk_size:
            all_chunks.append((p, comments_list))
        else:
            # Split into chunks of chunk_size
            for i in range(0, len(comments_list), chunk_size):
                chunk = comments_list[i : i + chunk_size]
                all_chunks.append((p, chunk))

    async def _call_gemini_single_chunk(req_post: PostAnalysisRequest, comments_chunk: List[CommentItem]) -> dict:
        """단일 청크에 대해 Gemini API 호출"""
        chunk_data = [{
            "post_id": req_post.post_id,
            "caption": req_post.caption,
            "comments": [{"id": c.id, "text": c.text} for c in comments_chunk]
        }]
        
        prompt = f"""다음 데이터를 분석하여 반드시 JSON으로 응답하세요.

데이터:
{json.dumps(chunk_data, ensure_ascii=False, indent=2)}

[중요 지침 - 필독]
1. 모든 텍스트 출력 필드(post_summary, summary 등)는 **반드시 완벽한 한국어(Korean)**로만 작성해야 합니다. 절대 영어를 병기하거나 영어를 그대로 출력하지 마세요.
2. 분석 대상 댓글이나 캡션이 100% 영어더라도, 그 핵심 의미를 파악하여 번역한 뒤 **자연스러운 한국어 마케팅 톤**으로 요약하세요.
3. 예시 (이렇게 응답하세요):
   "post_summary": "전반적으로 긍정적인 반응이 많습니다. 제품 구매 문의가 이어집니다." (O)
   "post_summary": "Mostly positive reactions. People are asking for price." (X - 절대 금지입니다.)
4. 응답에 영어가 미량이라도 섞여 있다면 심각한 에러로 간주됩니다.
5. JSON 형식만 출력하고, 다른 텍스트는 포함하지 마세요.

분석 결과는 반드시 제공된 한국어 Schema를 따라야 합니다:
{json.dumps(response_schema, ensure_ascii=False)}"""

        available_models = [model_name, "gemini-2.0-flash", "gemini-1.5-flash"]
        system_instruction = "당신은 세계 최고의 Instagram 마케팅 전문가이자 반응 분석 AI입니다. 모든 출력 텍스트 응답(post_summary, summary 등)은 반드시 **전문적인 한국어**로만 작성하고, 절대 영어를 사용하지 마세요."
        for m_id in available_models:
            try:
                model = genai.GenerativeModel(m_id, system_instruction=system_instruction)
                config = {"temperature": 0.0, "response_mime_type": "application/json", "response_schema": response_schema}
                response = await model.generate_content_async(prompt, generation_config=config)
                if not response or not response.text:
                    raise Exception("Empty response from Gemini")
                # Parse and validate JSON response against schema
                try:
                    result_json = json.loads(response.text.strip())
                    from jsonschema import validate, ValidationError
                    validate(instance=result_json, schema=response_schema)
                    return result_json
                except (json.JSONDecodeError, ValidationError) as e:
                    logger.warning(f"Gemini response validation failed: {e}. Falling back to empty result.")
                    # Fallback: return empty results to avoid breaking downstream processing
                    return {"results": []}
            except Exception as e:
                logger.warning(f"Chunk AI attempt failed ({m_id}): {e}")
                continue
        return {"results": []}

    # 2. Parallel Execution (핵심: asyncio.gather로 동시에 실행)
    tasks = [_call_gemini_single_chunk(p, c) for p, c in all_chunks]
    chunk_results = await asyncio.gather(*tasks)

    # 3. Aggregation Logic (분산된 결과를 다시 합침)
    final_results_map = {} # post_id -> aggregated_data

    for res_json in chunk_results:
        for p_res in res_json.get("results", []):
            p_id = p_res.get("post_id")
            if p_id not in final_results_map:
                final_results_map[p_id] = {
                    "post_id": p_id,
                    "post_summary": p_res.get("post_summary", ""),
                    "dominant_sentiment": p_res.get("dominant_sentiment", "NEUTRAL"),
                    "comments": []
                }
            # Append comments from this chunk
            final_results_map[p_id]["comments"].extend(p_res.get("comments", []))

    return list(final_results_map.values())

