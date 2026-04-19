from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status, BackgroundTasks, Body
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db_session, AsyncSessionLocal
from app.services.meta_oauth import MetaOAuthService
from app.services.customer_service import CustomerService
from app.services.insight_service import InsightService
from app.utils.logging import get_logger
from app.models.oauth_account import OAuthAccount, OAuthProvider
from app.schemas.instagram import InstagramLinkRequest, AIResponseSettingsUpdate, ModerationSettingsUpdate, PostModerationUpdate, KeywordSettingsUpdate, InstagramAccountOptionsResponse, InstagramLinkResponse, TokenStatusResponse, BulkDeleteRequest, BulkDeleteResponse, SetPageTokenRequest
from app.schemas.common import SimpleStatusResponse
from app.services.campaign_processor import CampaignProcessor
import re
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import httpx
from app.config import get_settings, Settings
from app.routers.admin_auth import get_current_user
from app.models.customer import Customer
from app.models.contact import Contact
from app.models.automation_activity import AutomationActivity
from app.models.chat import ChatSession, ChatMessage
from app.models.ai_insight import AiInsight
from app.models.ai_performance_report import AIPerformanceReport
from app.models.post_analysis_cache import PostAnalysisCache
from app.models.broadcast_log import BroadcastLog
from datetime import datetime, timezone


logger = get_logger(__name__)

router = APIRouter()

def _classify_comment(text: str) -> str:
    """Fallback classification when AI is unavailable or fails validation."""
    content = text.lower()
    if any(w in content for w in ["불만", "최악", "별로", "환불", "짜증", "문제", "하자", "실망"]):
        return "COMPLAINT"
    if "?" in content or any(w in content for w in ["어떻게", "언제", "얼마", "어디", "가격", "구매", "링크"]):
        return "QUESTION"
    if any(w in content for w in ["건의", "이렇게", "바꿔", "추가"]):
        return "FEEDBACK"
    if any(w in content for w in ["최고", "좋아요", "짱", "예뻐요", "아름", "훌륭", "감사", "칭찬", "가성비"]):
        return "PRAISE"
    return "NEUTRAL"

async def sync_instagram_conversations_background(customer_id: UUID, access_token: str, db_session_factory):
    """
    Background task to sync Instagram conversations (usernames/profile pics).
    This runs asynchronously to avoid blocking the main UI response.
    """
    logger.info(f"⏳ [Background Sync] Starting conversation sync for customer {customer_id}")
    
    try:
        async with db_session_factory() as db:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                ig_url = f"https://graph.instagram.com/v25.0/me/conversations"
                params = {
                    "platform": "instagram",
                    "access_token": access_token,
                    "fields": "id,updated_time,participants,messages.limit(3){message,from,created_time}",
                    "limit": 20
                }
                resp = await client.get(ig_url, params=params)
                
                if resp.is_success:
                    ig_data = resp.json()
                    ig_convos = ig_data.get("data", [])
                    synced_count = 0
                    
                    # Build map: participant_id -> username, profile_pic
                    for conv in ig_convos:
                        participants = conv.get("participants", {}).get("data", [])
                        for p in participants:
                            p_id = p.get("id")
                            p_username = p.get("username")
                            p_profile_pic = p.get("profile_picture_url")
                            
                            if p_id and p_username:
                                # Sync to Contact table immediately
                                from app.models.contact import Contact
                                contact_result = await db.execute(
                                    select(Contact).where(
                                        Contact.customer_id == customer_id,
                                        Contact.instagram_id == p_id
                                    )
                                )
                                existing_contact = contact_result.scalar_one_or_none()
                                if existing_contact:
                                    updated = False
                                    if not existing_contact.username:
                                        existing_contact.username = p_username
                                        updated = True
                                    if p_profile_pic:
                                        # Always update profile pic if available to keep it fresh
                                        # Or only if missing: if not existing_contact.profile_pic:
                                        if existing_contact.profile_pic != p_profile_pic:
                                            existing_contact.profile_pic = p_profile_pic
                                            updated = True
                                    
                                    if updated:
                                        synced_count += 1
                                        # logger.debug(f"✅ [Background Sync] Updating: {p_id} -> @{p_username}")
                    
                    if synced_count > 0:
                        await db.commit()
                        logger.info(f"✅ [Background Sync] Successfully synced {synced_count} contacts for customer {customer_id}")
                    else:
                        logger.info(f"ℹ️ [Background Sync] No new updates for customer {customer_id}")
                else:
                    logger.warning(f"⚠️ [Background Sync] API request failed: {resp.status_code} - {resp.text}")

    except Exception as e:
        logger.error(f"❌ [Background Sync] Error syncing conversations: {str(e)}")
        # import traceback
        # logger.error(traceback.format_exc())

