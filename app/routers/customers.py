from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import traceback

from app.database import get_db_session
from app.schemas.customer import CustomerResponse, CustomerCreateRequest, CustomerUpdateRequest, DashboardStatsResponse, AutomationActivityResponse
from app.schemas.admin import CustomerListResponse
from app.schemas.common import SimpleStatusResponse
from app.services.customer_service import CustomerService
from app.services.insight_service import InsightService
from app.services.activity_service import ActivityService
from app.utils.logging import get_logger
from app.utils.rate_limiter import rate_limiter
from app.services.subscription_service import SubscriptionService
from app.models.customer import Customer
from app.models.ai_insight import AiInsight
from app.routers.admin_auth import get_current_user

logger = get_logger(__name__)

router = APIRouter()


@router.get("", response_model=CustomerListResponse)
async def list_customers(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    service: CustomerService = Depends(CustomerService),
) -> CustomerListResponse:
    """
    SaaS Hardening: Restrict listing to only the authenticated user's profile.
    This prevents users from discovering other customer IDs in the system.
    """
    # Simply return a list containing only the current user's data
    customer_res = await service.get_customer(db=db, customer_id=current_user.id)
    return CustomerListResponse(
        page=1,
        page_size=1,
        total=1,
        results=[customer_res] if customer_res else []
    )


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: UUID,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    service: CustomerService = Depends(CustomerService),
) -> CustomerResponse:
    logger.info(f"🔍 get_customer called: customer_id={customer_id}, current_user.id={current_user.id}")
    logger.info(f"🔍 Type check: customer_id type={type(customer_id)}, current_user.id type={type(current_user.id)}")
    logger.info(f"🔍 Comparison: {current_user.id} != {customer_id} = {current_user.id != customer_id}")
    
    if current_user.id != customer_id:
        logger.warning(f"❌ Authorization failed: user {current_user.id} tried to access customer {customer_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 고객 정보에 접근할 권한이 없습니다."
        )
    try:
        customer = await service.get_customer(db=db, customer_id=customer_id)
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="고객을 찾을 수 없습니다.")
        return customer
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting customer: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="고객 정보를 가져오는 데 실패했습니다."
        )


@router.get("/{customer_id}/dashboard-stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    customer_id: UUID,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    service: CustomerService = Depends(CustomerService),
) -> DashboardStatsResponse:
    if current_user.id != customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 대시보드 통계에 접근할 권한이 없습니다."
        )
    try:
        stats = await service.get_dashboard_stats(db=db, customer_id=customer_id)
        return DashboardStatsResponse(**stats)
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        logger.error(traceback.format_exc())
        # Return zeros on error to prevent dashboard crash
        return DashboardStatsResponse(total_contacts=0, active_automations=0, total_broadcasts_sent=0)

@router.get("/{customer_id}/automation-stats")
async def get_automation_stats(
    customer_id: UUID,
    days: int = 30,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    service: CustomerService = Depends(CustomerService),
):
    if current_user.id != customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 자동화 통계에 접근할 권한이 없습니다."
        )
    try:
        stats = await service.get_automation_statistics(db=db, customer_id=customer_id, days=days)
        return stats
    except Exception as e:
        logger.error(f"Error getting automation stats: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            "total_activities": 0,
            "time_saved_minutes": 0,
            "event_distribution": [],
            "intent_distribution": []
        }


