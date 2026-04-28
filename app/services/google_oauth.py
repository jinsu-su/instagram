from __future__ import annotations

import secrets
import traceback
from typing import Tuple
from urllib.parse import urlencode, urlparse

import httpx
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, DBAPIError

from app.config import Settings, get_settings
from app.schemas.auth import AuthRedirect
from app.services.customer_service import CustomerService, CustomerUpsertResult
from app.utils.logging import get_logger
from app.utils.security import dumps_state, loads_state

logger = get_logger(__name__)


class GoogleOAuthService:
    AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

    def __init__(self, settings: Settings, customer_service: CustomerService):
        self.settings = settings
        self.customer_service = customer_service

    @classmethod
    def from_settings(
        cls,
        settings: Settings = Depends(get_settings),
        customer_service: CustomerService = Depends(CustomerService),
    ) -> "GoogleOAuthService":
        return cls(settings=settings, customer_service=customer_service)

    def build_authorization_url(self, redirect_uri: str | None = None, base_url: str | None = None) -> AuthRedirect:
        """Build Google OAuth authorization URL.

        We request basic profile & email so that the integration console can
        identify the operator account.
        """
        if not self.settings.google_client_id or not self.settings.google_client_id.strip():
            logger.error("GOOGLE_CLIENT_ID가 .env 파일에 설정되지 않았습니다.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth 클라이언트 ID가 설정되지 않았습니다. .env 파일에 GOOGLE_CLIENT_ID를 설정해주세요."
            )
        
        # 1. 프론트엔드 복귀 주소 설정 (인증 완료 후 최종 도착지)
        if redirect_uri:
            final_redirect = redirect_uri
        else:
            frontend_base = str(self.settings.frontend_base_url).rstrip("/")
            # 기본값: 인스타그램 통합 콘솔로 복귀
            final_redirect = f"{frontend_base}/instagram-integration-console"

        # 2. 백엔드 콜백 주소 설정 (구글이 넘겨줄 곳)
        # base_url이 있으면 (예: localhost:8000) 이를 기반으로 생성, 없으면 .env 기본값 사용
        if base_url:
            backend_callback = f"{base_url.rstrip('/')}/auth/google/callback"
        else:
            backend_callback = str(self.settings.google_redirect_uri)

        state_payload = {
            "redirect_uri": final_redirect,
            "backend_callback": backend_callback,
            "nonce": secrets.token_urlsafe(16),
        }
        state = dumps_state(state_payload)

        query = {
            "client_id": self.settings.google_client_id,
            "redirect_uri": backend_callback,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "include_granted_scopes": "true",
            "state": state,
            "prompt": "consent",
        }
        params = httpx.QueryParams(query)
        auth_url = f"{self.AUTH_URL}?{params}"
        logger.info("Google OAuth URL 생성: client_id=%s callback=%s", self.settings.google_client_id[:20] + "...", backend_callback)
        return AuthRedirect(authorization_url=auth_url, state=state)

    async def handle_callback(self, code: str, state: str, db: AsyncSession) -> CustomerUpsertResult:
        """Exchange code for tokens, fetch user profile, and save to database."""
        try:
            state_payload = loads_state(state)
        except Exception as exc:
            logger.error("Failed to parse Google OAuth state: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"잘못된 상태 파라미터입니다: {str(exc)}"
            )

        # state에서 콜백 주소 복원 (없으면 .env 기본값 사용)
        backend_callback = state_payload.get("backend_callback", str(self.settings.google_redirect_uri))

        token_data = {
            "code": code,
            "client_id": self.settings.google_client_id,
            "client_secret": self.settings.google_client_secret.get_secret_value(),
            "redirect_uri": backend_callback,
            "grant_type": "authorization_code",
        }

        try:
            # Production Hardening: Use a dedicated client with timeout for better reliability
            async with httpx.AsyncClient(timeout=30.0) as client:
                token_resp = await client.post(self.TOKEN_URL, data=token_data)
                token_resp.raise_for_status()
                token_payload = token_resp.json()
                access_token = token_payload.get("access_token")
                refresh_token = token_payload.get("refresh_token")

                if not access_token:
                    logger.error("Google OAuth token 응답에 access_token 이 없습니다.")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Google OAuth token response missing access_token"
                    )

                userinfo_resp = await client.get(
                    self.USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                userinfo_resp.raise_for_status()
                userinfo = userinfo_resp.json()
        except httpx.TimeoutException as e:
            logger.error(f"Google OAuth timeout: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="구글 인증 서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요."
            )
        except httpx.HTTPStatusError as e:
            error_detail = f"토큰 교환에 실패했습니다: {e.response.status_code}"
            try:
                error_data = e.response.json()
                error_detail += f" - {error_data.get('error', {}).get('message', '알 수 없는 오류')}"
            except:
                error_detail += f" - {e.response.text[:200]}"
            logger.error(error_detail)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_detail)
        except Exception as e:
            logger.error(f"Unexpected error during Google OAuth: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"OAuth 인증에 실패했습니다: {str(e)}")

        google_user_id = userinfo.get("sub")
        name = userinfo.get("name")
        email = userinfo.get("email")
        profile_picture_url = userinfo.get("picture")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google OAuth를 위해 이메일 주소가 필요합니다."
            )

        logger.info(
            "Google OAuth 완료: sub=%s email=%s name=%s",
            google_user_id,
            email,
            name,
        )

        try:
            logger.info("Upserting customer and OAuth account from Google")
            customer_data: CustomerUpsertResult = await self.customer_service.upsert_google_account(
                db=db,
                google_user_id=google_user_id,
                name=name,
                email=email,
                access_token=access_token,
                refresh_token=refresh_token,
                profile_picture_url=profile_picture_url,
            )
            logger.info(f"Successfully upserted customer from Google: customer_id={customer_data.id}, is_new={customer_data.is_new}")
        except (IntegrityError, DBAPIError) as e:
            error_str = str(e).lower()
            if "unique" in error_str or "duplicate" in error_str or "already exists" in error_str:
                logger.error(f"IntegrityError after retry logic failed: {str(e)}")
                logger.error(traceback.format_exc())
                from app.models import Customer, OAuthAccount
                from app.models.oauth_account import OAuthProvider
                from sqlalchemy import select
                
                result = await db.execute(select(Customer).where(Customer.email == email))
                customer = result.scalar_one_or_none()
                if customer:
                    logger.info(f"Found customer in google_oauth fallback: customer_id={customer.id}")
                    customer_data = CustomerUpsertResult(id=str(customer.id), is_new=False)
                else:
                    result = await db.execute(
                        select(OAuthAccount).where(
                            OAuthAccount.provider == OAuthProvider.GOOGLE,
                            OAuthAccount.subject == google_user_id,
                        )
                    )
                    oauth_account = result.scalar_one_or_none()
                    if oauth_account:
                        customer = await db.get(Customer, oauth_account.customer_id)
                        if customer:
                            logger.info(f"Found customer by OAuthAccount in google_oauth fallback: customer_id={customer.id}")
                            customer_data = CustomerUpsertResult(id=str(customer.id), is_new=False)
                        else:
                            raise HTTPException(
                                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail=f"고객 정보를 저장하는 데 실패했습니다: 고객이 존재하지만 정보를 가져올 수 없습니다. {str(e)}"
                            )
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"고객 정보를 저장하는 데 실패했습니다: {str(e)}"
                        )
            else:
                logger.error(f"Unexpected IntegrityError during customer upsert: {str(e)}")
                logger.error(traceback.format_exc())
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"고객 정보를 저장하는 데 실패했습니다: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error during customer upsert: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"고객 정보를 저장하는 데 실패했습니다: {str(e)}")

        return customer_data