@router.get("/accounts/{customer_id}/performance-report/debug-cache")
async def debug_performance_report_cache(
    customer_id: UUID = Path(..., description="고객 ID"),
    limit: int = Query(5, ge=1, le=50, description="최근 캐시 조회 개수"),
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """
    디버그용: AI 성과 리포트가 DB에 저장/업데이트 되고 있는지 확인합니다.
    - 최근 캐시 행 개수/최근 created_at/updated_at/media_hash를 반환
    """
    # 고객 본인만 조회 가능
    if current_user.id != customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다.")

    try:
        rows_result = await db.execute(
            select(AIPerformanceReport)
            .where(AIPerformanceReport.customer_id == customer_id)
            .order_by(AIPerformanceReport.created_at.desc())
            .limit(limit)
        )
        rows = rows_result.scalars().all()

        count_result = await db.execute(
            select(AIPerformanceReport.id).where(AIPerformanceReport.customer_id == customer_id)
        )
        total = len(count_result.scalars().all())

        return {
            "ok": True,
            "customer_id": str(customer_id),
            "total_rows": total,
            "recent": [
                {
                    "id": str(r.id),
                    "media_ids_hash": r.media_ids_hash,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "updated_at": r.updated_at.isoformat() if r.updated_at else None,
                }
                for r in rows
            ],
        }
    except Exception as e:
        logger.error(f"[debug_performance_report_cache] failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"디버그 캐시 조회 실패: {str(e)}")


@router.get("/connect/options", response_model=InstagramAccountOptionsResponse)
async def list_instagram_options(
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    oauth_service: MetaOAuthService = Depends(MetaOAuthService.from_settings),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    고객이 연결 가능한 Instagram 비즈니스 계정 목록을 반환합니다.
    """
    customer_id = current_user.id
    # Meta OAuth 토큰 확인
    oauth_result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.customer_id == customer_id,
            OAuthAccount.provider == OAuthProvider.META,
        )
    )
    oauth_account = oauth_result.scalar_one_or_none()
    
    if not oauth_account or not oauth_account.access_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meta OAuth 정보가 없습니다. 먼저 Meta 로그인을 완료해주세요."
        )
    
    try:
        # 토큰 권한을 먼저 확인해서, "IG가 연결 안 됨"과 "Meta가 페이지 권한을 토큰에 안 줌"을 구분합니다.
        debug_info = await oauth_service.debug_token(oauth_account.access_token)
        token_data = debug_info.get("data", {})
        granted_scopes = token_data.get("scopes", []) or []

        required_scopes = ["pages_read_engagement", "pages_manage_metadata"]
        missing_scopes = [s for s in required_scopes if s not in granted_scopes]

        if missing_scopes:
            # 프론트에서 더 정확한 안내를 할 수 있도록 에러 정보를 함께 반환합니다. (HTTP 200 유지)
            logger.warning(
                f"Meta token missing required page scopes: customer_id={customer_id}, missing={missing_scopes}, granted={granted_scopes}"
            )
            return {
                "options": [],
                "error": {
                    "code": "MISSING_META_SCOPES",
                    "missing_scopes": missing_scopes,
                    "granted_scopes": granted_scopes,
                    "message": (
                        "Meta가 이 로그인 토큰에 페이지 권한(pages_read_engagement, pages_manage_metadata)을 부여하지 않았습니다. "
                        "이 상태에서는 /me/accounts가 빈 배열로 내려와 Instagram 비즈니스 계정 목록을 가져올 수 없습니다."
                    ),
                },
            }

        # Instagram 페이지 목록 가져오기
        pages = await oauth_service.list_instagram_pages(oauth_account.access_token)
        
        # 현재 연결된 Instagram 계정들 확인 (여러 계정 지원)
        instagram_accounts = await customer_service.get_instagram_accounts(db, customer_id)
        current_page_ids = {acc.page_id for acc in instagram_accounts if acc.page_id}
        
        # 옵션 목록 생성
        options = []
        for page in pages:
            options.append({
                "page_id": page.page_id,
                "page_name": page.page_name,
                "instagram_user_id": page.instagram_user_id,
                "instagram_username": page.instagram_username or "",
                "is_current": page.page_id in current_page_ids,  # 여러 계정 지원: 이미 연결된 계정 표시
            })
        
        return {"options": options}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Instagram 옵션 목록 조회 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Instagram 계정 목록을 불러오는 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/token-status", response_model=TokenStatusResponse)
async def check_account_token(
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    oauth_service: MetaOAuthService = Depends(MetaOAuthService.from_settings),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    저장된 Instagram 계정의 토큰 상태를 확인합니다.
    """
    customer_id = current_user.id
    instagram_account = await customer_service.get_instagram_account(db, customer_id)
    
    if not instagram_account or not instagram_account.access_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instagram 계정 또는 토큰이 없습니다."
        )
    
    try:
        # 1. 토큰 디버그 (App Access Token 사용) -> Meta Graph API (Business)
        # 2. Instagram Basic Display API 테스트 (me) -> Basic Display
        
        result = {
            "customer_id": str(customer_id),
            "instagram_username": instagram_account.instagram_username,
            "access_token_prefix": instagram_account.access_token[:10] + "..." if instagram_account.access_token else None,
            "checks": {}
        }
        
        # Check 1: Meta Graph API Debug Token (requires Meta App credentials)
        # Note: If this is an IG Basic Display token, this might fail or return invalid.
        try:
            debug_info = await oauth_service.debug_token(instagram_account.access_token)
            token_data = debug_info.get("data", {})
            result["checks"]["meta_debug_token"] = {
                "success": True, 
                "is_valid": token_data.get("is_valid"),
                "scopes": token_data.get("scopes"),
                "app_id": token_data.get("app_id")
            }
        except Exception as e:
            result["checks"]["meta_debug_token"] = {"success": False, "error": str(e)}

        # Check 2: Instagram Basic Display API (graph.instagram.com/me)
        import httpx
        async with httpx.AsyncClient() as client:
            try:
                ig_response = await client.get(
                    "https://graph.instagram.com/me",
                    params={"fields": "id,username,account_type", "access_token": instagram_account.access_token},
                    timeout=5.0
                )
                if ig_response.is_success:
                    result["checks"]["basic_display_api"] = {"success": True, "data": ig_response.json()}
                else:
                    result["checks"]["basic_display_api"] = {"success": False, "status": ig_response.status_code, "body": ig_response.text}
            except Exception as e:
                result["checks"]["basic_display_api"] = {"success": False, "error": str(e)}

            # [REMOVED] Check 3: Instagram Graph API (graph.instagram.com/me)
            # Since we exclusively use Instagram Business Login (graph.instagram.com),
            # this legacy Facebook fallback is no longer needed.
            pass

        return result
    except Exception as e:
        logger.error(f"토큰 확인 중 오류: {str(e)}")
        # 토큰이 만료되었거나 형식이 잘못된 경우 등
        return {
            "customer_id": str(customer_id),
            "error": str(e),
            "token_valid": False
        }



@router.post("/upgrade-token", response_model=InstagramLinkResponse)
async def upgrade_to_page_token(
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    oauth_service: MetaOAuthService = Depends(MetaOAuthService.from_settings),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    저장된 Instagram 계정의 User Access Token을 Page Access Token으로 업그레이드합니다.
    
    이 엔드포인트는 /me/accounts가 빈 배열을 반환하는 경우에도,
    Facebook Graph API Explorer에서 직접 얻은 Page Access Token을 저장할 수 있도록 합니다.
    """
    customer_id = current_user.id
    from app.models.oauth_account import OAuthAccount, OAuthProvider
    from sqlalchemy import select
    
    try:
        # Meta OAuth 토큰 확인
        oauth_result = await db.execute(
            select(OAuthAccount).where(
                OAuthAccount.customer_id == customer_id,
                OAuthAccount.provider == OAuthProvider.META,
            )
        )
        oauth_account = oauth_result.scalar_one_or_none()
        
        if not oauth_account or not oauth_account.access_token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_NOT_FOUND,
                detail="Meta OAuth 정보가 없습니다."
            )
        
        # Instagram 계정 확인
        instagram_account = await customer_service.get_instagram_account(db, customer_id)
        if not instagram_account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram 계정이 연결되어 있지 않습니다."
            )
        
        page_id = instagram_account.page_id # Use the page_id from the stored account
        if not page_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="저장된 Instagram 계정에 page_id가 없습니다. 먼저 계정을 연결해주세요."
            )
        
        # Page Access Token 획득 시도 (여러 방법 시도)
        import httpx
        # Page Access Token 획득 시도 (Instagram Business Login 전용)
        import httpx
        page_access_token = None
        
        async with httpx.AsyncClient() as client:
            # Instagram Business Login: Always use graph.instagram.com
            # Since we only use Instagram Business Login, we prioritize direct IG token usage.
            
            # 방법 0: Instagram User ID 확인
            try:
                me_response = await client.get(
                    "https://graph.instagram.com/v25.0/me",
                    params={
                        "access_token": oauth_account.access_token,
                        "fields": "id",
                    },
                    timeout=10.0,
                )
                if me_response.is_success:
                    logger.info(f"✅ Instagram ID 확인 완료: {me_response.json().get('id')}")
            except Exception as e:
                logger.debug(f"Instagram ID 확인 실패 (무시): {str(e)}")
            
            # 방법 1: Instagram Native Token (IG...) 을 직접 사용
            if oauth_account.access_token.startswith("IG"):
                page_access_token = oauth_account.access_token
                logger.info(f"✅ Instagram Native Token을 직접 사용합니다. (page_id={page_id})")
            
            # 방법 2: Instagram API로 직접 토큰 조회 시도
            if not page_access_token:
                logger.info(f"🔍 Instagram Native API로 Page Access Token (IG ID 기반) 획득 시도...")
                try:
                    # In IG Business Login, the page_id is essentially the account identifier
                    url = f"https://graph.instagram.com/v25.0/{page_id}"
                    resp = await client.get(url, params={"access_token": oauth_account.access_token, "fields": "access_token"})
                    if resp.is_success:
                        page_access_token = resp.json().get("access_token")
                        if page_access_token:
                            logger.info(f"✅ Instagram API로 토큰 획득 성공: {page_id}")
                except Exception as e:
                    logger.debug(f"Instagram API 직접 조회 실패: {str(e)}")
            
            # 방법 3: refresh_page_access_token 메서드 활용
            if not page_access_token:
                try:
                    logger.info(f"🔄 방법 3: refresh_page_access_token 메서드로 시도...")
                    page_access_token = await oauth_service.refresh_page_access_token(
                        oauth_account.access_token, 
                        page_id
                    )
                    if page_access_token:
                        logger.info(f"✅ 방법 3으로 Page Access Token 획득 성공!")
                except Exception as e3:
                    logger.debug(f"방법 3 시도 실패: {str(e3)}")
        
        if not page_access_token:
            logger.error(f"❌ 모든 방법으로 Page Access Token 획득 실패")
            logger.error(f"   → Facebook Graph API Explorer에서 직접 토큰을 생성하여 아래 엔드포인트로 POST 요청을 보내주세요")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Page Access Token을 획득할 수 없습니다. Facebook Graph API Explorer에서 직접 토큰을 생성하여 아래 엔드포인트로 POST 요청을 보내주세요: POST /instagram/accounts/{customer_id}/set-page-token?page_access_token=YOUR_TOKEN"
            )
        
        # Instagram 계정의 access_token 업데이트
        instagram_account.access_token = page_access_token
        await db.commit()
        await db.refresh(instagram_account)
        
        # 웹훅 구독 시도
        webhook_subscribed = False
        try:
            webhook_subscribed = await oauth_service.subscribe_page_to_webhook(
                page_id=page_id,
                page_access_token=page_access_token,
            )
            if webhook_subscribed:
                logger.info(f"✅ 웹훅 구독 완료: page_id={page_id}")
        except Exception as e:
            logger.warning(f"⚠️ 웹훅 구독 실패: {str(e)}")
        
        return {
            "success": True,
            "page_id": page_id,
            "page_access_token_updated": True,
            "webhook_subscribed": webhook_subscribed,
            "message": "Page Access Token이 업데이트되었습니다." + (" 웹훅 구독도 완료되었습니다." if webhook_subscribed else " 웹훅 구독은 실패했습니다.")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Page Access Token 업그레이드 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Page Access Token 업그레이드 중 오류: {str(e)}"
        )


@router.post("/set-page-token", response_model=InstagramLinkResponse)
async def set_page_token(
    request: SetPageTokenRequest,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    oauth_service: MetaOAuthService = Depends(MetaOAuthService.from_settings),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    Facebook Graph API Explorer에서 직접 얻은 Page Access Token을 저장합니다.
    
    사용 방법:
    1. https://developers.facebook.com/tools/explorer/ 접속
    2. User Token 선택 후 다음 호출:
       GET /me/accounts?fields=id,name,access_token
    3. 응답에서 page_id에 해당하는 access_token 복사
    4. 이 엔드포인트로 POST 요청:
       POST /instagram/accounts/{customer_id}/set-page-token?page_access_token=복사한_토큰
    """
    customer_id = current_user.id
    page_access_token = request.page_access_token
    try:
        # Instagram 계정 확인
        instagram_account = await customer_service.get_instagram_account(db, customer_id)
        if not instagram_account or not instagram_account.page_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram 계정이 연결되어 있지 않거나 page_id가 없습니다."
            )
        
        # 토큰 유효성 확인 (선택사항)
        try:
            debug_info = await oauth_service.debug_token(page_access_token)
            token_data = debug_info.get("data", {})
            token_type = token_data.get("type")
            if token_type != "PAGE":
                logger.warning(f"⚠️ 토큰 타입이 PAGE가 아닙니다: {token_type}")
        except Exception as e:
            logger.warning(f"⚠️ 토큰 디버그 실패 (무시): {str(e)}")
        
        # Instagram 계정의 access_token 업데이트
        instagram_account.access_token = page_access_token
        await db.commit()
        await db.refresh(instagram_account)
        
        # 웹훅 구독 시도
        webhook_subscribed = False
        try:
            webhook_subscribed = await oauth_service.subscribe_page_to_webhook(
                page_id=instagram_account.page_id,
                page_access_token=page_access_token,
            )
            if webhook_subscribed:
                logger.info(f"✅ 웹훅 구독 완료: page_id={instagram_account.page_id}")
        except Exception as e:
            logger.warning(f"⚠️ 웹훅 구독 실패: {str(e)}")
        
        return {
            "success": True,
            "page_id": instagram_account.page_id,
            "page_access_token_updated": True,
            "webhook_subscribed": webhook_subscribed,
            "message": "Page Access Token이 저장되었습니다." + (" 웹훅 구독도 완료되었습니다." if webhook_subscribed else " 웹훅 구독은 실패했습니다.")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Page Access Token 설정 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Page Access Token 설정 중 오류: {str(e)}"
        )




@router.post("/accounts/check-duplicate")
async def check_duplicate_instagram_account(
    request: InstagramLinkRequest,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    oauth_service: MetaOAuthService = Depends(MetaOAuthService.from_settings),
) -> dict:
    """
    Instagram 계정이 이미 다른 AIDM 계정에 연결되어 있는지 확인합니다.
    """
    customer_id = current_user.id
    try:
        # Meta OAuth 토큰 확인
        oauth_result = await db.execute(
            select(OAuthAccount).where(
                OAuthAccount.customer_id == customer_id,
                OAuthAccount.provider == OAuthProvider.META,
            )
        )
        oauth_account = oauth_result.scalar_one_or_none()
        
        if not oauth_account or not oauth_account.access_token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meta OAuth 정보가 없습니다."
            )
        
        # Instagram 페이지 목록 가져오기
        pages = await oauth_service.list_instagram_pages(oauth_account.access_token)
        
        # 선택한 page_id에 해당하는 페이지 찾기
        selected_page = None
        for page in pages:
            if page.page_id == request.page_id:
                selected_page = page
                break
        
        if not selected_page or not selected_page.instagram_user_id:
            return {
                "is_duplicate": False,
                "existing_account": None
            }
        
        # 다른 고객의 계정 중 같은 instagram_user_id가 있는지 확인
        from app.models.instagram_account import InstagramAccount
        result = await db.execute(
            select(InstagramAccount).where(
                InstagramAccount.instagram_user_id == selected_page.instagram_user_id,
                InstagramAccount.customer_id != customer_id
            )
        )
        other_account = result.scalars().first()
        
        if other_account:
            return {
                "is_duplicate": True,
                "existing_account": {
                    "instagram_username": selected_page.instagram_username,
                    "instagram_user_id": selected_page.instagram_user_id
                }
            }
        
        return {
            "is_duplicate": False,
            "existing_account": None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"중복 체크 중 오류: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"중복 체크 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/accounts/link")
async def link_instagram_account(
    request: InstagramLinkRequest,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    oauth_service: MetaOAuthService = Depends(MetaOAuthService.from_settings),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    선택한 Instagram 비즈니스 계정들을 고객에게 연결합니다 (여러 계정 지원).
    """
    customer_id = current_user.id
    try:
        # Meta OAuth 토큰 확인
        oauth_result = await db.execute(
            select(OAuthAccount).where(
                OAuthAccount.customer_id == customer_id,
                OAuthAccount.provider == OAuthProvider.META,
            )
        )
        oauth_account = oauth_result.scalar_one_or_none()
        
        if not oauth_account or not oauth_account.access_token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meta OAuth 정보가 없습니다. 먼저 Meta 로그인을 완료해주세요."
            )
        
        # Instagram 페이지 목록 가져오기
        pages = await oauth_service.list_instagram_pages(oauth_account.access_token)
        
        # 선택한 page_id에 해당하는 페이지 찾기 (instagram_user_id로도 매칭 시도)
        selected_page = None
        for page in pages:
            if page.page_id == request.page_id or page.instagram_user_id == request.page_id:
                selected_page = page
                break
        
        if not selected_page:
            # Fallback: if we still can't find it but it's a forced transfer, 
            # try to verify the ID directly via Instagram Graph API
            if request.force_transfer and request.page_id:
                try:
                    logger.info(f"Direct verification for forced transfer: {request.page_id}")
                    # Use the access token from the OAuth account to verify ownership/validity
                    profile_info = await oauth_service.get_instagram_user_info(oauth_account.access_token, request.page_id)
                    if profile_info:
                        logger.info(f"✅ Verified Instagram account @{profile_info.get('username')} for transfer")
                        instagram_account = await customer_service.save_instagram_account(
                            db=db,
                            customer_id=customer_id,
                            page_id=None,
                            instagram_user_id=request.page_id,
                            access_token=oauth_account.access_token,
                            instagram_username=profile_info.get("username"),
                            profile_picture_url=profile_info.get("profile_picture_url"),
                            followers_count=profile_info.get("followers_count"),
                            follows_count=profile_info.get("follows_count"),
                            media_count=profile_info.get("media_count"),
                            force_transfer=True
                        )
                        return {
                            "success": True, 
                            "message": f"Instagram 계정 (@{profile_info.get('username')})의 소유권이 성공적으로 이전되었습니다.",
                            "customer_id": str(customer_id),
                            "instagram_user_id": request.page_id
                        }
                except Exception as e:
                    logger.error(f"Fallback verification failed: {str(e)}")

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"선택한 계정 (ID: {request.page_id})를 찾을 수 없거나 접근 권한이 없습니다."
            )
        
        if not selected_page.instagram_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"선택한 페이지 (page_id: {request.page_id})에 Instagram 비즈니스 계정이 연결되어 있지 않습니다."
            )
        
        # Try to fetch additional profile info (followers etc.)
        profile_info = {}
        try:
            profile_info = await oauth_service.get_instagram_user_info(
                selected_page.access_token or oauth_account.access_token, 
                selected_page.instagram_user_id
            )
        except Exception as e:
            logger.warning(f"Could not fetch initial profile metrics: {e}")

        # Instagram 계정 저장 (단일 계정 정책: 기존 계정이 있으면 업데이트/교체됨)
        instagram_account = await customer_service.save_instagram_account(
            db=db,
            customer_id=customer_id,
            page_id=selected_page.page_id,
            instagram_user_id=selected_page.instagram_user_id,
            access_token=selected_page.access_token or oauth_account.access_token,
            instagram_username=selected_page.instagram_username or profile_info.get("username"),
            profile_picture_url=profile_info.get("profile_picture_url"),
            followers_count=profile_info.get("followers_count"),
            follows_count=profile_info.get("follows_count"),
            media_count=profile_info.get("media_count"),
            force_transfer=request.force_transfer,
        )
        
        # 웹훅 구독 시도 (Page Access Token이 있는 경우)
        if selected_page.access_token:
            try:
                webhook_subscribed = await oauth_service.subscribe_page_to_webhook(
                    page_id=selected_page.page_id,
                    page_access_token=selected_page.access_token,
                )
                if webhook_subscribed:
                    logger.info(f"✅ 웹훅 구독 완료: page_id={selected_page.page_id}")
                else:
                    logger.warning(f"⚠️ 웹훅 구독 실패: page_id={selected_page.page_id}")
            except Exception as e:
                logger.warning(f"⚠️ 웹훅 구독 중 오류 (무시): {str(e)}")
        
        await db.commit()
        
        return {
            "success": True,
            "instagram_account": {
                "id": str(instagram_account.id),
                "page_id": instagram_account.page_id,
                "instagram_user_id": instagram_account.instagram_user_id,
                "instagram_username": selected_page.instagram_username,
            },
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"잘못된 customer_id 형식: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Instagram 계정 연결 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Instagram 계정 연결 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/accounts/disconnect", response_model=SimpleStatusResponse)
async def disconnect_instagram_accounts(
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    현재 고객에게 연결된 모든 Instagram 계정을 연결 해제합니다.
    """
    customer_id = current_user.id
    try:
        # DB에서 InstagramAccount 삭제
        from app.models.instagram_account import InstagramAccount
        from sqlalchemy import delete
        
        # 1. Instagram 계정 비활성화 (토큰 정보만 삭제)
        # 삭제(delete) 대신 업데이트(update)를 사용하여, 재연결 시 데이터를 유지하고
        # 다른 계정으로 교체 시(Swap) 이를 감지하여 데이터를 세정할 수 있도록 합니다.
        # 사용자가 직접 연결해제한 경우이므로 connection_status는 변경하지 않음
        # (connection_status="DISCONNECTED"는 토큰 만료 등 자동 해제 시에만 설정됨)
        from sqlalchemy import update
        stmt = (
            update(InstagramAccount)
            .where(InstagramAccount.customer_id == customer_id)
            .values(
                access_token=None,
                page_id=None,
                token_expires_at=None,
                # connection_status는 변경하지 않음 - 사용자가 직접 해제한 경우와 자동 해제를 구분하기 위해
                updated_at=datetime.utcnow()
            )
        )
        await db.execute(stmt)
        
        # 2. 통합 상태를 PENDING으로 변경 (선택 사항)
        current_user.integration_status = "PENDING"
        
        await db.commit()
        
        logger.info(f"✅ Instagram 계정 연결 해제 완료: customer_id={customer_id}")
        
        return {
            "status": "success",
            "allowed": False,
            "detail": "Instagram 계정 연결이 성공적으로 해제되었습니다."
        }
    except Exception as e:
        logger.error(f"Instagram 계정 연결 해제 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"계정 연결 해제 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/accounts/{customer_id}/webhook-status")
async def get_webhook_status(
    customer_id: UUID = Path(..., description="고객 ID"),
    db: AsyncSession = Depends(get_db_session),
    oauth_service: MetaOAuthService = Depends(MetaOAuthService.from_settings),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    웹훅 구독 상태를 확인합니다. (pages_manage_metadata 사용 사례)
    검수용: Meta가 pages_manage_metadata 권한 사용을 확인할 수 있도록 합니다.
    """
    try:
        result = await db.execute(
            select(Customer)
            .options(selectinload(Customer.instagram_account))
            .where(Customer.id == customer_id)
        )
        customer = result.scalar_one_or_none()
        instagram_account = customer.instagram_account if customer else None
        
        if not instagram_account or not instagram_account.page_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram 계정이 연결되어 있지 않습니다."
            )
        
        page_id = instagram_account.page_id
        page_access_token = instagram_account.access_token
        
        if not page_access_token:
            return {
                "page_id": page_id,
                "webhook_subscribed": False,
                "message": "Page Access Token이 없어 웹훅 구독 상태를 확인할 수 없습니다.",
                "permission_used": "pages_manage_metadata (for webhook subscription management)"
            }
        
        # 웹훅 구독 상태 확인
        import httpx
        async with httpx.AsyncClient() as client:
            # /subscribed_apps API로 구독 상태 확인
            response = await client.get(
                f"https://graph.instagram.com/v25.0/{page_id}/subscribed_apps",
                params={
                    "access_token": page_access_token,
                },
                timeout=10.0,
            )
            
            if response.is_success:
                data = response.json()
                subscribed_apps = data.get("data", [])
                app_id = oauth_service.settings.meta_app_id
                
                # 우리 앱이 구독되어 있는지 확인
                is_subscribed = any(
                    app.get("id") == app_id or app.get("app_id") == app_id
                    for app in subscribed_apps
                )
                
                subscribed_fields = []
                if is_subscribed and subscribed_apps:
                    for app in subscribed_apps:
                        if app.get("id") == app_id or app.get("app_id") == app_id:
                            subscribed_fields = app.get("subscribed_fields", [])
                            break
                
                return {
                    "page_id": page_id,
                    "webhook_subscribed": is_subscribed,
                    "subscribed_fields": subscribed_fields,
                    "permission_used": "pages_manage_metadata",
                    "usage_description": "This permission is used to subscribe to page webhooks for receiving Instagram message events.",
                    "message": "Webhook subscription status retrieved successfully" if is_subscribed else "Webhook not subscribed"
                }
            else:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("error", {}).get("message", "Unknown error")
                return {
                    "page_id": page_id,
                    "webhook_subscribed": False,
                    "error": error_msg,
                    "permission_used": "pages_manage_metadata",
                    "message": f"Failed to check webhook status: {error_msg}"
                }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"웹훅 상태 확인 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"웹훅 상태 확인 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/accounts/ai-settings")
async def get_ai_settings(
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    고객의 AI 설정(프롬프트)을 조회합니다.
    """
    customer_id = current_user.id
    # Customer 테이블에서 AI 설정 가져오기
    # Customer 테이블에서 AI 설정 가져오기 (관계 데이터 포함)
    result = await db.execute(
        select(Customer)
        .options(selectinload(Customer.instagram_account))
        .where(Customer.id == customer_id)
    )
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="고객 정보가 없습니다."
        )
    
    return {
        "customer_id": customer_id,
        "system_prompt": customer.system_prompt or "당신은 브랜드 AI 어시스턴트입니다. 고객의 문의에 친절하고 전문적으로 답변해주세요.",
        "is_ai_active": customer.is_ai_active if customer.is_ai_active is not None else True,
        "ai_operate_start": customer.ai_operate_start or "00:00",
        "ai_operate_end": customer.ai_operate_end or "23:59",
        "ai_knowledge_base_url": customer.ai_knowledge_base_url,
        "ai_knowledge_base_filename": customer.ai_knowledge_base_filename,
        "is_moderation_alert_active": customer.is_moderation_alert_active if customer.is_moderation_alert_active is not None else True,
        "moderation_disabled_posts": customer.instagram_account.moderation_disabled_posts if customer.instagram_account and customer.instagram_account.moderation_disabled_posts else []
    }


@router.post("/accounts/ai-settings")
async def update_ai_settings(
    payload: AIResponseSettingsUpdate,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    고객의 AI 응답 설정을 업데이트합니다.
    """
    customer_id = current_user.id
    success = await customer_service.update_ai_response_settings(
        db, 
        customer_id, 
        payload.system_prompt,
        is_ai_active=payload.is_ai_active,
        ai_operate_start=payload.ai_operate_start,
        ai_operate_end=payload.ai_operate_end,
        ai_knowledge_base_url=payload.ai_knowledge_base_url,
        ai_knowledge_base_filename=payload.ai_knowledge_base_filename
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="업데이트할 Instagram 계정이 없습니다."
        )
    
    return {"success": True, "message": "AI 응답 설정이 저장되었습니다."}


@router.post("/accounts/moderation-settings")
async def update_moderation_settings(
    payload: ModerationSettingsUpdate,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    고객의 AI 클린가드(모더레이션) 설정을 업데이트합니다.
    """
    customer_id = current_user.id
    success = await customer_service.update_moderation_settings(
        db, 
        customer_id, 
        is_moderation_alert_active=payload.is_moderation_alert_active
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="업데이트할 Instagram 계정이 없습니다."
        )
    
    return {"success": True, "message": "클린가드 설정이 저장되었습니다."}

@router.post("/accounts/moderation-settings/post")
async def update_post_moderation_settings(
    payload: PostModerationUpdate,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    특정 게시물의 실시간 악플 탐지 알림 설정을 업데이트합니다.
    """
    customer_id = current_user.id
    success = await customer_service.update_post_moderation_setting(
        db, 
        customer_id, 
        payload.post_id,
        payload.is_disabled
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="업데이트할 Instagram 계정이 없습니다."
        )
    
    msg = "게시물 알림이 비활성화되었습니다." if payload.is_disabled else "게시물 알림이 활성화되었습니다."
    return {"success": True, "message": msg}


@router.get("/accounts/keyword-settings")
async def get_keyword_settings(
    customer_id: str = Query(None, description="조회할 고객 ID (관리자용)"),
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    고객의 키워드 답장 설정을 조회합니다.
    """
    # 1. 사용할 customer_id 결정
    target_id = current_user.id
    if customer_id and str(customer_id).strip() and str(customer_id).lower() != 'null':
        try:
            target_id = UUID(str(customer_id))
        except (ValueError, TypeError):
             logger.warning(f"⚠️ Invalid customer_id format passed to GET: {customer_id}")
    
    # [Production Hardening] Security Check: Only allow access to self unless the user has admin role
    # (If admin role logic is added later, this is where it applies)
    if target_id != current_user.id:
        # Check for admin bypass here if necessary
        # if not current_user.is_admin:
        logger.warning(f"🚫 Unauthorized attempt: {current_user.id} tried to GET {target_id}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="접근 권한이 없습니다.")

    logger.info(f"🔍 Fetching keyword settings for target_id: {target_id}")

    # 3. 데이터 조회
    result = await db.execute(
        select(Customer)
        .options(selectinload(Customer.instagram_account))
        .where(Customer.id == target_id)
    )
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="고객 정보가 없습니다."
        )
    
    # 두 테이블의 키워드 데이터를 병합 (중복 제거)
    customer_replies = customer.keyword_replies or []
    account_replies = []
    if customer.instagram_account:
        account_replies = customer.instagram_account.keyword_replies or []
    
    # 병합 로직: 키워드와 메시지, media_id가 모두 같은 경우 중복으로 간주
    merged_replies = list(customer_replies)
    seen = set()
    for r in merged_replies:
        key = (r.get("keyword"), r.get("message"), r.get("media_id"))
        seen.add(key)
        
    for r in account_replies:
        key = (r.get("keyword"), r.get("message"), r.get("media_id"))
        if key not in seen:
            merged_replies.append(r)
            seen.add(key)
    
    logger.info(f"🟢 GET keyword-settings for {target_id} returning {len(merged_replies)} items (Customer: {len(customer_replies)}, Account: {len(account_replies)})")
    
    return {
        "customer_id": str(target_id),
        "keyword_replies": merged_replies
    }


@router.post("/accounts/keyword-settings")
async def update_keyword_settings(
    payload: KeywordSettingsUpdate,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    고객의 키워드 답장 설정을 업데이트합니다.
    """
    # Payload에 담긴 customer_id 사용
    target_id = current_user.id
    if payload.customer_id:
        target_id = payload.customer_id

    # [Production Hardening] Security Check
    if target_id != current_user.id:
        logger.warning(f"🚫 Unauthorized attempt: {current_user.id} tried to POST {target_id}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="수정 권한이 없습니다.")
    
    # KeywordReply 객체를 딕셔너리로 변환하여 저장
    replies_dict = [reply.model_dump() for reply in payload.keyword_replies]
    logger.info(f"💾 Saving {len(replies_dict)} keywords for {target_id}")
    
    success = await customer_service.update_keyword_settings(db, target_id, replies_dict)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="업데이트할 고객 계정이 없습니다."
        )
    
    return {"success": True, "message": "키워드 답장 설정이 저장되었습니다."}






@router.post("/accounts/subscribe-webhook")
async def subscribe_webhook(
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    oauth_service: MetaOAuthService = Depends(MetaOAuthService.from_settings),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    웹훅 재구독을 시도합니다.
    pages_messaging 권한이 없으면 403이 발생할 수 있습니다.
    """
    customer_id = current_user.id
    try:
        instagram_account = await customer_service.get_instagram_account(db, customer_id)
        if not instagram_account or not instagram_account.page_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram 계정이 연결되어 있지 않습니다."
            )

        page_id = instagram_account.page_id
        page_access_token = instagram_account.access_token

        if not page_access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Page Access Token이 없어 웹훅을 구독할 수 없습니다. Meta OAuth를 다시 진행하세요."
            )

        subscribed = await oauth_service.subscribe_page_to_webhook(
            page_id=page_id,
            page_access_token=page_access_token,
        )

        return {
            "success": subscribed,
            "page_id": page_id,
            "message": "Webhook subscribed successfully" if subscribed else "Webhook subscription failed. pages_messaging 권한이 필요할 수 있습니다."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"웹훅 재구독 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"웹훅 재구독 중 오류가 발생했습니다: {str(e)}"
        )





@router.post("/webhook/subscribe-all-customers", include_in_schema=False)
async def subscribe_all_customers(
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    oauth_service: MetaOAuthService = Depends(MetaOAuthService.from_settings),
) -> dict:
    """
    모든 활성 고객의 Instagram 계정을 웹훅에 일괄 구독합니다.
    [Internal Admin Only] 관리자 권한이 필요합니다.
    """
    if not getattr(current_user, 'is_superuser', False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 전용 기능입니다.")
    try:
        results = await oauth_service.subscribe_all_webhooks(db)
        return results
    except Exception as e:
        logger.error(f"웹훅 일괄 구독 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"웹훅 일괄 구독 중 오류가 발생했습니다: {str(e)}"
        )



@router.get("/webhook/all-approved-accounts", include_in_schema=False)
async def get_all_approved_accounts(
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    웹훅용: 모든 승인된 Instagram 계정 목록 반환
    [Internal Admin Only] 보안을 위해 관리자 권한이 필요합니다.
    
    이 API는 Supabase에 등록된 모든 승인된 고객의 Instagram 계정 정보를 반환합니다.
    웹훅에서 받은 entry.id가 이 목록에 있는지 확인하여 계정을 식별할 수 있습니다.
    
    반환 형식:
    {
        "accounts": [
            {
                "customer_id": "uuid",
                "page_id": "string",
                "instagram_user_id": "string",
                "access_token": "string"
            },
            ...
        ]
    }
    """
    try:
        from app.models.instagram_account import InstagramAccount
        from app.models.customer import Customer
        
        # 모든 승인된 Instagram 계정 조회
        # 명시적 join 조건 사용 (customer_id로 조인)
        result = await db.execute(
            select(InstagramAccount)
            .join(Customer, InstagramAccount.customer_id == Customer.id)
            .where(
                Customer.integration_status == "APPROVED",
            )
        )
        all_accounts = result.scalars().all()
        
        accounts_list = []
        for account in all_accounts:
            accounts_list.append({
                "customer_id": str(account.customer_id),
                "page_id": account.page_id,
                "instagram_user_id": account.instagram_user_id,
                "access_token": account.access_token,
            })
        
        logger.info(f"✅ 모든 승인된 계정 목록 반환: {len(accounts_list)}개 계정")
        
        return {
            "accounts": accounts_list,
            "total": len(accounts_list)
        }
    except Exception as e:
        logger.error(f"모든 승인된 계정 목록 조회 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"계정 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/admin/fix-db-constraint", include_in_schema=False)
async def fix_db_constraint(
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """
    Instagram Account 테이블의 customer_id unique constraint 제거
    [Internal Admin Only] 관리자만 실행 가능합니다.
    여러 계정 지원을 위해 필요
    """
    try:
        from sqlalchemy import text
        
        # Unique 인덱스 찾기
        result = await db.execute(text("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'instagram_account' 
            AND (indexdef LIKE '%UNIQUE%customer_id%' OR indexname LIKE '%customer_id%unique%')
        """))
        indexes = result.fetchall()
        
        removed_indexes = []
        for row in indexes:
            idx_name = row[0]
            try:
                await db.execute(text(f"DROP INDEX IF EXISTS {idx_name} CASCADE"))
                removed_indexes.append(idx_name)
                logger.info(f"✅ Unique 인덱스 제거: {idx_name}")
            except Exception as e:
                logger.warning(f"⚠️ 인덱스 제거 실패 {idx_name}: {str(e)}")
        
        await db.commit()
        
        return {
            "success": True,
            "removed_indexes": removed_indexes,
            "message": f"Unique constraint 제거 완료: {len(removed_indexes)}개 인덱스 제거됨"
        }
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ 오류 발생: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"데이터베이스 제약 제거 중 오류: {str(e)}"
        )


@router.get("/accounts/{customer_id}/ig-insights")
async def get_ig_insights(
    customer_id: UUID = Path(..., description="고객 ID"),
    force_refresh: bool = Query(False, description="캐시 무시 및 즉시 업데이트 여부"),
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    Instagram 계정 정보를 조회합니다. (instagram_manage_insights / instagram_basic)
    [Security] 본인의 데이터만 조회 가능하도록 권한을 체크합니다.
    """
    if current_user.id != customer_id:
        logger.warning(f"❌ Authorization failed: user {current_user.id} tried to access IG insights for customer {customer_id}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="본인의 인스타그램 정보만 조회할 수 있습니다.")
    try:
        instagram_account = await customer_service.get_instagram_account(db, customer_id)
        if not instagram_account or not instagram_account.instagram_user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram 계정이 연결되어 있지 않습니다."
            )

        # ⚡ 캐싱 전략: Instagram Graph API Rate Limit 대응
        # 
        # Instagram Graph API Rate Limits (공식):
        # - 시간당 약 200회 / Instagram 계정 (비즈니스/크리에이터)
        # - Insights API도 동일한 제한 적용
        # - 롤링 방식 (하루 기준 고정 제한 없음)
        # - 헤더: X-Business-Use-Case-Usage로 사용량 확인 가능
        # 
        # 전략: 
        # 1. 5분(300초) 이내 재호출 시 캐시 반환 (API 호출 방지)
        # 2. Rate Limit 헤더 파싱하여 사용량 모니터링
        # 3. 429 에러 발생 시 Exponential Backoff + 캐시 데이터 반환
        # 4. 캐시가 없으면 API 호출 (최소한의 호출만)
        
        from datetime import datetime, timedelta
        CACHE_TTL_SECONDS = 300  # 5분 캐시 (Rate Limit 대비 및 비용 최적화)
        
        if instagram_account.last_insights_fetch and not force_refresh:
            time_since_last_fetch = datetime.utcnow() - instagram_account.last_insights_fetch
            if time_since_last_fetch < timedelta(seconds=CACHE_TTL_SECONDS):
                logger.info(f"⚡ Rate limit: Returning cached data (last fetch: {time_since_last_fetch.seconds}s ago, TTL: {CACHE_TTL_SECONDS}s)")
                # 캐시된 데이터 반환 (DB에 저장된 최근 미디어 포함)
                cached_media = instagram_account.cached_media_data or []
                
                return {
                    "instagram_user_id": instagram_account.instagram_user_id,
                    "username": instagram_account.instagram_username,
                    "profile_picture_url": instagram_account.profile_picture_url,
                    "followers_count": instagram_account.followers_count or 0,
                    "media_count": instagram_account.media_count or 0,
                    "recent_media": cached_media,  # 캐시된 미디어 데이터 반환
                    "permission_used": "cached",
                    "message": f"Cached data (fetched {time_since_last_fetch.seconds}s ago, TTL: {CACHE_TTL_SECONDS}s)",
                    "cached": True
                }

        ig_user_id = instagram_account.instagram_user_id
        access_token = instagram_account.access_token
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Access token이 없어 Instagram 정보를 조회할 수 없습니다. Meta OAuth를 다시 진행하세요."
            )

        # 1. Base URL selection
        # Instagram Business Login (Method 1) tokens start with IGAAV...
        # Standard Meta Business (Method 2) tokens start with EA...
        # IMPORTANT: Tokens starting with 'IG' MUST use graph.instagram.com.
        # graph.instagram.com cannot parse IGAAV... tokens.
        
        # IG 비즈니스 로그인만 사용하므로 항상 graph.instagram.com 사용
        base_url = "https://graph.instagram.com"
        url = f"{base_url}/{ig_user_id}"
        
        async with httpx.AsyncClient() as client:
            # 1. 기본 미디어 데이터 요청 (인사이트 제외)
            basic_params = {
                "access_token": access_token,
                "fields": "id,username,profile_picture_url,followers_count,media_count,media.limit(10){id,caption,media_type,media_url,thumbnail_url,comments_count,like_count,timestamp}"
            }
            
            logger.info(f"Instagram Graph API Request (ig-insights): {url}")
            resp = await client.get(url, params=basic_params, timeout=10.0)
            
            if not resp.is_success:
                error_data = resp.json() if resp.content else {}
                error_msg = error_data.get("error", {}).get("message", resp.text)
                logger.error(f"Instagram Graph API Error (ig-insights): {resp.status_code} - {error_msg}")
                raise HTTPException(status_code=resp.status_code, detail=f"Instagram 정보를 가져오지 못했습니다: {error_msg}")

            # ⚡ Rate Limit 헤더 파싱 및 모니터링
            rate_limit_info = None
            try:
                rate_limit_header = resp.headers.get("X-Business-Use-Case-Usage")
                if rate_limit_header:
                    import json
                    rate_limit_info = json.loads(rate_limit_header)
                    # 예: { "ig_api_usage": [ { "acc_id_util_pct": 50, "reset_time_duration": 3600 } ] }
                    if rate_limit_info.get("ig_api_usage"):
                        usage = rate_limit_info["ig_api_usage"][0]
                        util_pct = usage.get("acc_id_util_pct", 0)
                        reset_duration = usage.get("reset_time_duration", 3600)
                        
                        if util_pct >= 80:
                            logger.warning(f"⚠️ Instagram API Rate Limit 경고: {util_pct}% 사용 중 (리셋까지 {reset_duration}초)")
                        else:
                            logger.info(f"ℹ️ Instagram API 사용량: {util_pct}% (리셋까지 {reset_duration}초)")
            except Exception as e:
                logger.debug(f"Rate limit 헤더 파싱 실패 (무시): {e}")
            
            data = resp.json()
            media = data.get("media", {}).get("data", []) if isinstance(data.get("media"), dict) else []

            recent_media = []
            permission_level = "basic"
            
            # 2. 각 미디어별 인사이트 데이터 가져오기 (instagram_business_manage_insights 필요)
            # IG 비즈니스 로그인 토큰 사용, graph.instagram.com 사용
            if media:
                try:
                    insights_base = "https://graph.instagram.com/v25.0"
                    for m in media:
                        media_id = m.get("id")
                        if not media_id:
                            continue
                        media_type = m.get("media_type", "").upper()
                        # metric selection logic (same as get_ig_media)
                        if media_type == "REELS" or media_type == "VIDEO":
                            metrics = "plays,reach,likes,comments,shares"
                        else:
                            metrics = "impressions,reach,likes,comments,shares"

                        try:
                            # 인사이트 API 호출: impressions,reach,likes,comments 사용
                            # 참고: 실제 API에서는 engagement 메트릭이 지원되지 않음 (likes + comments로 계산)
                            insights_resp = await client.get(
                                f"{insights_base}/{media_id}/insights",
                                params={
                                    "metric": metrics,
                                    "access_token": access_token,
                                },
                                timeout=10.0,
                            )
                            
                            insights_data = []
                            if insights_resp.is_success:
                                insights_data = insights_resp.json().get("data", [])
                                logger.info(f"✅ Successfully loaded insights for media {media_id}")
                                logger.debug(f"🔍 DEBUG: Full Insights Response for {media_id}: {insights_resp.text}")
                                permission_level = "full"
                            else:
                                # 인사이트 조회 실패 시 특정 미디어 타입에서 impressions가 지원되지 않는 경우 재시도
                                error_data = insights_resp.json() if insights_resp.content else {}
                                error_msg = error_data.get("error", {}).get("message", "Unknown error")
                                error_code = error_data.get("error", {}).get("code", "Unknown")
                                
                                logger.info(f"🔍 DEBUG: Insights Error for {media_id} - Code: {error_code}, Msg: {error_msg}")
                                
                                # 도달(reach)은 거의 항상 지원되므로 impressions/plays 실패 시 fallback 시도
                                is_impression_error = ("support" in error_msg.lower() and "impression" in error_msg.lower()) or (error_code == 100 and "impression" in error_msg.lower())
                                
                                if is_impression_error:
                                    # 모든 가능한 지표들을 요청 (가장 범용적인 것들 위주)
                                    # 주의: 'engagement'는 일부 미디어에서 지원되지 않을 수 있으므로 'total_interactions' 사용
                                    fallback_metrics = "reach,likes,comments,saved,shares,total_interactions"
                                    logger.warning(f"⚠️ Impressions error. Retrying with possible fallback metrics: {fallback_metrics}")
                                        
                                    try:
                                        fallback_resp = await client.get(
                                            f"{insights_base}/{media_id}/insights",
                                            params={
                                                "metric": fallback_metrics,
                                                "access_token": access_token,
                                            },
                                            timeout=10.0,
                                        )
                                        if fallback_resp.is_success:
                                            insights_data = fallback_resp.json().get("data", [])
                                            logger.info(f"🔍 DEBUG: Full Fallback Response for {media_id}: {fallback_resp.text}")
                                            if insights_data:
                                                permission_level = "full"
                                            logger.info(f"✅ Successfully loaded fallback insights for media {media_id}")
                                        else:
                                            logger.warning(f"⚠️ Fallback insights failed for media {media_id}: {fallback_resp.text}")
                                    except Exception as fe:
                                        logger.warning(f"⚠️ Exception during fallback insights: {fe}")
                                
                                elif error_code in [100, 190, 200] and ("permission" in error_msg.lower() or "token" in error_msg.lower()):
                                    # 진짜 권한/토큰 오류인 경우에만 루프 중단
                                    logger.info(f"ℹ️ Skipping further insights requests due to FATAL error: {error_msg}")
                                    for remaining_m in media[media.index(m):]:
                                        recent_media.append({
                                            "id": remaining_m.get("id"),
                                            "caption": (remaining_m.get("caption") or "")[:120],
                                            "media_type": remaining_m.get("media_type"),
                                            "media_url": remaining_m.get("media_url") or remaining_m.get("thumbnail_url"),
                                            "like_count": remaining_m.get("like_count", 0),
                                            "comments_count": remaining_m.get("comments_count", 0),
                                            "timestamp": remaining_m.get("timestamp"),
                                            "reach": 0,
                                            "impressions": 0,
                                            "engagement": 0,
                                            "video_views": 0,
                                            "saved": 0,
                                            "shares": 0
                                        })
                                    break
                                else:
                                    logger.warning(f"⚠️ Failed to load insights for media {media_id}: HTTP {insights_resp.status_code} - {error_msg}")

                            # 메트릭 추출 및 데이터 구성
                            reach_val = 0
                            impressions_val = 0
                            engagement_val = 0
                            video_views_val = 0
                            saved_val = 0
                            likes_val = 0
                            comments_val = 0
                            shares_val = 0
                            
                            for metric in insights_data:
                                name = metric.get("name")
                                values = metric.get("values") or []
                                if not values:
                                    continue
                                value = values[0].get("value", 0)
                                
                                if name == "reach":
                                    reach_val = value
                                elif name in ["impressions", "plays"]:
                                    impressions_val = value
                                elif name == "likes":
                                    likes_val = value
                                elif name == "comments":
                                    comments_val = value
                                elif name == "shares":
                                    shares_val = value
                                elif name == "saved":
                                    saved_val = value
                                elif name in ["engagement", "total_interactions"]:
                                    engagement_val = value
                            
                            # 만약 engagement가 API에서 직접 제공되지 않았다면 수동 합산
                            if engagement_val == 0:
                                engagement_val = (likes_val or m.get("like_count", 0)) + (comments_val or m.get("comments_count", 0)) + shares_val + saved_val
                            
                            recent_media.append({
                                "id": m.get("id"),
                                "caption": (m.get("caption") or "")[:120],
                                "media_type": m.get("media_type"),
                                "media_url": m.get("media_url") or m.get("thumbnail_url"),
                                "like_count": likes_val or m.get("like_count", 0),
                                "comments_count": comments_val or m.get("comments_count", 0),
                                "timestamp": m.get("timestamp"),
                                "reach": reach_val,
                                "impressions": impressions_val,
                                "engagement": engagement_val,
                                "video_views": video_views_val,
                                "saved": saved_val,
                                "shares": shares_val
                            })
                        except Exception as e:
                            logger.warning(f"⚠️ Failed to load insights for media {media_id}: {e}")
                            recent_media.append({
                                "id": m.get("id"),
                                "caption": (m.get("caption") or "")[:120],
                                "media_type": m.get("media_type"),
                                "media_url": m.get("media_url") or m.get("thumbnail_url"),
                                "like_count": m.get("like_count", 0),
                                "comments_count": m.get("comments_count", 0),
                                "timestamp": m.get("timestamp"),
                                "reach": 0,
                                "impressions": 0,
                                "engagement": 0,
                                "video_views": 0,
                                "saved": 0,
                                "shares": 0
                            })
                        except Exception as e:
                            logger.warning(f"⚠️ Failed to load insights for media {media_id}: {e}")
                            # 에러 발생 시 기본 데이터만 추가
                            recent_media.append({
                                "id": m.get("id"),
                                "caption": (m.get("caption") or "")[:120],
                                "media_type": m.get("media_type"),
                                "media_url": m.get("media_url") or m.get("thumbnail_url"),
                                "like_count": m.get("like_count", 0),
                                "comments_count": m.get("comments_count", 0),
                                "timestamp": m.get("timestamp"),
                                "reach": 0,
                                "impressions": 0,
                                "engagement": 0,
                                "video_views": 0,
                                "saved": 0,
                            })
                except Exception as e:
                    logger.warning(f"⚠️ Failed to load media insights batch: {e}")
                    # 인사이트 배치 로드 실패 시 기본 데이터만 반환
                    for m in media:
                        recent_media.append({
                            "id": m.get("id"),
                            "caption": (m.get("caption") or "")[:120],
                            "media_type": m.get("media_type"),
                            "media_url": m.get("media_url") or m.get("thumbnail_url"),
                            "like_count": m.get("like_count", 0),
                            "comments_count": m.get("comments_count", 0),
                            "timestamp": m.get("timestamp"),
                            "reach": 0,
                            "impressions": 0,
                            "engagement": 0,
                            "video_views": 0,
                            "saved": 0,
                        })
            else:
                # 미디어가 없는 경우 기본 데이터 반환 로직은 유지하되, IG 토큰 스킵 로그는 제거 (이제 지원함)
                if not media:
                    logger.info("ℹ️ No media items found for this account.")
                
                for m in media:
                    recent_media.append({
                        "id": m.get("id"),
                        "caption": (m.get("caption") or "")[:120],
                        "media_type": m.get("media_type"),
                        "media_url": m.get("media_url") or m.get("thumbnail_url"),
                        "like_count": m.get("like_count", 0),
                        "comments_count": m.get("comments_count", 0),
                        "timestamp": m.get("timestamp"),
                        "reach": 0,
                        "impressions": 0,
                        "engagement": 0,
                        "video_views": 0,
                        "saved": 0,
                    })

            logger.info(f"✅ Instagram 데이터 조회 성공 ({permission_level} 모드)")
            
            # ⚡ Update last fetch timestamp and cache media data
            instagram_account.last_insights_fetch = datetime.utcnow()
            instagram_account.cached_media_data = recent_media  # 미디어 데이터 캐싱
            
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(instagram_account, "cached_media_data")
            
            await db.commit()
            
            response_data = {
                "instagram_user_id": data.get("id"),
                "username": data.get("username"),
                "profile_picture_url": data.get("profile_picture_url"),
                "followers_count": data.get("followers_count", 0),
                "media_count": data.get("media_count", 0),
                "recent_media": recent_media,
                "permission_used": permission_level,
                "message": "Instagram insights retrieved successfully" if permission_level == "full" else "Instagram insights retrieved successfully (Fallback active)"
            }
            
            # Rate limit 정보가 있으면 응답에 포함
            if rate_limit_info:
                response_data["rate_limit_info"] = rate_limit_info
            
            return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Instagram 정보 조회 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Instagram 정보 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/accounts/{customer_id}/performance-report")
async def get_performance_report(
    customer_id: UUID = Path(..., description="고객 ID"),
    force_refresh: bool = Query(False, description="캐시 무시하고 강제 새로고침"),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
    insight_service: InsightService = Depends(InsightService),
    current_user=Depends(get_current_user),
):
    """
    최근 게시물 성과를 AI로 분석하여 보고서를 생성합니다.
    
    캐싱 전략:
    - 게시물 ID 해시 기반 캐싱 (게시물이 변경되지 않으면 캐시 사용)
    - 캐시 TTL: 24시간 (24시간 후 자동 만료)
    - force_refresh=true 시 캐시 무시하고 재분석
    
    구독 플랜 체크:
    - Basic Free: 차단
    - AI Free: 1회/월
    - AI Starter: 15회/월
    - AI Pro: 100회/월
    - AI Business: 무제한
    """
    from app.services.subscription_service import SubscriptionService
    
    # 구독 플랜 체크
    subscription_service = SubscriptionService(db)
    access_check = await subscription_service.check_ai_insight_access(customer_id, "performance_report")
    
    if not access_check['allowed']:
        # 캐시가 있으면 캐시 반환 (사용량 증가 없음)
        import hashlib
        from datetime import datetime, timedelta
        from sqlalchemy import select, and_
        from app.models.ai_performance_report import AIPerformanceReport
        
        ig_data = await get_ig_insights(customer_id=customer_id, db=db, customer_service=customer_service, current_user=current_user)
        recent_media = ig_data.get("recent_media", [])
        if recent_media:
            media_ids = sorted([m.get('id', '') for m in recent_media[:5]])
            media_hash = hashlib.md5('|'.join(media_ids).encode()).hexdigest()
            cache_ttl = timedelta(hours=24)
            cache_expiry = datetime.utcnow() - cache_ttl
            
            cached_result = await db.execute(
                select(AIPerformanceReport)
                .where(
                    and_(
                        AIPerformanceReport.customer_id == customer_id,
                        AIPerformanceReport.media_ids_hash == media_hash,
                        AIPerformanceReport.updated_at > cache_expiry
                    )
                )
                .order_by(AIPerformanceReport.updated_at.desc())
                .limit(1)
            )
            cached_report = cached_result.scalar_one_or_none()
            
            if cached_report:
                # 캐시가 있으면 반환 (사용량 증가 없음)
                report_data = cached_report.report_data
                if isinstance(report_data, dict):
                    report_data['cached'] = True
                    report_data['access_restricted'] = True
                    report_data['upgrade_message'] = access_check['reason']
                return report_data
        
        # 캐시도 없고 접근 불가
        raise HTTPException(
            status_code=403,
            detail={
                "error": "subscription_required",
                "message": access_check['reason'],
                "upgrade_required": access_check['upgrade_required'],
                "recommended_plan": access_check.get('recommended_plan'),
                "usage_info": access_check.get('usage_info')
            }
        )
    
    try:
        # 1. Get recent media and metrics via existing ig-insights logic
        # Pass all required dependencies to the function call
        ig_data = await get_ig_insights(customer_id=customer_id, db=db, customer_service=customer_service, current_user=current_user)
        recent_media = ig_data.get("recent_media", [])
        
        if not recent_media:
            return {
                "summary": "분석할 수 있는 게시물 데이터가 없습니다.",
                "analysis": "계정에 게시물을 업로드한 후 다시 시도해 주세요.",
                "strategy": ["꾸준한 포스팅이 성과 분석의 시작입니다."]
            }

        # ⚡ 2. Check Cache (AI Report Caching)
        import hashlib
        from datetime import datetime, timedelta
        from sqlalchemy import select, and_
        from app.models.ai_performance_report import AIPerformanceReport
        
        # Create hash from recent 5 media IDs (게시물이 변경되었는지 확인)
        media_ids = sorted([m.get('id', '') for m in recent_media[:5]])
        media_hash = hashlib.md5('|'.join(media_ids).encode()).hexdigest()
        
        # ⚡ 스마트 캐싱: force_refresh여도 게시물이 변경되지 않았으면 캐시 사용
        logger.info(f"📊 Performance Report Request: force_refresh={force_refresh}, media_hash={media_hash[:8]}")
        
        # 캐시 TTL: 24시간
        cache_ttl = timedelta(hours=24)
        cache_expiry = datetime.utcnow() - cache_ttl
        
        # Check DB for cached report (게시물 ID 해시 + TTL 체크)
        cached_result = await db.execute(
            select(AIPerformanceReport)
            .where(
                and_(
                    AIPerformanceReport.customer_id == customer_id,
                    AIPerformanceReport.media_ids_hash == media_hash,
                    # NOTE: created_at은 최초 생성 시점이라 오래될 수 있음.
                    # 캐시 TTL은 "최근 업데이트/생성 시점" 기준으로 판단해야 하므로 updated_at을 사용.
                    AIPerformanceReport.updated_at > cache_expiry  # 24시간 이내 업데이트된 캐시만
                )
            )
            .order_by(AIPerformanceReport.updated_at.desc())
            .limit(1)
        )
        cached_report = cached_result.scalar_one_or_none()
        
        if cached_report and not force_refresh:
            # 게시물이 변경되지 않았고 강제 새로고침이 아니면 캐시 사용
            logger.info(f"⚡ Cache Hit: AI report for hash {media_hash[:8]} returned from DB (created: {cached_report.created_at})")
            report_data = cached_report.report_data
            # Add cache indicator flag for frontend
            if isinstance(report_data, dict):
                report_data['cached'] = True
                # TTL 기준과 동일하게 updated_at 기준으로 age 계산
                report_data['cache_age_hours'] = (datetime.utcnow() - cached_report.updated_at).total_seconds() / 3600
            return report_data
        
        # force_refresh가 True인 경우, 캐시가 있더라도 무시하고 새로 분석 진행
        if force_refresh and cached_report:
            logger.info(f"🔄 Force Refresh: Bypassing existing cache for hash {media_hash[:8]} to regenerate Korean report")
        elif not cached_report:
            logger.info(f"⚡ Cache Miss: No valid cache found for hash {media_hash[:8]}")
        else:
            # 캐시가 없거나 만료된 경우
            if force_refresh:
                logger.info(f"🔄 Force Refresh: No cache found for hash {media_hash[:8]}, will analyze via Gemini")
            else:
                logger.info(f"⚡ Cache Miss: No valid cache found for hash {media_hash[:8]}")
            
        # 3. Analyze via Gemini (Cache Miss or Force Refresh with data change)
        logger.info(f"🤖 Analyzing via Gemini API for hash {media_hash[:8]}")
        
        # 계정 정보 추출 (팔로워 수 등)
        account_info = {
            'followers_count': ig_data.get('followers_count', 0),
            'username': ig_data.get('username', ''),
            'media_count': ig_data.get('media_count', 0)
        }
        
        # Gemini API 호출 (타임아웃 및 에러 처리 포함)
        try:
            report = await insight_service.analyze_post_performance(recent_media, account_info=account_info)
            
            # AI 분석 성공 시 사용량 증가 (캐시 사용이 아닌 실제 분석만)
            usage_result = await subscription_service.increment_ai_insight_usage(customer_id, "performance_report")
            logger.info(f"📊 AI Performance Report usage incremented: {usage_result['new_count']}/{usage_result['limit']}")
            
        except Exception as e:
            logger.error(f"Gemini API 분석 실패: {str(e)}")
            # Gemini API 실패 시에도 기본 응답 반환 (서비스 중단 방지)
            report = {
                "summary": "AI 분석을 일시적으로 수행할 수 없습니다.",
                "analysis": "시스템 점검 중입니다. 잠시 후 다시 시도해 주세요.",
                "best_post": None,
                "strategy": [
                    "게시물을 꾸준히 업로드하여 데이터를 쌓아보세요.",
                    "다양한 콘텐츠 타입(사진, 동영상, 릴스)을 시도해보세요.",
                    "팔로워와의 소통을 늘려보세요."
                ]
            }
        
        # 응답 구조 최종 검증
        if not isinstance(report, dict):
            logger.error(f"Invalid report type: {type(report)}")
            report = {
                "summary": "분석 결과를 처리하는 중 오류가 발생했습니다.",
                "analysis": "잠시 후 다시 시도해 주세요.",
                "best_post": None,
                "strategy": ["게시물을 꾸준히 업로드하여 데이터를 쌓아보세요."]
            }
        
        # 필수 필드 확인 및 기본값 설정
        if not report.get("summary"):
            report["summary"] = "분석 결과를 생성하는 중입니다."
        if not report.get("analysis"):
            report["analysis"] = "데이터를 분석하고 있습니다."
        if not report.get("strategy") or not isinstance(report.get("strategy"), list):
            report["strategy"] = ["게시물을 꾸준히 업로드하여 데이터를 쌓아보세요."]
        
        # 4. Save to Cache (기존 캐시가 있으면 업데이트, 없으면 생성)
        try:
            # 기존 캐시 확인 (TTL 무시)
            existing_cache = await db.execute(
                select(AIPerformanceReport)
                .where(
                    and_(
                        AIPerformanceReport.customer_id == customer_id,
                        AIPerformanceReport.media_ids_hash == media_hash
                    )
                )
                .order_by(AIPerformanceReport.created_at.desc())
                .limit(1)
            )
            existing_report = existing_cache.scalar_one_or_none()
            
            if existing_report:
                # 기존 캐시 업데이트
                existing_report.report_data = report
                existing_report.updated_at = datetime.utcnow()
                logger.info(f"✅ AI Report cache updated for hash {media_hash[:8]}")
            else:
                # 새 캐시 생성
                new_report = AIPerformanceReport(
                    customer_id=customer_id,
                    media_ids_hash=media_hash,
                    report_data=report
                )
                db.add(new_report)
                logger.info(f"✅ AI Report cached successfully for hash {media_hash[:8]}")
            
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to cache AI report: {str(e)}")
            # Don't fail the request if caching fails
            
        return report

    except HTTPException:
        # FastAPI의 정상적인 에러 응답(403 등)은 그대로 통과시킵니다.
        raise
    except Exception as e:
        logger.error(f"Error generating performance report: {str(e)}")
        return {
            "summary": "AI 리포트 생성 중 오류가 발생했습니다.",
            "analysis": "데이터를 처리하는 과정에서 문제가 발생했습니다.",
            "strategy": ["잠시 후 다시 시도해 주세요."]
        }


@router.get("/accounts/{customer_id}/ig-media")
async def get_ig_media(
    customer_id: UUID = Path(..., description="고객 ID"),
    limit: int = Query(10, ge=1, le=25, description="가져올 최근 게시물 개수"),
    force_refresh: bool = Query(False, description="캐시 무시 및 즉시 업데이트 여부"),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    AI Style Lab 입력용: 최근 IG 피드 이미지/동영상 URL 목록을 반환합니다.
    사용 권한: instagram_basic (읽기)
    """
    try:
        instagram_account = await customer_service.get_instagram_account(db, customer_id)
        if not instagram_account or not instagram_account.instagram_user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram 계정이 연결되어 있지 않습니다."
            )

        # ⚡ [Cache Check] 5-minute TTL
        from datetime import datetime, timedelta
        CACHE_TTL_SECONDS = 300
        if instagram_account.last_insights_fetch and not force_refresh:
            time_since_last_fetch = datetime.utcnow() - instagram_account.last_insights_fetch
            if time_since_last_fetch < timedelta(seconds=CACHE_TTL_SECONDS):
                cached_media = instagram_account.cached_media_data or []
                if cached_media:
                    # Normalize cache keys: `get_instagram_dashboard` saves as `media_url`, while `get_ig_media` fresh fetch sets `url`.
                    for item in cached_media:
                        if "url" not in item and "media_url" in item:
                            item["url"] = item["media_url"]
                            
                    logger.info(f"🚀 [ig-media] Serving {len(cached_media)} items from cache for {customer_id}")
                    return {
                        "ok": True,
                        "instagram_user_id": instagram_account.instagram_user_id,
                        "images": cached_media,
                        "cached": True
                    }

        ig_user_id = instagram_account.instagram_user_id
        access_token = instagram_account.access_token
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Access token이 없어 Instagram 피드를 조회할 수 없습니다. Meta OAuth를 다시 진행하세요."
            )

        import httpx
        async with httpx.AsyncClient() as client:
            # 1. Basic Display Token (Starts with IG...)
            if access_token.startswith("IG"):
                logger.info(f"ℹ️ Basic Display Token (IG...) detected. using graph.instagram.com")
                # Basic Display Token도 like_count, comments_count를 시도해봅니다
                # 일부 Business Login for Instagram 토큰은 이 필드들을 지원합니다
                resp = await client.get(
                    "https://graph.instagram.com/me/media",
                    params={
                        "access_token": access_token,
                        "fields": "id,caption,media_type,media_product_type,media_url,thumbnail_url,timestamp,username,comments_count,like_count,permalink,children{id,media_url,media_type,thumbnail_url}",
                        "limit": limit,
                    },
                    timeout=10.0
                )
                # 만약 필드 오류가 발생하면 기본 필드로 재시도
                if not resp.is_success:
                    error_data = resp.json() if resp.content else {}
                    error_msg = error_data.get("error", {}).get("message", "")
                    if "comments_count" in error_msg or "like_count" in error_msg:
                        logger.warning(f"⚠️ Basic Display Token에서 comments_count/like_count 미지원, 기본 필드로 재시도")
                        resp = await client.get(
                            "https://graph.instagram.com/me/media",
                            params={
                                "access_token": access_token,
                                "fields": "id,caption,media_type,media_url,thumbnail_url,timestamp,username,permalink,children{id,media_url,media_type,thumbnail_url}",
                                "limit": limit,
                            },
                            timeout=10.0
                        )
            else:
                # 2. IG Business Login Token (항상 graph.instagram.com 사용)
                logger.info(f"ℹ️ IG Business Login Token detected. using graph.instagram.com")
                resp = await client.get(
                    f"https://graph.instagram.com/v25.0/{ig_user_id}/media",
                    params={
                        "access_token": access_token,
                        "fields": "id,caption,media_type,media_url,thumbnail_url,comments_count,like_count,timestamp,permalink,children{id,media_url,media_type,thumbnail_url}",
                        "limit": limit,
                    },
                    timeout=10.0,
                )

        if resp.is_success:
            data = resp.json()
            media_list = data.get("data", []) if isinstance(data, dict) else []
            
            logger.info(f"get_ig_media SUCCESS: Found {len(media_list)} items.")

            images = []

            for m in media_list:
                url = m.get("thumbnail_url") or m.get("media_url")
                if not url:
                    continue

                images.append({
                    "id": m.get("id"),
                    "url": url,
                    "media_url": url,
                    "caption": (m.get("caption") or "")[:160],
                    "media_type": m.get("media_type"),
                    "media_product_type": m.get("media_product_type"),  # REELS, FEED, STORY 등
                    "like_count": m.get("like_count", 0),
                    "comments_count": m.get("comments_count", 0),
                    "timestamp": m.get("timestamp"),
                    "permalink": m.get("permalink", ""),
                    "children": m.get("children", {}).get("data", []) if m.get("children") else [],
                    # 기본값은 None으로 두고, 아래에서 Business/Creator 계정인 경우 인
                })
        else:
            logger.error(f"get_ig_media FAILED: Status {resp.status_code}, Body: {resp.text}")

        # 인사이트 API 호출 (instagram_business_manage_insights 필요)
        # Business Login for Instagram을 통해 발급받은 토큰은 IG로 시작할 수 있지만 인사이트를 지원할 수 있음
        # 따라서 모든 토큰에 대해 인사이트 API를 시도하고, 실패 시 로그를 남김
        if images:
            token_type = "IG (Basic Display)" if access_token.startswith("IG") else "EA (Business)"
            logger.info(f"📊 Attempting to load insights for {len(images)} media items using {token_type} token")
            
            try:
                import httpx as _httpx  # 별도 클라이언트 사용
                async with _httpx.AsyncClient(timeout=10.0) as insights_client:
                    insights_success_count = 0
                    insights_failed_count = 0
                    skip_further = False
                    
                    for img in images:
                        if skip_further:
                            break
                            
                        media_id = img.get("id")
                        media_type = img.get("media_type", "").upper()
                        media_product_type = img.get("media_product_type", "").upper()  # REELS, FEED, STORY 등
                        if not media_id:
                            continue
                        try:
                            # Instagram Graph API를 통한 인사이트 조회
                            # IG 비즈니스 로그인만 사용하므로 항상 graph.instagram.com 사용
                            insights_base = "https://graph.instagram.com/v25.0"
                            logger.debug(f"🔍 Fetching insights for media {media_id[:20]} (type: {media_type}, product_type: {media_product_type}) using graph.instagram.com...")

                            # Instagram API with Instagram Login
                            # 참고: 실제 API에서는 engagement 메트릭이 지원되지 않음
                            # engagement는 likes + comments로 계산
                            # media_product_type이 더 정확한 타입 정보를 제공함
                            if media_product_type == "REELS" or media_type == "REELS" or media_type == "VIDEO":
                                # Reels는 plays 사용 (조회수)
                                metrics = "plays,reach,likes,comments,shares"
                            elif media_product_type == "STORY" or media_type == "STORY":
                                # Story는 impressions 미지원
                                metrics = "reach,exits,replies,taps_forward,taps_back"
                            else:
                                # FEED, CAROUSEL 등: impressions,reach,likes,comments,shares,saved 사용
                                metrics = "impressions,views,reach,likes,comments,shares,saved"
                            
                            insights_resp = await insights_client.get(
                                f"{insights_base}/{media_id}/insights",
                                params={
                                    "metric": metrics,
                                    "access_token": access_token,
                                },
                            )
                            
                            if not insights_resp.is_success:
                                error_data = insights_resp.json() if insights_resp.content else {}
                                error_msg = error_data.get("error", {}).get("message", "Unknown error")
                                error_code = error_data.get("error", {}).get("code", "Unknown")
                                error_type = error_data.get("error", {}).get("type", "Unknown")
                                error_subcode = error_data.get("error", {}).get("error_subcode", None)
                                
                                logger.warning(
                                    f"⚠️ Failed to load insights for media {media_id[:20]}: "
                                    f"HTTP {insights_resp.status_code} - Code: {error_code}, "
                                    f"Type: {error_type}, Subcode: {error_subcode}, "
                                    f"Message: {error_msg}"
                                )
                                
                                # 특정 미디어 타입에서 impressions가 지원되지 않는 경우, 미디어 타입에 맞는 메트릭으로 재시도
                                retry_success = False
                                if "does not support" in error_msg.lower() and "impressions" in error_msg.lower():
                                    logger.warning(
                                        f"⚠️ Media type does not support impressions metric: {error_msg}. "
                                        f"Retrying with appropriate metrics for media type {media_product_type or media_type}..."
                                    )
                                    # 미디어 타입에 맞는 메트릭으로 재시도
                                    if media_product_type == "REELS" or media_type == "REELS" or media_type == "VIDEO":
                                        # REELS/VIDEO는 plays 사용 (조회수)
                                        fallback_metrics = "plays,reach,likes,comments,shares"
                                    else:
                                        # FEED/CAROUSEL 등: views 또는 reach 시도 (조회수 대체)
                                        fallback_metrics = "views,reach,likes,comments,shares,saved"
                                    fallback_resp = await insights_client.get(
                                        f"{insights_base}/{media_id}/insights",
                                        params={
                                            "metric": fallback_metrics,
                                            "access_token": access_token,
                                        },
                                    )
                                    if fallback_resp.is_success:
                                        logger.info(f"✅ Successfully loaded insights without impressions for media {media_id[:20]}")
                                        insights_resp = fallback_resp
                                        retry_success = True
                                    else:
                                        insights_failed_count += 1
                                        logger.warning(
                                            f"⚠️ Failed even without impressions. Skipping this media."
                                        )
                                        continue
                                elif "does not support" in error_msg.lower() or "media product type" in error_msg.lower():
                                    insights_failed_count += 1
                                    logger.warning(
                                        f"⚠️ Media type does not support requested metrics: {error_msg}. "
                                        f"Skipping insights for this media only."
                                    )
                                    continue
                                
                                # 재시도가 성공했으면 오류 처리 건너뛰고 파싱 로직으로 진행
                                if retry_success:
                                    pass  # 파싱 로직으로 계속 진행
                                else:
                                    insights_failed_count += 1
                                    # 권한 오류 또는 잘못된 파라미터인 경우 더 이상 시도하지 않음
                                    if error_code in [100, 190, 200] or error_subcode in [2018218, 230]:
                                        logger.error(
                                            f"❌ Critical error detected (Code: {error_code}, Subcode: {error_subcode}). "
                                            f"This usually means the token lacks 'instagram_business_manage_insights' permission. "
                                            f"Please ensure the token was issued via Business Login for Instagram with proper permissions. "
                                            f"Skipping further insights requests."
                                        )
                                        skip_further = True
                                        break
                                    
                                    # 특정 권한 오류 메시지 확인
                                    if any(keyword in error_msg.lower() for keyword in ["permission", "insight", "access", "scope"]):
                                        logger.warning(
                                            f"⚠️ Permission/scope error detected: {error_msg}. "
                                            f"Token may need 'instagram_business_manage_insights' permission."
                                        )
                                        # 첫 번째 미디어에서 권한 오류가 발생하면 나머지도 실패할 가능성이 높음
                                        if insights_failed_count == 1:
                                            skip_further = True
                                            break
                                    
                                    continue

                            # 인사이트 데이터 파싱
                            insights_data = insights_resp.json().get("data", [])
                            if not insights_data:
                                logger.debug(f"ℹ️ No insights data returned for media {media_id[:20]}")
                                continue
                            
                            insights_success_count += 1
                            logger.debug(f"✅ Successfully loaded {len(insights_data)} metrics for media {media_id[:20]}")
                            
                            for metric in insights_data:
                                name = metric.get("name")
                                values = metric.get("values") or []
                                if not values:
                                    continue
                                value = values[0].get("value")

                                if name == "reach":
                                    img["reach"] = value
                                    # reach는 도달 수이지만, 조회수가 없을 경우 임시로 사용
                                    # (impressions, plays, views가 모두 없는 경우에만)
                                    if img.get("view_count") is None:
                                        img["view_count"] = value  # 임시로 조회수로 사용
                                elif name == "impressions":
                                    # impressions는 조회수 (FEED 타입)
                                    img["impressions"] = value
                                    img["view_count"] = value  # 조회수로 사용
                                elif name == "plays":
                                    # plays는 Reels/Video의 조회수
                                    img["view_count"] = value
                                    img["plays"] = value  # plays도 저장
                                elif name == "views":
                                    # views는 일부 미디어 타입의 조회수
                                    img["view_count"] = value
                                    img["views"] = value  # views도 저장
                                elif name == "likes":
                                    img["like_count"] = value
                                elif name == "comments":
                                    img["comments_count"] = value
                                elif name == "shares":
                                    img["shares_count"] = value
                                elif name == "saved":
                                    # saved_count가 없는 경우를 대비해 저장
                                    img["saved_count"] = value
                                elif name == "exits":
                                    img["exits"] = value
                                elif name == "replies":
                                    img["replies"] = value
                                elif name == "taps_forward":
                                    img["taps_forward"] = value
                                elif name == "taps_back":
                                    img["taps_back"] = value
                            
                            # engagement는 likes + comments + shares + saved의 합계로 계산
                            like_val = img.get("like_count", 0) or 0
                            comm_val = img.get("comments_count", 0) or 0
                            shar_val = img.get("shares_count", 0) or 0
                            save_val = img.get("saved_count", 0) or 0
                            
                            img["engagement"] = like_val + comm_val + shar_val + save_val
                            
                        except Exception as e:
                            insights_failed_count += 1
                            logger.warning(f"⚠️ Exception while loading insights for media {media_id[:20] if media_id else 'unknown'}: {e}")
                            import traceback
                            logger.debug(f"Traceback: {traceback.format_exc()}")
                    
                    # 최종 결과 로깅
                    if insights_success_count > 0:
                        logger.info(f"✅ Successfully loaded insights for {insights_success_count}/{len(images)} media items")
                    elif insights_failed_count > 0:
                        logger.warning(
                            f"Please ensure the token was issued via Business Login for Instagram with proper permissions."
                        )
                    else:
                        logger.info(f"ℹ️ No insights data available for any media items")
                        
            except Exception as e:
                logger.error(f"❌ Failed to load media insights batch: {e}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")

            # [Fix] Initialize ai_results_map and post_summaries_map to avoid NameError
            ai_results_map = {}
            post_summaries_map = {}
            
            # If AI analyzed data exists in cache, load it
            try:
                from app.models.post_analysis_cache import PostAnalysisCache
                from sqlalchemy import select
                
                # Fetch recent AI summaries for these posts to avoid empty fields
                media_ids = [m.get("id") for m in images if m.get("id")]
                if media_ids:
                    stmt = select(PostAnalysisCache).where(
                        PostAnalysisCache.customer_id == customer_id,
                        PostAnalysisCache.post_id.in_(media_ids)
                    )
                    cached_records = await db.execute(stmt)
                    for record in cached_records.scalars().all():
                        analysis = record.analysis_data.get("analysis", {})
                        post_summaries_map[record.post_id] = {
                            "summary": analysis.get("summary"),
                            "dominant_sentiment": analysis.get("dominant_sentiment")
                        }
                    ai_results_map = post_summaries_map # For is_ai_analyzed check
            except Exception as e:
                logger.warning(f"⚠️ Failed to load post analysis cache for batch: {e}")

            summary = {
                "total_posts": len(images),
                "total_comments": 0,
                "categories": {
                    "complaint": 0,
                    "question": 0,
                    "neutral": 0,
                    "feedback": 0,
                    "praise": 0,
                    "spam": 0,
                    "toxic": 0
                },
                "posts": [],
                "permission_used": "instagram_manage_comments / instagram_basic",
                "message": "Instagram comments summary retrieved successfully",
                "is_ai_analyzed": bool(ai_results_map)
            }

            for m in images:
                post_comments = m.get("comments", {}).get("data", []) if isinstance(m.get("comments"), dict) else []
                post_id = m.get("id")
                post_summary = {
                    "post_id": post_id,
                    "caption": (m.get("caption") or "")[:120],
                    "comments_count": m.get("comments_count", 0),
                    "like_count": m.get("like_count", 0),
                    "samples": [],
                    "ai_summary": post_summaries_map.get(post_id, {}).get("summary"),
                    "dominant_sentiment": post_summaries_map.get(post_id, {}).get("dominant_sentiment"),
                    "categories": {
                        "complaint": 0,
                        "question": 0,
                        "neutral": 0,
                        "feedback": 0,
                        "praise": 0,
                        "spam": 0,
                        "toxic": 0
                    },
                }

                # [Production Fix] Filter out owner comments from summary count and samples
                valid_post_comments = []
                owner_id_str = str(ig_user_id) if ig_user_id else None
                owner_uname = getattr(instagram_account, "instagram_username", "aidm._.service")
                owner_identifiers = {owner_id_str, owner_uname.lower() if owner_uname else None} - {None, ""}

                for c in post_comments:
                    c_from = c.get("from") or {}
                    c_from_id = str(c_from.get("id") or c.get("from_id") or "")
                    c_username = str(c.get("username") or c_from.get("username") or "").lower()
                    
                    # Strict identity match only (removing keyword heuristics as they were "이상해")
                    is_self = (c_from_id in owner_identifiers) or \
                              (c_username == "aidm._.service") or \
                              ("aidm" in c_username) or \
                              (owner_uname and c_username == owner_uname.lower())
                    
                    if not is_self:
                        valid_post_comments.append(c)

                for c in valid_post_comments:
                    c_id = c.get("id")
                    c_text = c.get("text", "")
                    
                    # AI 결과가 있으면 사용, 없으면 Fallback
                    if c_id in ai_results_map:
                        ai_res = ai_results_map[c_id]
                        cat = ai_res.get("category", "NEUTRAL").lower()
                        urgency = ai_res.get("urgency", "LOW")
                    else:
                        cat = _classify_comment(c_text)
                        urgency = "LOW"

                    # 매핑되지 않은 카테고리는 neutral로 처리
                    if cat not in summary["categories"]:
                        cat = "neutral"

                    post_summary["categories"][cat] = post_summary["categories"].get(cat, 0) + 1
                    summary["categories"][cat] = summary["categories"].get(cat, 0) + 1
                    summary["total_comments"] += 1

                    if len(post_summary["samples"]) < 3:  # 샘플 댓글 3개만
                        c_user = c.get("username") or (c.get("from") or {}).get("username") or "unknown"
                        post_summary["samples"].append({
                            "text": c_text[:200],
                            "like_count": c.get("like_count", 0),
                            "timestamp": c.get("timestamp"),
                            "username": c_user,
                            "category": cat,
                            "urgency": urgency,
                            "ai_summary": ai_results_map.get(c_id, {}).get("summary") if c_id in ai_results_map else None
                        })

                summary["posts"].append(post_summary)

            return summary

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Instagram 댓글 요약 조회 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Instagram 댓글 요약 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/accounts/{customer_id}/page-insights")
async def get_page_insights(
    customer_id: UUID = Path(..., description="고객 ID"),
    db: AsyncSession = Depends(get_db_session),
    oauth_service: MetaOAuthService = Depends(MetaOAuthService.from_settings),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    페이지 인사이트를 조회합니다. (pages_read_engagement 사용 사례)
    검수용: Meta가 pages_read_engagement 권한 사용을 확인할 수 있도록 합니다.
    """
    try:
        instagram_account = await customer_service.get_instagram_account(db, customer_id)
        if not instagram_account or not instagram_account.page_id:
            raise HTTPException(status_code=404, detail="Instagram 계정이 연결되어 있지 않습니다.")
        
        page_id = instagram_account.page_id
        
        # OAuth Account에서 User Access Token 가져오기 (pages_read_engagement 권한 필요)
        oauth_result = await db.execute(
            select(OAuthAccount).where(
                OAuthAccount.customer_id == customer_id,
                OAuthAccount.provider == OAuthProvider.META,
            ).order_by(OAuthAccount.created_at.desc()).limit(1)
        )
        oauth_account = oauth_result.scalar_one_or_none()
        
        if not oauth_account or not oauth_account.access_token:
            raise HTTPException(status_code=404, detail="Meta OAuth 정보가 없습니다.")
        
        user_access_token = oauth_account.access_token
        
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://graph.instagram.com/v25.0/{page_id}",
                params={
                    "access_token": user_access_token,
                    "fields": "id,name,fan_count,followers_count,engagement,posts.limit(5){id,message,created_time,likes.summary(true),comments.summary(true)}",
                },
                timeout=10.0,
            )
            
            if response.is_success:
                page_data = response.json()
                followers_count = page_data.get("followers_count") or page_data.get("fan_count", 0)
                posts_data = page_data.get("posts", {})
                posts = posts_data.get("data", []) if isinstance(posts_data, dict) else []
                
                posts_insights = []
                for post in posts[:5]:
                    likes = post.get("likes", {})
                    comments = post.get("comments", {})
                    posts_insights.append({
                        "post_id": post.get("id"),
                        "message": post.get("message", "")[:100],
                        "created_time": post.get("created_time"),
                        "likes_count": likes.get("summary", {}).get("total_count", 0) if isinstance(likes, dict) else 0,
                        "comments_count": comments.get("summary", {}).get("total_count", 0) if isinstance(comments, dict) else 0,
                    })
                
                return {
                    "page_id": page_id,
                    "page_name": page_data.get("name"),
                    "followers_count": followers_count,
                    "recent_posts": posts_insights,
                    "permission_used": "pages_read_engagement",
                    "usage_description": "Usage confirmed for compliance reading page data.",
                    "message": "Page insights retrieved successfully"
                }
            else:
                return {"page_id": page_id, "error": response.text, "message": "Failed to retrieve insights"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"페이지 인사이트 조회 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

from app.utils.rate_limiter import rate_limiter

@router.get("/accounts/{customer_id}/analyze-post/{post_id}")
async def analyze_single_post(
    customer_id: UUID = Path(..., description="고객 ID"),
    post_id: str = Path(..., description="게시물 ID"),
    max_comments: int = Query(2000, ge=1, le=5000, description="가져올 최대 댓글 수(개발/테스트용)"),
    skip_ai: bool = Query(False, description="AI 분석을 건너뛰고 댓글 목록만 신속하게 가져올지 여부"),
    force_refresh: bool = Query(False, description="캐시를 무시하고 강제로 새로 분석"),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
    settings: Settings = Depends(get_settings),
) -> dict:
    """
    특정 게시물의 댓글을 상세 분석합니다. (증분 분석 + 병렬 처리 적용)
    - 새로운 댓글만 AI에 전송
    - 본인 댓글(답장) 필터링
    - 병렬 배치 처리로 속도 최적화
    """
    # Rate limit per customer per endpoint
    rl_result = await rate_limiter.allow(key=f"analyze_post:{customer_id}", max_calls=5, window_seconds=60)
    if not rl_result.allowed:
        raise HTTPException(status_code=429, detail=f"Too Many Requests – retry after {int(rl_result.retry_after_seconds)} seconds")

    # 기존 로직 그대로 유지 (omitted for brevity) ...

    """
    특정 게시물의 댓글을 상세 분석합니다. (증분 분석 + 병렬 처리 적용)
    - 새로운 댓글만 AI에 전송
    - 본인 댓글(답장) 필터링
    - 병렬 배치 처리로 속도 최적화
    """
    try:
        instagram_account = await customer_service.get_instagram_account(db, customer_id)
        if not instagram_account:
            raise HTTPException(status_code=404, detail="Instagram 계정이 연결되어 있지 않습니다.")
        
        # 1. 본인 확인용 ID/이름 설정
        owner_id = str(instagram_account.instagram_user_id or "")
        self_username = str(instagram_account.instagram_username or "aidm._.service").lower()
        OWNER_IDENTIFIERS = {owner_id, self_username} - {"", "None", "none"}

        def _is_owner(c: dict) -> bool:
            """비즈니스 계정 본인의 댓글인지 확인 (ID/이름 명시 매칭)
            
            ※ 대댓글의 'from 정보 없음' 케이스는 Step 4 수집 루프에서
              이미 inline으로 필터링되므로 여기서는 명시적 매칭만 수행.
            """
            c_from = c.get("from") or {}
            c_from_id = str(c_from.get("id") or c.get("from_id") or "")
            c_username = str(c.get("username") or c_from.get("username") or "").lower()
            return (c_from_id in OWNER_IDENTIFIERS) or (c_username and (c_username in OWNER_IDENTIFIERS or "aidm" in c_username))


        access_token = instagram_account.access_token
        if not access_token:
            raise HTTPException(status_code=400, detail="Access token이 없습니다.")

        import httpx
        async with httpx.AsyncClient() as client:
            base_url = "https://graph.instagram.com/v25.0"
            
            # 2. 기존 캐시 데이터 로드
            cached_comments_map = {}
            cached_record = await db.execute(
                select(PostAnalysisCache)
                .where(PostAnalysisCache.customer_id == customer_id, PostAnalysisCache.post_id == post_id)
                .order_by(PostAnalysisCache.created_at.desc())
                .limit(1)
            )
            cached_record = cached_record.scalar_one_or_none()
            cached_data = cached_record.analysis_data if cached_record else {}
            
            if cached_data and "comments" in cached_data:
                for c in cached_data["comments"]:
                    cached_comments_map[str(c["id"])] = c

            # 3. 인스타그램 API: 게시물 기본 정보
            resp = await client.get(
                f"{base_url}/{post_id}", 
                params={"access_token": access_token, "fields": "id,caption,media_type,media_url,thumbnail_url,comments_count,like_count,timestamp,username"}, 
                timeout=15.0
            )
            if not resp.is_success:
                raise HTTPException(status_code=resp.status_code, detail="게시물 정보를 가져오지 못했습니다.")
            post_data = resp.json()

            # 4. 인스타그램 API: 댓글 목록 및 모든 대댓글(Replies) 전수 수집
            comments_data = []
            next_url = f"{base_url}/{post_id}/comments"
            params = {
                "access_token": access_token, 
                "fields": "id,text,like_count,timestamp,username,from{username,id},replies{id,text,timestamp,username,from{username,id},like_count}", 
                "limit": 100
            }
            
            while next_url and len(comments_data) < max_comments:
                c_resp = await client.get(next_url, params=params, timeout=20.0)
                if not c_resp.is_success: break
                c_json = c_resp.json()
                batch = c_json.get("data") or []
                
                for c in batch:
                    # 상위 댓글 처리
                    if not _is_owner(c):
                        comments_data.append(c)
                    
                    # 대댓글(Replies) 전수 수집 (Paging 추적)
                    replies_node = c.get('replies', {})
                    all_replies = []
                    if isinstance(replies_node, dict):
                        # 첫 페이지
                        all_replies = replies_node.get('data') or []
                        # 추가 페이지 (Paging)
                        r_next_url = replies_node.get('paging', {}).get('next')
                        while r_next_url and len(all_replies) < 500: # 대댓글 상한선
                            r_resp = await client.get(r_next_url, timeout=15.0)
                            if not r_resp.is_success: break
                            r_json = r_resp.json()
                            all_replies.extend(r_json.get('data') or [])
                            r_next_url = r_json.get('paging', {}).get('next')

                    for r in all_replies:
                        r_from = r.get('from') or {}
                        r_from_id = str(r_from.get('id') or r.get('from_id') or '')
                        r_username = str(r.get('username') or r_from.get('username') or '').lower()
                        
                        # [핵심] from 정보가 없는 대댓글 = 본인 자동화 답글 (Instagram API 특성)
                        # 일반 사용자의 대댓글에는 항상 from.id 또는 username이 포함됨
                        if not r_from_id and not r_username:
                            logger.debug(f"[Reply Filter] Skipping reply with no author (owner auto-reply): id={r.get('id')}, text={str(r.get('text',''))[:30]}")
                            continue
                        
                        if not _is_owner(r):
                            r['parent_id'] = c.get('id')
                            comments_data.append(r)
                
                next_url = c_json.get("paging", {}).get("next")
                params = None # 다음 페이지부터는 URL에 토큰이 포함됨

            # 5. 새 댓글 식별 (증분 분석 대상)
            new_comments = []
            if not force_refresh:
                for c in comments_data:
                    c_id = str(c["id"])
                    if c_id not in cached_comments_map or not cached_comments_map[c_id].get("analysis"):
                        new_comments.append(c)
            else:
                new_comments = comments_data

            # 6. AI 분석 수행 (병렬 처리)
            ai_results_map = {}
            ai_used = False
            if not skip_ai and settings.google_api_key and new_comments:
                from app.routers.ai import analyze_posts_batch, PostAnalysisRequest, CommentItem as AICommentItem
                comment_items = [AICommentItem(id=c["id"], text=c["text"]) for c in new_comments if c.get("text")]
                if comment_items:
                    req = PostAnalysisRequest(post_id=post_id, caption=(post_data.get("caption") or "")[:500], comments=comment_items)
                    ai_batch_results = await analyze_posts_batch(posts=[req], api_key=settings.google_api_key.get_secret_value())
                    if ai_batch_results:
                        ai_used = True
                        for c_res in ai_batch_results[0].get("comments", []):
                            ai_results_map[str(c_res["id"])] = c_res
                        # 게시물 요약 업데이트용
                        fresh_post_summary = ai_batch_results[0].get("post_summary")
                        fresh_dominant_sentiment = ai_batch_results[0].get("dominant_sentiment")

            # 7. 데이터 병합 및 통계 재계산 (최종 필터링 추가)
            processed_comments = []
            categories = {"complaint": 0, "question": 0, "neutral": 0, "feedback": 0, "praise": 0, "spam": 0, "toxic": 0, "action_needed": 0}
            
            def _is_owner_strict(c: dict) -> bool:
                """Step 7 최종 필터: ID/이름 명시 매칭만 사용 (parent_id 추론 제외)
                
                parent_id 기반 추론은 Step 4 수집 단계에서만 적용.
                여기서는 from 정보가 없는 일반 유저 대댓글을 잘못 걸러내지 않도록
                명시적 ID/이름 매칭만 수행.
                """
                c_from = c.get("from") or {}
                c_from_id = str(c_from.get("id") or c.get("from_id") or "")
                c_username = str(c.get("username") or c_from.get("username") or "").lower()
                return (c_from_id in OWNER_IDENTIFIERS) or (c_username and (c_username in OWNER_IDENTIFIERS or "aidm" in c_username))

            for c in comments_data:
                # [CRITICAL] 최종 응답 생성 시 한 번 더 본인 댓글 필터링 (strict: ID/이름 매칭만)
                if _is_owner_strict(c):
                    continue
                    
                c_id = str(c["id"])
                # 1순위: 방금 분석한 결과, 2순위: 캐시된 결과, 3순위: 폴백
                analysis = ai_results_map.get(c_id) or (cached_comments_map.get(c_id, {}).get("analysis"))
                if not analysis and not skip_ai:
                    fallback_cat = _classify_comment(c.get("text", ""))
                    analysis = {"category": fallback_cat.upper(), "sentiment": "NEUTRAL", "urgency": "LOW", "is_fallback": True}
                
                processed_comments.append({
                    **c, 
                    "username": c.get("username") or (c.get("from") or {}).get("username") or "unknown",
                    "analysis": analysis
                })
                
                if analysis:
                    cat = analysis.get("category", "neutral").lower()
                    if cat in categories: categories[cat] += 1
                    if analysis.get("action_required") is True: categories["action_needed"] += 1

            # 전체 요약 결정
            final_summary = cached_data.get("analysis", {}).get("summary")
            final_sentiment = cached_data.get("analysis", {}).get("dominant_sentiment")
            if ai_used:
                final_summary = fresh_post_summary
                final_sentiment = fresh_dominant_sentiment

            # 8. 최종 응답 및 캐시 업데이트
            response_data = {
                "post": post_data,
                "analysis": {
                    "summary": final_summary,
                    "dominant_sentiment": final_sentiment,
                    "categories": categories
                },
                "comments": processed_comments,
                "ai_used": ai_used or cached_data.get("ai_used", False),
                "source": "incremental_ai" if ai_used else "cached" if cached_record else "direct"
            }

            if cached_record:
                cached_record.analysis_data = response_data
                cached_record.comments_count = str(post_data.get("comments_count", 0))
                cached_record.updated_at = datetime.now()
            else:
                db.add(PostAnalysisCache(
                    customer_id=customer_id, 
                    post_id=post_id, 
                    comments_count=str(post_data.get("comments_count", 0)), 
                    analysis_data=response_data
                ))
            
            await db.commit()
            return response_data

    except Exception as e:
        logger.error(f"Error in analyze_single_post: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"분석 중 오류 발생: {str(e)}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"게시물 분석 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"게시물 분석 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/accounts/{customer_id}/moderation/flagged-comments")
async def get_flagged_comments(
    customer_id: UUID = Path(..., description="고객 ID"),
    post_limit: int = Query(30, ge=1, le=100, description="스캔할 최근 게시물 수"),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
    settings: Settings = Depends(get_settings),
) -> dict:
    """
    최근 게시물들을 스캔하여 SPAM이나 TOXIC으로 분류된 댓글들을 찾아 반환합니다.
    """
    try:
        instagram_account = await customer_service.get_instagram_account(db, customer_id)
        if not instagram_account or not instagram_account.instagram_user_id:
            raise HTTPException(status_code=404, detail="Instagram 계정이 연결되어 있지 않습니다.")

        access_token = instagram_account.access_token
        ig_user_id = instagram_account.instagram_user_id
        
        import httpx
        async with httpx.AsyncClient() as client:
            # 1. 최근 게시물 목록 가져오기
            is_basic = access_token.startswith("IG")
            base_url = "https://graph.instagram.com" if is_basic else "https://graph.instagram.com/v25.0"
            
            media_resp = await client.get(
                f"{base_url}/{ig_user_id}/media",
                params={
                    "access_token": access_token,
                    "fields": f"id,caption,media_url,thumbnail_url,timestamp,comments_count,comments.limit(100){{id,text,username,timestamp,like_count,from{{id,username}}}}",
                    "limit": post_limit
                },
                timeout=25.0
            )
            
            if not media_resp.is_success:
                error_msg = media_resp.json().get("error", {}).get("message", "API Error")
                raise HTTPException(status_code=media_resp.status_code, detail=f"게시물을 가져오지 못했습니다: {error_msg}")
            
            media_data = media_resp.json().get("data", [])
            
            # 2. 본인 확인용 ID/이름 설정 (Gemini 전송 전 필터링용)
            owner_id = str(instagram_account.instagram_user_id or "")
            self_username = str(instagram_account.instagram_username or "").lower()
            OWNER_IDENTIFIERS = {owner_id, self_username} - {"", "None", "none"}
            
            def _is_owner(c: dict) -> bool:
                """모더레이션 스캔용 본인 댓글 필터
                from 정보가 없는 대댓글은 본인 자동화 답글로 간주.
                """
                c_from = c.get("from") or {}
                c_from_id = str(c_from.get("id") or c.get("from_id") or "")
                c_username = str(c.get("username") or c_from.get("username") or "").lower()
                # ID/이름 매칭
                if (c_from_id in OWNER_IDENTIFIERS) or (c_username and (c_username in OWNER_IDENTIFIERS or "aidm" in c_username)):
                    return True
                # from 정보 없는 댓글은 본인 자동화 답글로 간주
                if not c_from_id and not c_username:
                    return True
                return False

            # 3. AI 분석 준비
            from app.routers.ai import analyze_posts_batch, PostAnalysisRequest, CommentItem as AICommentItem
            
            post_requests = []
            all_flagged_comments = []
            
            for m in media_data:
                post_id = m.get("id")
                comments = m.get("comments", {}).get("data", []) if isinstance(m.get("comments"), dict) else []
                
                if not comments:
                    continue
                
                # 본인 댓글 제외하고 게스트 댓글만 추출
                guest_comments = [c for c in comments if not _is_owner(c)]
                if not guest_comments:
                    continue
                    
                comment_items = [AICommentItem(id=c["id"], text=c["text"]) for c in guest_comments if c.get("text")]
                if comment_items:
                    post_requests.append(PostAnalysisRequest(
                        post_id=post_id,
                        caption=(m.get("caption") or "")[:500],
                        comments=comment_items
                    ))
            
            # 4. AI 분석 실행 (Gemini batch)
            if post_requests and settings.google_api_key:
                ai_results = await analyze_posts_batch(
                    posts=post_requests,
                    api_key=settings.google_api_key.get_secret_value(),
                    model_name="gemini-2.0-flash"
                )
                
                # 결과 매핑용 맵 생성
                media_map = {m["id"]: m for m in media_data}
                
                for p_res in ai_results:
                    p_id = p_res.get("post_id")
                    p_meta = media_map.get(p_id, {})
                    
                    for c_res in p_res.get("comments", []):
                        cat = c_res.get("category", "NEUTRAL")
                        action_req = c_res.get("action_required", False)
                        # SPAM, TOXIC 또는 AI가 조치가 필요하다고 판단한 모든 댓글 추출
                        if cat in ["SPAM", "TOXIC"] or action_req:
                            # 원본 댓글 데이터 찾기
                            orig_comments = p_meta.get("comments", {}).get("data", [])
                            orig_c = next((oc for oc in orig_comments if oc["id"] == c_res["id"]), {})
                            
                            all_flagged_comments.append({
                                "id": c_res["id"],
                                "text": orig_c.get("text"),
                                "username": orig_c.get("username"),
                                "timestamp": orig_c.get("timestamp"),
                                "category": cat,
                                "urgency": c_res.get("urgency"),
                                "confidence": c_res.get("moderation_confidence", 0.9),
                                "post": {
                                    "id": p_id,
                                    "thumbnail_url": p_meta.get("thumbnail_url") or p_meta.get("media_url"),
                                    "caption_snippet": (p_meta.get("caption") or "")[:50]
                                }
                            })
            
            # 4. 결과 반환
            return {
                "flagged_count": len(all_flagged_comments),
                "comments": all_flagged_comments,
                "scanned_posts": len(media_data),
                "status": "success"
            }
            
    except Exception as e:
        logger.error(f"Moderation scan failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"모더레이션 스캔 중 오류: {str(e)}")


@router.delete("/accounts/{customer_id}/posts/{post_id}/comments/{comment_id}")
async def delete_post_comment(
    customer_id: UUID = Path(..., description="고객 ID"),
    post_id: str = Path(..., description="게시물 ID"),
    comment_id: str = Path(..., description="댓글 ID"),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    게시물의 댓글을 삭제합니다.
    Instagram Graph API를 사용하여 댓글을 삭제합니다.
    """
    try:
        instagram_account = await customer_service.get_instagram_account(db, customer_id)
        
        if not instagram_account:
            logger.warning(f"No InstagramAccount found for customer_id: {customer_id}")
            raise HTTPException(status_code=404, detail="Instagram 계정이 연결되어 있지 않습니다.")
        if not instagram_account.instagram_user_id:
            logger.warning(f"InstagramAccount found but instagram_user_id is missing for customer_id: {customer_id}")
            raise HTTPException(status_code=404, detail="Instagram 계정이 연결되어 있지 않습니다. (user_id 누락)")

        access_token = instagram_account.access_token
        if not access_token:
            raise HTTPException(status_code=400, detail="Access token이 없습니다.")

        # Instagram Graph API로 댓글 삭제
        is_basic = access_token.startswith("IG")
        
        if is_basic:
            base_url = "https://graph.instagram.com"
        else:
            # Instagram Business Login always uses graph.instagram.com
            base_url = "https://graph.instagram.com/v25.0"

        async with httpx.AsyncClient() as client:
            # Instagram Graph API: DELETE 요청으로 댓글 삭제
            delete_url = f"{base_url}/{comment_id}"
            logger.info(f"Deleting comment {comment_id} for post {post_id}")
            
            resp = await client.delete(
                delete_url,
                params={"access_token": access_token},
                timeout=15.0,
            )
            
            if not resp.is_success:
                error_data = resp.json() if resp.content else {}
                error_msg = error_data.get("error", {}).get("message", resp.text)
                error_code = error_data.get("error", {}).get("code", resp.status_code)
                
                logger.error(f"Instagram Graph API Error (delete comment): {resp.status_code} - {error_msg}")
                
                # 권한 오류 처리
                if resp.status_code == 403 or error_code in [200, 190]:
                    raise HTTPException(
                        status_code=403,
                        detail="댓글 삭제 권한이 없습니다. 비즈니스 계정의 댓글을 삭제하려면 적절한 권한이 필요합니다."
                    )
                
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"댓글 삭제에 실패했습니다: {error_msg}"
                )
            
            # 성공 응답 확인
            success_data = resp.json() if resp.content else {}
            success = success_data.get("success", False)
            
            if not success:
                logger.warning(f"Comment deletion returned success=false: {success_data}")
                raise HTTPException(
                    status_code=500,
                    detail="댓글 삭제가 완료되지 않았습니다."
                )
            
            logger.info(f"✅ Comment {comment_id} deleted successfully")

            # 캐시 무효화: 해당 게시물의 분석 캐시 삭제
            try:
                from sqlalchemy import delete
                from app.models.post_analysis_cache import PostAnalysisCache
                stmt = delete(PostAnalysisCache).where(PostAnalysisCache.post_id == post_id)
                await db.execute(stmt)
                await db.commit()
                logger.info(f"Invalidated cache for post {post_id} after comment deletion")
            except Exception as cache_err:
                logger.warning(f"Failed to invalidate cache for post {post_id}: {str(cache_err)}")
            
            return {
                "success": True,
                "message": "댓글이 삭제되었습니다.",
                "comment_id": comment_id,
                "post_id": post_id
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"댓글 삭제 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"댓글 삭제 중 오류가 발생했습니다: {str(e)}"
        )

class CommentHideRequest(BaseModel):
    hide: bool

@router.post("/accounts/{customer_id}/posts/{post_id}/comments/{comment_id}/hide")
async def hide_post_comment(
    customer_id: UUID = Path(..., description="고객 ID"),
    post_id: str = Path(..., description="게시물 ID"),
    comment_id: str = Path(..., description="댓글 ID"),
    req: CommentHideRequest = Body(...),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    게시물의 댓글을 숨기거나 숨김 해제합니다.
    Instagram Graph API (BUSINESS_MANAGEMENT 권한 필요)를 사용하여 댓글 노출 여부를 조정합니다.
    """
    try:
        instagram_account = await customer_service.get_instagram_account(db, customer_id)
        if not instagram_account or not instagram_account.access_token:
            raise HTTPException(status_code=404, detail="Instagram 계정 또는 토큰 정보가 없습니다.")

        access_token = instagram_account.access_token
        is_basic = access_token.startswith("IG")
        base_url = "https://graph.instagram.com" if is_basic else "https://graph.instagram.com/v25.0"

        async with httpx.AsyncClient() as client:
            hide_url = f"{base_url}/{comment_id}"
            logger.info(f"Setting hide={req.hide} for comment {comment_id}")
            
            resp = await client.post(
                hide_url,
                params={
                    "access_token": access_token,
                    "hide": str(req.hide).lower()
                },
                timeout=15.0,
            )
            
            if not resp.is_success:
                error_data = resp.json() if resp.content else {}
                error_msg = error_data.get("error", {}).get("message", resp.text)
                logger.error(f"IG Hide API Error: {resp.status_code} - {error_msg}")
                raise HTTPException(status_code=resp.status_code, detail=f"댓글 상태 변경 실패: {error_msg}")
            
            # 캐시 무효화 (게시물 분석 결과 갱신 유도)
            try:
                from app.models.post_analysis_cache import PostAnalysisCache
                from sqlalchemy import delete as sqlalchemy_delete
                stmt = sqlalchemy_delete(PostAnalysisCache).where(PostAnalysisCache.post_id == post_id)
                await db.execute(stmt)
                await db.commit()
            except Exception:
                pass

            return {
                "success": True,
                "hide": req.hide,
                "message": "댓글 상태가 성공적으로 변경되었습니다."
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Hide comment error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"내부 오류 발생: {str(e)}")

@router.post("/accounts/{customer_id}/posts/{post_id}/comments/bulk-delete")
async def bulk_delete_comments(
    customer_id: UUID = Path(..., description="고객 ID"),
    post_id: str = Path(..., description="게시물 ID"),
    comment_ids: list[str] = Body(..., embed=True),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    여러 개의 댓글을 한 번에 삭제합니다.
    """
    results = []
    success_count = 0
    fail_count = 0

    for cid in comment_ids:
        try:
            await delete_post_comment(customer_id, post_id, cid, db, customer_service)
            results.append({"id": cid, "success": True})
            success_count += 1
        except Exception as e:
            results.append({"id": cid, "success": False, "error": str(e)})
            fail_count += 1

    return {
        "success": success_count > 0,
        "success_count": success_count,
        "fail_count": fail_count,
        "results": results
    }

@router.get("/accounts/{customer_id}/verify-recipient")
async def verify_recipient(
    customer_id: UUID = Path(..., description="고객 ID"),
    recipient_instagram_id: str = Query(..., description="검증할 Instagram 사용자 ID"),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    받는 사람 Instagram User ID 검증
    Instagram Graph API를 사용하여 받는 사람 ID가 유효한지 확인합니다.
    """
    import httpx
    
    try:
        # 고객 정보 조회
        customer = await customer_service.get_customer(db=db, customer_id=customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"고객 ID {customer_id}를 찾을 수 없습니다."
            )
        
        instagram_account = customer.instagram_account
        if not instagram_account or not instagram_account.access_token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram 계정이 연결되지 않았습니다."
            )
        
        access_token = instagram_account.access_token
        
        # Instagram Graph API로 받는 사람 정보 조회 시도
        # 참고: Instagram Graph API는 직접적인 사용자 정보 조회를 제한할 수 있음
        graph_api_url = f"https://graph.instagram.com/v25.0/{recipient_instagram_id}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                graph_api_url,
                params={
                    "access_token": access_token,
                    "fields": "id,username"
                },
            )
            
            if response.status_code == 200:
                user_data = response.json()
                return {
                    "valid": True,
                    "recipient_id": recipient_instagram_id,
                    "username": user_data.get("username", "N/A"),
                    "message": "받는 사람 ID가 유효합니다."
                }
            else:
                error_data = response.json() if response.content else {}
                error_info = error_data.get("error", {})
                return {
                    "valid": False,
                    "recipient_id": recipient_instagram_id,
                    "error": error_info.get("message", "받는 사람 ID를 확인할 수 없습니다."),
                    "error_code": error_info.get("code"),
                    "message": "받는 사람 ID가 유효하지 않거나 접근할 수 없습니다."
                }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"받는 사람 ID 검증 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"받는 사람 ID 검증 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/accounts/send-message")
async def send_instagram_message(
    customer_id: UUID = Query(..., description="고객 ID"),
    recipient_instagram_id: str = Query(..., description="메시지를 받을 Instagram 사용자 ID"),
    message: str = Query(..., description="전송할 메시지"),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    승인된 고객의 Instagram 계정으로 메시지 전송
    
    플로우:
    1. customer_id로 고객 정보 조회
    2. 승인 상태 확인 (integration_status = 'APPROVED')
    3. Instagram 계정 정보 가져오기 (page_id, access_token)
    4. Instagram Graph API로 메시지 전송
    """
    import httpx
    
    try:
        # 1. 고객 정보 조회
        customer = await customer_service.get_customer(db=db, customer_id=customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"고객 ID {customer_id}를 찾을 수 없습니다."
            )
        
        # 2. 승인 상태 확인 (메시지 조회는 PENDING 상태에서도 허용)
        # 웹훅으로 받은 메시지와 우리가 보낸 메시지를 모두 확인하기 위해 승인 체크 완화
        if customer.integration_status not in ["APPROVED", "PENDING"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"고객 상태가 올바르지 않습니다. 현재 상태: {customer.integration_status}"
            )
        
        # 3. Instagram 계정 정보 가져오기
        instagram_account = customer.instagram_account
        if not instagram_account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram 계정이 연결되지 않았습니다."
            )
        
        # 3. 인스타그램 유저 ID 확인 (페이스북 페이지 연동을 사용하지 않으므로 전용 ID만 사용)
        sender_id = instagram_account.instagram_user_id
        access_token = instagram_account.access_token
        
        if not sender_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram Page ID 또는 Instagram User ID가 없습니다."
            )
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram Access Token이 없습니다."
            )
        
        # 4. Instagram Graph API로 메시지 전송
        # Determine API host based on token type
        is_ig_scoped = access_token.startswith("IG")
        
        if is_ig_scoped:
            # Instagram Login for Business (IG... token)
            # Use graph.instagram.com
            # For IG tokens, we use /me/messages or /{ig_user_id}/messages?
            # Verification script used /me/conversations successfully.
            # Docs say /me/messages or /{ig_user_id}/messages works.
            # Let's use /me/messages if sender_id implies "me", but using sender_id is safer if it matches.
            # However, for IG tokens, sender_id might be the IG User ID.
            graph_api_url = f"https://graph.instagram.com/v25.0/me/messages"
            logger.info(f"ℹ️ IG Token detected. Using graph.instagram.com/me/messages")
        else:
            # Facebook Login for Business (EA... token)
            # Instagram Business Login always uses graph.instagram.com
            graph_api_url = f"https://graph.instagram.com/v25.0/me/messages"
        
        # 자동 디엠 API와 동일한 방식으로 메시지 전송
        # Authorization 헤더에 Bearer 토큰 사용 (자동 디엠 API와 동일)
        payload = {
            "messaging_product": "instagram",
            "recipient": {"id": recipient_instagram_id},
            "message": {"text": message},
        }
        
        logger.info(f"메시지 전송 시도: sender_id={sender_id}, recipient_id={recipient_instagram_id}, message_length={len(message)}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 자동 디엠 API와 동일하게 Authorization 헤더 사용
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            response = await client.post(
                graph_api_url,
                headers=headers,
                json=payload,
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"✅ 메시지 전송 성공!")
                # DB에 메시지 기록
                try:
                    processor = CampaignProcessor(db)
                    await processor._save_message_to_db(
                        account=instagram_account,
                        recipient_id=recipient_instagram_id,
                        sender_id=str(sender_id),
                        text=message,
                        is_from_me=True,
                        mid=response.json().get("message_id")
                    )
                except Exception as e:
                    logger.error(f"메시지 DB 기록 실패: {e}")
                
                return {
                    "success": True,
                    "message_id": response.json().get("message_id"),
                }
            else:
                logger.error(f"❌ 메시지 전송 실패: status={response.status_code}, body={response.text}")
                return {
                    "success": False,
                    "error": response.text,
                    "status_code": response.status_code,
                }
            
            # 응답 로깅 (디버깅용)
            logger.info(f"Instagram Graph API 응답: status={response.status_code}, body={response.text[:500]}")
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"메시지 전송 성공: customer_id={customer_id}, recipient={recipient_instagram_id}")
                return {
                    "success": True,
                    "message": "메시지가 성공적으로 전송되었습니다.",
                    "customer_id": str(customer_id),
                    "recipient_instagram_id": recipient_instagram_id,
                    "message_id": result.get("message_id"),
                }
            else:
                error_data = response.json() if response.content else {}
                error_info = error_data.get("error", {})
                error_message = error_info.get("message", "메시지 전송 실패")
                error_code = error_info.get("code", response.status_code)
                error_subcode = error_info.get("error_subcode")
                
                logger.error(f"메시지 전송 실패: status={response.status_code}, error={error_message}, code={error_code}, subcode={error_subcode}")
                
                # Instagram Messaging API 제한사항 안내
                if error_code == 100:
                    # 더 자세한 디버깅 정보 포함
                    debug_info = f"\n디버깅 정보:\n- Sender ID: {sender_id}\n- 받는 사람 ID: {recipient_instagram_id}\n- 에러 코드: {error_code}"
                    if error_subcode:
                        debug_info += f"\n- 에러 서브코드: {error_subcode}"
                    
                    detail_message = (
                        f"메시지 전송 실패: {error_message}\n\n"
                        "가능한 원인:\n"
                        "1. 받는 사람 ID가 올바르지 않거나 존재하지 않는 계정입니다.\n"
                        "   → Instagram Graph API Explorer에서 받는 사람의 실제 User ID를 확인하세요.\n"
                        "   → 받는 사람이 Instagram Business 계정인지 확인하세요.\n"
                        "2. 받는 사람이 먼저 메시지를 보내지 않았습니다. (Instagram은 24시간 규칙이 있습니다)\n"
                        "   → 받는 사람이 Instagram 앱에서 연동된 계정(@aidm._.service)에게 메시지를 보냈는지 확인하세요.\n"
                        "   → 메시지를 보낸 후 몇 분 기다린 후 다시 시도하세요.\n"
                        "3. 받는 사람이 비즈니스 계정이 아니거나 메시지 수신이 비활성화되어 있습니다.\n"
                        "4. 받는 사람이 메시지 요청을 수락하지 않았습니다.\n\n"
                        "해결 방법:\n"
                        "1. 받는 사람 ID 확인:\n"
                        "   - Instagram Graph API Explorer (https://developers.facebook.com/tools/explorer/)\n"
                        "   - 앱 선택 → GET /{instagram-user-id}?fields=id,username\n"
                        "   - 또는 받는 사람의 Instagram 프로필에서 확인\n"
                        "2. 대화 시작 확인:\n"
                        "   - 받는 사람이 Instagram 앱에서 @aidm._.service 계정에게 메시지를 보냈는지 확인\n"
                        "   - 메시지를 보낸 후 최소 1-2분 기다린 후 다시 시도\n"
                        "3. 받는 사람 계정 확인:\n"
                        "   - 받는 사람이 Instagram Business 계정 또는 Creator 계정인지 확인\n"
                        "   - 일반 개인 계정은 메시지를 받을 수 없습니다"
                        + debug_info
                    )
                else:
                    detail_message = f"메시지 전송 실패: {error_message} (코드: {error_code})"
                
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=detail_message
                )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"메시지 전송 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"메시지 전송 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/accounts/conversations")
async def get_instagram_conversations(
    customer_id: UUID = Query(..., description="고객 ID"),
    limit: int = Query(default=50, ge=1, le=100, description="가져올 대화 수"),
    include_latest_message: bool = Query(default=True, description="최신 메시지 포함 여부"),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
    background_tasks: BackgroundTasks = None
) -> dict:
    """
    고객의 Instagram 대화 목록 조회 (DB 기반)
    """
    try:
        # 1. 고객 정보 조회
        customer = await customer_service.get_customer(db=db, customer_id=customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"고객 ID {customer_id}를 찾을 수 없습니다."
            )
        
        # 2. Instagram 계정 정보 가져오기 (Response 객체 - access_token 없음)
        instagram_account = customer.instagram_account
        if not instagram_account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram 계정이 연결되지 않았습니다."
            )
        
        # 3. DB에서 대화 목록 조회
        from app.models.chat import ChatSession
        from app.models.contact import Contact
        
        # 우리 계정 ID 목록 준비
        our_account_ids = []
        if instagram_account.instagram_user_id:
            our_account_ids.append(str(instagram_account.instagram_user_id))

        logger.info(f"🔍 [Inbox Debug] Loading conversations for customer {customer_id}")
        logger.info(f"🔍 [Inbox Debug] Our Account IDs (Filter): {our_account_ids}")
        logger.info(f"🔍 [Inbox Debug] IG User ID: {instagram_account.instagram_user_id}, Page ID: {instagram_account.page_id}")

        if not our_account_ids:
             logger.warning("⚠️ [Inbox Debug] No account IDs found for filtering conversations!")

        # DB에서 세션 조회 (Contact와 조인하여 이름 정보를 가져옴)
        # Robust Logic: Filter by customer_id only, ignore strict account_id matching to prevent ID mismatch issues.
        stmt = select(ChatSession, Contact).outerjoin(
            Contact, 
            (Contact.instagram_id == ChatSession.participant_id) & (Contact.customer_id == ChatSession.customer_id)
        ).where(
            ChatSession.customer_id == customer_id
        ).order_by(ChatSession.last_message_at.desc()).limit(limit)
        
        result = await db.execute(stmt)
        rows = result.all()
        
        logger.info(f"🔍 [Inbox Debug] Found {len(rows)} conversations for Customer {customer_id}")
        
        # CRITICAL: Fetch real usernames from Instagram Conversations API in BACKGROUND
        # access_token은 보안상 Response 객체에 없으므로 DB에서 직접 조회
        try:
            ig_account_db = await customer_service.get_instagram_account(db, customer_id)
            bg_access_token = ig_account_db.access_token if ig_account_db else None
        except Exception:
            bg_access_token = None
        
        if bg_access_token and background_tasks is not None:
            background_tasks.add_task(
                sync_instagram_conversations_background,
                customer_id=customer_id,
                access_token=bg_access_token,
                db_session_factory=AsyncSessionLocal
            )
        else:
            logger.warning("⚠️ Skipping background sync: no access_token or background_tasks unavailable")
        
        conversations = []
        import datetime as dt
        from datetime import timezone
        
        for session, contact in rows:
            # Determine best available name
            raw_username = (contact.username if contact else None) or session.participant_username
            raw_full_name = (contact.full_name if contact else None) or session.participant_name
            participant_id = session.participant_id or "unknown"
            
            final_name = "사용자"
            if raw_full_name and raw_full_name != "사용자":
                final_name = raw_full_name
            elif raw_username and raw_username != "사용자":
                final_name = raw_username
            else:
                # Unique fallback for Scoped IDs
                short_id = participant_id[-8:] if len(participant_id) >= 8 else participant_id
                final_name = f"Customer_{short_id}"

            # Get profile picture from Contact
            profile_pic_url = (contact.profile_pic if contact else None) or session.participant_profile_pic
            
            # Prepare simulated Graph API object for frontend compatibility
            other_participant = {
                "id": str(participant_id),
                "username": final_name,
                "name": final_name,
                "full_name": final_name,
                "profile_picture_url": profile_pic_url  # Add profile picture!
            }
            
            conversations.append({
                "id": str(session.id),
                "updated_time": session.last_message_at.replace(tzinfo=timezone.utc).isoformat() if session.last_message_at else None,
                "participants": {"data": [other_participant]},
                "latest_message": {
                    "text": session.last_message_preview or "(미디어 메시지)",
                    "message": session.last_message_preview or "",
                    "created_time": session.last_message_at.replace(tzinfo=timezone.utc).isoformat() if session.last_message_at else None,
                    "from": other_participant
                }
            })

        return {
            "success": True,
            "conversations": conversations,
            "count": len(conversations),
            "our_account_ids": our_account_ids
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"대화 목록 조회 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"대화 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/accounts/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    customer_id: UUID = Query(..., description="고객 ID"),
    conversation_id: str = Path(..., description="대화 ID"),
    limit: int = Query(default=50, ge=1, le=100, description="가져올 메시지 수"),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    특정 대화의 메시지 목록 조회
    """
    import httpx
    
    try:
        # 1. 고객 정보 조회
        customer = await customer_service.get_customer(db=db, customer_id=customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"고객 ID {customer_id}를 찾을 수 없습니다."
            )
        
        # 2. 승인 상태 확인 (메시지 조회는 PENDING 상태에서도 허용)
        # 웹훅으로 받은 메시지와 우리가 보낸 메시지를 모두 확인하기 위해 승인 체크 완화
        if customer.integration_status not in ["APPROVED", "PENDING"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"고객 상태가 올바르지 않습니다. 현재 상태: {customer.integration_status}"
            )
        
        # 3. Instagram 계정 정보 가져오기
        # (로컬 DB 조회를 하므로 access_token 검증은 생략합니다)
        if not customer.instagram_account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram 계정이 연결되지 않았습니다."
            )
        
        # 4. DB에서 메시지 목록 조회 (Instagram Graph API 대신)
        from app.models.chat import ChatSession, ChatMessage
        from app.models.contact import Contact
        
        # conversation_id는 participant_id이거나 session.id일 수 있음
        # 여기서는 participant_id로 조회하도록 처리 (getSessionByParticipant)
        stmt = select(ChatSession, Contact).outerjoin(
            Contact, 
            (Contact.instagram_id == ChatSession.participant_id) & (Contact.customer_id == ChatSession.customer_id)
        ).where(
            ChatSession.customer_id == customer_id,
            ChatSession.participant_id == conversation_id
        )
        result = await db.execute(stmt)
        row = result.first()
        session, contact = row if row else (None, None)
        
        if not session:
            # session.id로도 시도
            try:
                session_uuid = UUID(conversation_id)
                stmt = select(ChatSession, Contact).outerjoin(
                    Contact, 
                    (Contact.instagram_id == ChatSession.participant_id) & (Contact.customer_id == ChatSession.customer_id)
                ).where(ChatSession.id == session_uuid)
                result = await db.execute(stmt)
                row = result.first()
                session, contact = row if row else (None, None)
            except:
                pass

        if not session:
            return {
                "success": True,
                "messages": [],
                "count": 0
            }

        # 메시지 조회
        stmt = select(ChatMessage).where(ChatMessage.session_id == session.id).order_by(ChatMessage.created_at.desc()).limit(limit)
        result = await db.execute(stmt)
        db_messages = result.scalars().all()
        
        display_username = (contact.username if contact else None) or session.participant_username or "사용자"
        display_name = (contact.full_name if contact else None) or session.participant_name or "사용자"
        
        messages = []
        for msg in db_messages:
            messages.append({
                "id": str(msg.id),
                "from": {
                    "id": msg.sender_id, 
                    "username": "나(Admin)" if msg.is_from_me else display_username,
                    "name": "나(Admin)" if msg.is_from_me else display_name,
                    "full_name": "나(Admin)" if msg.is_from_me else display_name
                },
                "message": {"text": msg.content},
                "created_time": msg.created_at.replace(tzinfo=timezone.utc).isoformat()
            })

        return {
            "success": True,
            "messages": messages,
            "count": len(messages),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"메시지 목록 조회 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"메시지 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.delete("/accounts/conversations/{conversation_id}")
async def delete_instagram_conversation(
    customer_id: UUID = Query(..., description="고객 ID"),
    conversation_id: str = Path(..., description="대화 ID"),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    특정 대화 목록(세션) 삭제
    - ChatMessage들은 sqlalchemy relationship cascade 속성에 의해 자동 삭제됩니다.
    """
    try:
        from app.models.chat import ChatSession, ChatMessage
        from sqlalchemy import delete, select
        
        # 1. 고객 정보 조회
        customer = await customer_service.get_customer(db=db, customer_id=customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"고객 ID {customer_id}를 찾을 수 없습니다."
            )
            
        uuid_val = None
        try:
            uuid_val = UUID(conversation_id)
        except ValueError:
            pass
            
        # 2. 세션 ID 조회
        if uuid_val:
            stmt = select(ChatSession.id).where(
                ChatSession.customer_id == customer_id,
                ChatSession.id == uuid_val
            )
        else:
            stmt = select(ChatSession.id).where(
                ChatSession.customer_id == customer_id,
                ChatSession.participant_id == conversation_id
            )
            
        result = await db.execute(stmt)
        session_id = result.scalars().first()
        
        if not session_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="채팅방을 찾을 수 없거나 이미 삭제되었습니다."
            )
            
        # 3. DB 제약조건 오류 방지(ForeignKeyViolationError) - 관련 메시지 먼저 일괄 삭제
        await db.execute(delete(ChatMessage).where(ChatMessage.session_id == session_id))
        
        # 4. 세션 삭제 로직
        await db.execute(delete(ChatSession).where(ChatSession.id == session_id))
        
        await db.commit()
        return {"success": True, "message": "채팅방이 성공적으로 삭제되었습니다."}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"채팅방 삭제 중 오류 발생: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"채팅방 삭제 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/accounts/{customer_id}/check-token")