@router.get("/{customer_id}/ai-insights")
async def get_ai_insights(
    customer_id: UUID,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
    insight_service: InsightService = Depends(InsightService),
    subscription_service: SubscriptionService = Depends(SubscriptionService)
):
    if current_user.id != customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 AI 인사이트에 접근할 권한이 없습니다."
        )
    """
    최근 DM을 분석하여 트렌드 키워드와 비즈니스 기회(Opportunities)를 반환합니다.
    """

    # Rate limit (고객 단위) - 새로고침/리렌더 난사로 외부 API/AI 비용 폭주 방지
    # 제한 초과 시 429로 막되, 가능하면 최신 캐시 결과를 그대로 반환해서 UX 유지
    rl_key = f"ai-insights:{customer_id}"

    async def _return_latest_cached_if_any():
        stmt = select(AiInsight).where(AiInsight.customer_id == customer_id).order_by(AiInsight.updated_at.desc()).limit(1)
        result = await db.execute(stmt)
        cached = result.scalars().first()
        if cached and cached.analysis_json:
            payload = dict(cached.analysis_json)
            payload.setdefault("meta", {})
            payload["meta"].update({"rate_limited": True, "source": "db-cache"})
            return payload
        return None

    minute_rl = await rate_limiter.allow(rl_key, max_calls=5, window_seconds=60)
    if not minute_rl.allowed:
        cached_payload = await _return_latest_cached_if_any()
        if cached_payload is not None:
            return cached_payload
        raise HTTPException(
            status_code=429,
            detail="AI 인사이트 요청이 너무 많습니다(분당 제한). 잠시 후 다시 시도해주세요.",
            headers={"Retry-After": str(int(minute_rl.retry_after_seconds) + 1)},
        )

    hour_rl = await rate_limiter.allow(rl_key, max_calls=30, window_seconds=3600)
    if not hour_rl.allowed:
        cached_payload = await _return_latest_cached_if_any()
        if cached_payload is not None:
            return cached_payload
        raise HTTPException(
            status_code=429,
            detail="AI 인사이트 요청이 너무 많습니다(시간당 제한). 잠시 후 다시 시도해주세요.",
            headers={"Retry-After": str(int(hour_rl.retry_after_seconds) + 1)},
        )

    # [Security Fix] Check subscription access for AI insights
    access_result = await subscription_service.check_ai_insight_access(customer_id, "lead_detection")
    if not access_result["allowed"]:
        logger.info(f"AI Insights access denied for customer {customer_id}: {access_result['reason']}. Attempting cache fallback.")
        
        # [Fallback] If access is denied, try to return latest cached data if any
        cached_payload = await _return_latest_cached_if_any()
        if cached_payload is not None:
            cached_payload["meta"].update({
                "access_restricted": True,
                "upgrade_required": True,
                "reason": access_result["reason"]
            })
            return cached_payload
            
        return {
            "trends": {"keywords": [], "summary": f"구독이 필요합니다: {access_result['reason']}"},
            "opportunities": [],
            "upgrade_required": True
        }

    try:
        # 1. Fetch detailed conversation context (최근 20개 대화)
        conversations = await customer_service.get_recent_conversations_for_ai(db, customer_id, limit=20)
        
        # 2. Analyze via Gemini (Opportunities + Trends)
        result = await insight_service.analyze_opportunities(conversations, db=db, customer_id=customer_id)
        return result
    except Exception as e:
        logger.error(f"Error in ai-insights: {str(e)}")
        # Return fallback structure
        return {
            "trends": {"keywords": [], "summary": "분석 데이터를 불러오지 못했습니다."},
            "opportunities": []
        }


@router.post("", include_in_schema=False, response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    payload: CustomerCreateRequest,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    service: CustomerService = Depends(CustomerService),
) -> CustomerResponse:
    """
    [Internal Admin Only] 이 엔드포인트는 외부 접근이 제한됩니다.
    일반 사용자는 반드시 /auth/signup 을 통해 가입해야 합니다.
    - include_in_schema=False: Swagger 문서에서 숨김 처리
    - is_superuser 권한 체크: 관리자만 직접 계정 생성 가능
    """
    # Superuser 권한 체크 (일반 사용자 직접 생성 차단)
    if not getattr(current_user, 'is_superuser', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 작업은 관리자만 수행할 수 있습니다. 일반 회원가입은 /auth/signup 을 이용해주세요."
        )
    try:
        customer = await service.create_customer(db=db, payload=payload)
        return customer
    except Exception as e:
        logger.error(f"Error creating customer: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="고객 생성에 실패했습니다."
        )


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: UUID,
    payload: CustomerUpdateRequest,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    service: CustomerService = Depends(CustomerService),
) -> CustomerResponse:
    if current_user.id != customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="고객 정보를 수정할 권한이 없습니다."
        )
    try:
        customer = await service.update_customer(db=db, customer_id=customer_id, payload=payload)
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="고객을 찾을 수 없습니다.")
        return customer
    except ValueError as e:
        logger.error(f"Validation error updating customer: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating customer: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="고객 정보 업데이트에 실패했습니다."
        )


@router.get("/{customer_id}/messaging-eligibility", response_model=SimpleStatusResponse)
async def get_messaging_eligibility(
    customer_id: UUID,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    service: CustomerService = Depends(CustomerService),
) -> SimpleStatusResponse:
    if current_user.id != customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="권한 확인을 위한 접근 권한이 없습니다."
        )
    """
    메시지 기능 사용 가능 여부를 반환합니다.
    - integration_status가 APPROVED 여야 메시지 기능 허용
    """
    customer = await service.get_customer(db=db, customer_id=customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="고객을 찾을 수 없습니다.")

    is_allowed = customer.integration_status == "APPROVED"
    detail = "APPROVED" if is_allowed else "관리자 승인 후 사용 가능합니다."

    return SimpleStatusResponse(
        status=customer.integration_status,
        allowed=is_allowed,
        detail=detail,
    )

@router.get("/{customer_id}/activities", response_model=List[AutomationActivityResponse])
async def get_customer_activities(
    customer_id: UUID,
    limit: int = Query(default=20, ge=1, le=100),
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> List[AutomationActivityResponse]:
    if current_user.id != customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="활동 로그에 접근할 권한이 없습니다."
        )
    """
    고객의 최근 자동화 활동 로그를 반환합니다.
    """
    try:
        service = ActivityService(db)
        activities = await service.get_recent_activities(customer_id, limit=limit)
        return activities
    except Exception as e:
        logger.error(f"Error getting customer activities: {str(e)}")
        logger.error(traceback.format_exc())
        return []





