from __future__ import annotations

from urllib.parse import urlencode, urlparse

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.schemas.auth import AuthRedirect
from app.services.google_oauth import GoogleOAuthService
from app.utils.logging import get_logger
from app.utils.security import create_access_token

logger = get_logger(__name__)
settings = get_settings()

router = APIRouter()


@router.get("/login", response_model=AuthRedirect)
async def google_login(
    request: Request,
    redirect_uri: str | None = Query(
        default=None,
        description="로그인 후 돌아갈 프론트엔드 URL",
    ),
    oauth_service: GoogleOAuthService = Depends(GoogleOAuthService.from_settings),
) -> AuthRedirect:
    """시작용 Google OAuth URL 생성"""
    # 현재 서버의 주소를 감지 (localhost, ngrok, aidm.kr 등)
    base_url = f"{request.url.scheme}://{request.url.netloc}"
    return oauth_service.build_authorization_url(redirect_uri=redirect_uri, base_url=base_url)


@router.get("/callback")
async def google_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
    oauth_service: GoogleOAuthService = Depends(GoogleOAuthService.from_settings),
    db: AsyncSession = Depends(get_db),
):
    """Google OAuth 콜백 처리 후 Meta 온보딩 페이지로 리다이렉트."""
    if error:
        logger.error("Google OAuth error: %s - %s", error, error_description)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_description or error,
        )

    if not code or not state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="인증 코드 또는 상태 파라미터가 누락되었습니다.",
        )

    customer_data = await oauth_service.handle_callback(code=code, state=state, db=db)

    # JWT 토큰 생성하여 자동 로그인 지원
    access_token = create_access_token(data={"sub": str(customer_data.id)})

    # state에서 redirect_uri를 읽어오거나 기본값으로 Meta 온보딩 페이지 사용
    from app.utils.security import loads_state
    try:
        state_payload = loads_state(state)
        redirect_uri_from_state = state_payload.get("redirect_uri")
    except:
        redirect_uri_from_state = None

    if redirect_uri_from_state:
        base_redirect_url = redirect_uri_from_state.strip()
    else:
        frontend_base = str(settings.frontend_base_url).rstrip("/")
        base_redirect_url = f"{frontend_base}/dashboard"

    parsed = urlparse(base_redirect_url)
    normalized_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/")
    
    # 항상 is_new=true로 설정하여 고객 정보 입력 폼이 표시되도록 함
    params = {
        "customer_id": customer_data.id,
        "is_new": "true" if customer_data.is_new else "false",
        "access_token": access_token,
    }
    
    redirect_with_params = f"{normalized_url}?{urlencode(params)}"
    logger.info(f"Redirecting Google OAuth to: {redirect_with_params}")

    return RedirectResponse(url=redirect_with_params, status_code=status.HTTP_302_FOUND)