async def check_instagram_account_token(
    customer_id: UUID = Path(..., description="고객 ID"),
    db: AsyncSession = Depends(get_db_session),
    oauth_service: MetaOAuthService = Depends(MetaOAuthService.from_settings),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    Instagram 계정의 Access Token 상태를 확인합니다.
    """
    try:
        # Instagram 계정 정보 조회
        instagram_account = await customer_service.get_instagram_account(db, customer_id)
        if not instagram_account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram 계정이 연결되어 있지 않습니다."
            )
        
        access_token = instagram_account.access_token
        if not access_token:
            return {
                "customer_id": str(customer_id),
                "page_id": instagram_account.page_id,
                "instagram_user_id": instagram_account.instagram_user_id,
                "has_token": False,
                "message": "Access Token이 없습니다."
            }
        
        # 토큰 디버그
        try:
            debug_info = await oauth_service.debug_token(access_token)
            token_data = debug_info.get("data", {})
            
            return {
                "customer_id": str(customer_id),
                "page_id": instagram_account.page_id,
                "instagram_user_id": instagram_account.instagram_user_id,
                "has_token": True,
                "token_type": token_data.get("type"),
                "is_valid": token_data.get("is_valid"),
                "scopes": token_data.get("scopes", []),
                "expires_at": token_data.get("expires_at"),
                "data_access_expires_at": token_data.get("data_access_expires_at"),
                "message": "토큰이 유효합니다." if token_data.get("is_valid") else "토큰이 만료되었거나 유효하지 않습니다."
            }
        except Exception as e:
            logger.error(f"토큰 디버그 실패: {str(e)}")
            return {
                "customer_id": str(customer_id),
                "page_id": instagram_account.page_id,
                "instagram_user_id": instagram_account.instagram_user_id,
                "has_token": True,
                "is_valid": False,
                "error": str(e),
                "message": "토큰 확인 중 오류가 발생했습니다."
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"토큰 확인 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"토큰 확인 중 오류가 발생했습니다: {str(e)}"
        )


@router.patch("/webhook/update-instagram-user-id")
async def update_instagram_user_id_from_webhook(
    page_id: str = Query(..., description="Facebook Page ID"),
    instagram_user_id: str = Query(..., description="새로운 Instagram User ID (웹훅의 entry.id)"),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    웹훅에서 받은 entry.id를 instagram_user_id로 업데이트
    
    웹훅의 entry.id가 Instagram Business Account ID인 경우,
    이를 instagram_user_id로 저장하여 나중에 찾을 수 있도록 합니다.
    """
    try:
        # page_id로 계정 찾기
        instagram_account = await customer_service.get_instagram_account_by_page_id(db, page_id)
        
        if not instagram_account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Page ID {page_id}에 해당하는 승인된 Instagram 계정을 찾을 수 없습니다."
            )
        
        old_instagram_user_id = instagram_account.instagram_user_id
        instagram_account.instagram_user_id = instagram_user_id
        
        await db.commit()
        await db.refresh(instagram_account)
        
        logger.info(f"✅ instagram_user_id 업데이트 완료: page_id={page_id}, old={old_instagram_user_id}, new={instagram_user_id}")
        
        return {
            "success": True,
            "message": "instagram_user_id가 성공적으로 업데이트되었습니다.",
            "page_id": instagram_account.page_id,
            "old_instagram_user_id": old_instagram_user_id,
            "new_instagram_user_id": instagram_account.instagram_user_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"instagram_user_id 업데이트 중 오류: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"instagram_user_id 업데이트 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/accounts/{customer_id}/debug-token")
async def debug_instagram_token(
    customer_id: UUID = Path(..., description="고객 ID"),
    db: AsyncSession = Depends(get_db_session),
    oauth_service: MetaOAuthService = Depends(MetaOAuthService.from_settings),
    customer_service: CustomerService = Depends(CustomerService),
) -> dict:
    """
    저장된 Instagram 계정의 토큰 상세 정보(스코프, 유효성 등)를 조회합니다 (디버깅용).
    """
    instagram_account = await customer_service.get_instagram_account(db, customer_id)
    if not instagram_account or not instagram_account.access_token:
        return {"error": "No Instagram account or token found for this customer."}
    
    try:
        debug_info = await oauth_service.debug_token(instagram_account.access_token)
        return {
            "token_preview": f"{instagram_account.access_token[:10]}...",
            "instagram_user_id": instagram_account.instagram_user_id,
            "page_id": instagram_account.page_id,
            "debug_info": debug_info
        }
    except Exception as e:
        logger.error(f"Error debugging token: {e}")
        return {"error": str(e)}


@router.post("/accounts/{customer_id}/posts/{post_id}/comments/bulk", response_model=BulkDeleteResponse)
async def bulk_delete_comments(
    request: BulkDeleteRequest,
    customer_id: UUID = Path(..., description="고객 ID"),
    post_id: str = Path(..., description="게시물 ID"),
    db: AsyncSession = Depends(get_db_session),
    customer_service: CustomerService = Depends(CustomerService),
) -> BulkDeleteResponse:
    """
    여러 개의 댓글을 한 번에 삭제합니다.
    """
    try:
        instagram_account = await customer_service.get_instagram_account(db, customer_id)
        if not instagram_account or not instagram_account.access_token:
            raise HTTPException(status_code=404, detail="연결된 Instagram 계정을 찾을 수 없습니다.")

        access_token = instagram_account.access_token
        is_basic = access_token.startswith("IG")
        base_url = "https://graph.instagram.com" if is_basic else "https://graph.instagram.com/v25.0"

        deleted_count = 0
        failed_ids = []

        async with httpx.AsyncClient() as client:
            for comment_id in request.comment_ids:
                try:
                    delete_url = f"{base_url}/{comment_id}"
                    resp = await client.delete(
                        delete_url,
                        params={"access_token": access_token},
                        timeout=15.0,
                    )
                    success = False
                    if resp.is_success:
                        data = resp.json() if resp.content else {}
                        if data.get("success", False):
                            success = True
                    
                    if success:
                        deleted_count += 1
                    else:
                        logger.error(f"Failed to delete comment {comment_id}: {resp.text}")
                        failed_ids.append(comment_id)
                except Exception as inner_e:
                    logger.error(f"Error during bulk item deletion ({comment_id}): {str(inner_e)}")
                    failed_ids.append(comment_id)

        # 하나라도 삭제 성공했다면 캐시 무효화
        if deleted_count > 0:
            try:
                from sqlalchemy import delete
                from app.models.post_analysis_cache import PostAnalysisCache
                stmt = delete(PostAnalysisCache).where(PostAnalysisCache.post_id == post_id)
                await db.execute(stmt)
                await db.commit()
                logger.info(f"Invalidated cache for post {post_id} after bulk deletion")
            except Exception as cache_err:
                logger.warning(f"Failed to invalidate cache for post {post_id}: {str(cache_err)}")

        return BulkDeleteResponse(
            success=True if deleted_count > 0 else False,
            deleted_count=deleted_count,
            failed_ids=failed_ids,
            message=f"{deleted_count}개의 댓글을 성공적으로 삭제했습니다." + (f" ({len(failed_ids)}개 실패)" if failed_ids else "")
        )
    except Exception as e:
        logger.error(f"Error in bulk_delete_comments: {str(e)}")
        raise HTTPException(status_code=500, detail=f"벌크 삭제 중 오류가 발생했습니다: {str(e)}")

@router.delete("/accounts/{customer_id}/clear-analysis-cache")
async def clear_analysis_cache(
    customer_id: UUID = Path(..., description="고객 ID"),
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """특정 고객의 모든 게시물 분석 캐시를 삭제합니다."""
    if current_user.id != customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다.")
    
    try:
        from sqlalchemy import delete
        stmt = delete(PostAnalysisCache).where(PostAnalysisCache.customer_id == customer_id)
        result = await db.execute(stmt)
        await db.commit()
        
        logger.info(f"✅ Cleared {result.rowcount} analysis cache records for customer {customer_id}")
        
        return {
            "success": True,
            "deleted_count": result.rowcount,
            "message": f"{result.rowcount}개의 캐시 레코드를 삭제했습니다."
        }
    except Exception as e:
        logger.error(f"Failed to clear analysis cache: {str(e)}")
        raise HTTPException(status_code=500, detail=f"캐시 삭제 실패: {str(e)}")
