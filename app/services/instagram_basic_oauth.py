from __future__ import annotations

import secrets
from datetime import datetime
from typing import Tuple, Optional

import httpx
from fastapi import Depends, HTTPException, status

from app.config import Settings, get_settings
from app.schemas.auth import AuthRedirect
from app.services.customer_service import CustomerService
from app.services.meta_oauth import MetaOAuthService
from app.utils.logging import get_logger
from app.utils.security import dumps_state, loads_state
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

logger = get_logger(__name__)


class InstagramBasicOAuthService:
    # Business Login for Instagram (with Instagram login)
    # https://developers.facebook.com/docs/instagram-api/guides/business-login
    # Note: Instagram Business Login uses Facebook Graph API for token exchange
    # Official Instagram Login for Business (Method 1)
    # https://developers.facebook.com/docs/instagram-api/guides/business-login
    AUTH_BASE_URL = "https://www.instagram.com/oauth/authorize"
    TOKEN_URL = "https://api.instagram.com/oauth/access_token"
    LONG_LIVED_TOKEN_URL = "https://graph.instagram.com/access_token"
    PROFILE_URL = "https://graph.instagram.com/me"

    def __init__(self, settings: Settings, customer_service: CustomerService):
        self.settings = settings
        self.customer_service = customer_service
        if not (
            self.settings.instagram_basic_app_id
            and self.settings.instagram_basic_app_secret
            and self.settings.instagram_basic_redirect_uri
        ):
            raise RuntimeError("Instagram basic login environment variables are not configured.")

    @classmethod
    def from_settings(
        cls,
        settings: Settings = Depends(get_settings),
        customer_service: CustomerService = Depends(CustomerService),
    ) -> "InstagramBasicOAuthService":
        return cls(settings=settings, customer_service=customer_service)

    def build_authorization_url(self, *, customer_id: str, redirect_uri: str | None = None) -> AuthRedirect:
        # Instagram Login for Business (Official Instagram Business Login)
        # https://developers.facebook.com/docs/instagram-api/guides/business-login
        # Instagram OAuth 엔드포인트를 사용하여 Instagram 비즈니스 계정 로그인
        
        state_payload = {
            "customer_id": customer_id,
            "redirect_uri": redirect_uri,
            "nonce": secrets.token_urlsafe(16),
            "flow_type": "instagram_business_login", # Instagram Business Login 플로우
        }
        state = dumps_state(state_payload)
        
        # Official Instagram Login for Business scopes (Strictly for instagram.com endpoint)
        # Using Facebook scopes here like 'pages_show_list' causes "Invalid platform app"
        business_scope = (
            "instagram_business_basic,"
            "instagram_business_manage_messages,"
            "instagram_business_manage_comments,"
            "instagram_business_content_publish,"
            "instagram_business_manage_insights"
        )
        
        # Instagram-Branded Business Login URL (Instagram Login for Business)
        auth_url = "https://www.instagram.com/oauth/authorize"
        
        query = {
            "client_id": self.settings.instagram_basic_app_id, # Official Instagram App ID
            "redirect_uri": str(self.settings.instagram_basic_redirect_uri),
            "scope": business_scope,
            "response_type": "code",
            "state": state,
            "force_reauth": "true"
        }
        full_auth_url = f"{auth_url}?{httpx.QueryParams(query)}"
        
        with open("/Users/su/Downloads/instagram/instagram-auth-service/debug_emergency.log", "a") as f:
            f.write(f"\n[{datetime.now()}] Login URL Generated: customer_id={customer_id}, client_id={self.settings.instagram_basic_app_id}, flow=Instagram Business Login\n")
        
        logger.info(
            "Instagram Business Login URL 생성: customer_id=%s redirect_uri=%s",
            customer_id,
            self.settings.instagram_basic_redirect_uri,
        )
        return AuthRedirect(authorization_url=full_auth_url, state=state)

    async def handle_callback(self, code: str, state: str, db: AsyncSession) -> Tuple[str, str, bool, bool, Optional[str]]:
        try:
            state_payload = loads_state(state)
        except Exception as exc:
            logger.error(f"Failed to parse state: {exc}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="잘못된 상태 파라미터입니다.") from exc

        if not self.settings.instagram_basic_app_id or not self.settings.instagram_basic_app_secret:
            logger.error("INSTAGRAM_BASIC_APP_ID or INSTAGRAM_BASIC_APP_SECRET is not set")
            raise HTTPException(status_code=500, detail="Instagram 설정이 누락되었습니다. 관리자에게 문의하세요.")

        customer_id_from_state = state_payload.get("customer_id")
        
        # Exchange code for Instagram User Token (Short-lived)
        # Official Doc: POST to https://api.instagram.com/oauth/access_token
        token_url = self.TOKEN_URL
        data = {
            "client_id": self.settings.instagram_basic_app_id, 
            "client_secret": self.settings.instagram_basic_app_secret.get_secret_value(),
            "grant_type": "authorization_code",
            "redirect_uri": str(self.settings.instagram_basic_redirect_uri),
            "code": code,
        }
        
        async with httpx.AsyncClient() as client:
            # Step 1: Get Short-lived Token
            resp = await client.post(token_url, data=data)
            
            if resp.status_code != 200:
                error_body = resp.text
                logger.error(f"Instagram Business Token Exchange Failed: status={resp.status_code}, body={error_body}")
                
                # Check if this is a "code already used" error
                try:
                    error_json = resp.json()
                    if error_json.get("error_message") == "This authorization code has been used" or \
                       "code has been used" in error_body.lower():
                        
                        logger.info("Authorization code already used. Checking if account was already successfully linked...")
                        # If the code was already used, it might be because a previous request (or background task) succeeded.
                        # Check if the customer already has an Instagram account linked.
                        if customer_id_from_state:
                            instagram_account = await self.customer_service.get_instagram_account(db, UUID(customer_id_from_state))
                            if instagram_account and instagram_account.access_token:
                                logger.info(f"✅ Account already linked for customer {customer_id_from_state}. Treating as success.")
                                # Redirect to dashboard
                                from app.schemas.auth import MetaCallbackResult
                                from app.config import get_settings
                                settings = get_settings()
                                return str(customer_id_from_state), f"{settings.frontend_url}/dashboard?customer_id={customer_id_from_state}&meta_logged_in=true", False, False, None
                except Exception as e:
                    logger.warning(f"Error during 'code used' fallback check: {e}")

                raise HTTPException(status_code=400, detail="인증 토큰 교환 실패: 이미 사용된 코드이거나 유효하지 않은 요청입니다.")
            
            # The response might be a flat dict or {"data": [...]} depending on the version/flow
            token_json = resp.json()
            if "data" in token_json and isinstance(token_json["data"], list) and len(token_json["data"]) > 0:
                short_token_data = token_json["data"][0]
            else:
                short_token_data = token_json
                
            short_access_token = short_token_data.get("access_token")
            user_id = short_token_data.get("user_id")
            
            if not short_access_token:
                logger.error(f"No access_token found in response: {token_json}")
                raise HTTPException(status_code=400, detail="액세스 토큰을 찾을 수 없습니다.")

            with open("/Users/su/Downloads/instagram/instagram-auth-service/debug_emergency.log", "a") as f:
                f.write(f"[{datetime.now()}] Token Exchange Success: user_id={user_id}, token_prefix={short_access_token[:10]}..., permissions={token_json.get('permissions') or short_token_data.get('permissions')}\n")

            # Step 2: Exchange for Long-lived token (60 days)
            # Official Business Token Exchange via Instagram endpoint
            try:
                long_lived_token, expires_at = await self._exchange_for_long_lived_token(short_access_token)
                logger.info(f"Instagram Long-lived token acquired. Expires at: {expires_at}")
            except Exception as e:
                logger.error(f"Failed to exchange for long-lived IG token: {str(e)}")
                # Fallback to short token for now if long fails
                long_lived_token = short_access_token
                expires_at = None

            # Delegate to MetaOAuthService to handle the heavy lifting (Page discovery, Webhooks)
            from app.services.meta_oauth import MetaOAuthService
            meta_service = MetaOAuthService(settings=self.settings, customer_service=self.customer_service)
            
            # 2. Process OAuth Success
            # Note: We pass the long_lived_token which is an Instagram-scoped token.
            # MetaOAuthService._process_oauth_success will need to handle finding the corresponding FB Page etc.
            meta_result = await meta_service._process_oauth_success(
                db=db,
                long_lived_token=long_lived_token,
                state_payload=state_payload,
                instagram_user_id=user_id
            )
            
            # Router expects (customer_id, redirect_url, page_id_missing, transfer_required, page_id)
            return meta_result.customer_id, meta_result.redirect_url, meta_result.page_id_missing, meta_result.transfer_required, meta_result.page_id

    async def _exchange_code_for_token(self, code: str) -> Tuple[str, str]:
        # Instagram Business Login uses Facebook Graph API for token exchange
        # Try Facebook Graph API first (Instagram Business Login standard)
        params = {
            "client_id": self.settings.instagram_basic_app_id,
            "client_secret": self.settings.instagram_basic_app_secret.get_secret_value(),
            "grant_type": "authorization_code",
            "redirect_uri": str(self.settings.instagram_basic_redirect_uri),
            "code": code,
        }
        
        async with httpx.AsyncClient() as client:
            # Instagram Business Login uses Instagram API endpoint, not Facebook Graph API
            # Try Instagram API endpoint directly
            try:
                instagram_token_url = "https://api.instagram.com/oauth/access_token"
                logger.info("Instagram Business Login: Instagram API로 토큰 교환 시도")
                response = await client.post(instagram_token_url, data=params)
                
                # 에러 응답 상세 로깅
                if not response.is_success:
                    error_body = response.text
                    try:
                        error_json = response.json()
                        error_msg = error_json.get("error_message", error_json.get("error", {}).get("message", error_body[:200]))
                        error_type = error_json.get("error_type", "")
                    except:
                        error_msg = error_body[:200]
                        error_type = "Unknown"
                    
                    logger.error(
                        "Instagram token 교환 실패: status=%d, type=%s, message=%s",
                        response.status_code,
                        error_type,
                        error_msg
                    )
                    
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Instagram token 교환 실패: {error_msg}"
                    )
                
                response.raise_for_status()
                payload = response.json()
                
                # Business Login for Instagram returns:
                # { "data": [ { "access_token": "...", "user_id": "...", "permissions": "..." } ] }
                if isinstance(payload, dict) and "data" in payload and isinstance(payload["data"], list):
                    first = payload["data"][0] if payload["data"] else {}
                    access_token = first.get("access_token", "")
                    user_id = first.get("user_id", "")
                else:
                    # Fallback for Basic Display‑style response
                    access_token = payload.get("access_token", "")
                    user_id = payload.get("user_id", "")
                
                logger.info("Instagram token 교환 완료: user_id=%s has_token=%s", user_id, bool(access_token))
                return access_token, user_id
                
            except HTTPException:
                # Re-raise HTTP exceptions
                raise
            except Exception as e:
                logger.error(f"Instagram API 토큰 교환 실패: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Instagram token 교환 중 오류 발생: {str(e)}"
                )

    async def _exchange_for_long_lived_token(self, short_lived_token: str) -> Tuple[str, Optional[datetime]]:
        """
        Short-lived token을 long-lived token으로 교환
        
        Returns:
            Tuple[str, Optional[datetime]]: (access_token, expires_at)
        """
        from datetime import datetime, timezone, timedelta
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.LONG_LIVED_TOKEN_URL,
                params={
                    "grant_type": "ig_exchange_token",
                    "client_secret": self.settings.instagram_basic_app_secret.get_secret_value(),
                    "access_token": short_lived_token,
                },
            )
            response.raise_for_status()
            data = response.json()
            access_token = data.get("access_token", short_lived_token)
            
            # expires_in을 파싱하여 만료 시간 계산
            expires_at = None
            expires_in = data.get("expires_in")
            if expires_in and isinstance(expires_in, int):
                # expires_in은 초 단위 (예: 5183944 = 약 60일)
                expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                logger.info(f"Long-lived token 만료 시간: {expires_at} (expires_in: {expires_in}초)")
            else:
                logger.warning(f"expires_in 정보가 없습니다: {data}")
            
            return access_token, expires_at

    async def _get_profile(self, access_token: str) -> dict:
        async with httpx.AsyncClient() as client:
            try:
                # 1. Fetch Full Profile from Instagram Graph API (graph.instagram.com)
                # This works for both "Instagram Login for Business" (Business Token) 
                # and "Basic Display" (Basic Token) - though Basic tokens will return fewer fields (subset).
                # Crucially, verified that "Instagram Login for Business" tokens DO return profile_picture_url/followers_count here.
                logger.debug(f"Instagram Profile 요청 (Unified): {self.PROFILE_URL}")
                
                # Request all potential fields. If token is Basic, unsupported fields might be ignored or cause partial error?
                # Actually, verify_ig_business.py showed 200 OK with all fields for the Business Token.
                # If it fails for a pure Basic token, we might need a fallback, but user has Business Token.
                # Let's request everything.
                response = await client.get(
                    self.PROFILE_URL,
                    params={
                        "fields": "id,username,account_type,media_count,profile_picture_url,followers_count,follows_count",
                        "access_token": access_token,
                    },
                )
                
                if not response.is_success:
                    # If 400, it might be a stricter Basic token rejecting the extra fields.
                    # Fallback to basic fields.
                    logger.warning(f"   ⚠️ 상세 프로필 요청 실패 ({response.status_code}). 기본 정보만 재요청합니다.")
                    response = await client.get(
                        self.PROFILE_URL,
                        params={
                            "fields": "id,username,account_type,media_count",
                            "access_token": access_token,
                        },
                    )
                    response.raise_for_status()

                data = response.json()
                logger.info(f"   ✅ Instagram 프로필 획득: {data.get('username')} (ID: {data.get('id')})")
                
                # Check if we got the "Business" fields
                if "profile_picture_url" in data:
                     logger.info("   ✨ Business Fields (Profile/Followers) retrieved successfully via Instagram API!")
                else:
                     logger.info("   ℹ️ Business Fields missing. (Token might be Basic Display only)")

                return data

            except Exception as e:
                logger.error(f"   ❌ Instagram 프로필 조회 중 치명적 오류: {str(e)}")
                raise


    
    async def refresh_long_lived_token(self, long_lived_token: str) -> Tuple[str, Optional[datetime]]:
        """
        Long-lived token 갱신 (공식 문서 참고)
        https://developers.facebook.com/docs/instagram-api/guides/business-login#refresh-token
        
        Requirements:
        - 기존 long-lived token이 최소 24시간 이상 되어야 함
        - 기존 long-lived token이 유효해야 함 (만료되지 않음)
        - app user가 instagram_business_basic 권한을 부여해야 함
        
        Returns:
            Tuple[str, Optional[datetime]]: (access_token, expires_at)
        """
        from datetime import datetime, timezone, timedelta
        
        REFRESH_TOKEN_URL = "https://graph.instagram.com/refresh_access_token"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                REFRESH_TOKEN_URL,
                params={
                    "grant_type": "ig_refresh_token",
                    "access_token": long_lived_token,
                },
            )
            response.raise_for_status()
            data = response.json()
            access_token = data.get("access_token", long_lived_token)
            
            # expires_in을 파싱하여 만료 시간 계산
            expires_at = None
            expires_in = data.get("expires_in")
            if expires_in and isinstance(expires_in, int):
                # expires_in은 초 단위 (예: 5183944 = 약 60일)
                expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                logger.info(f"토큰 갱신 완료. 새 만료 시간: {expires_at} (expires_in: {expires_in}초)")
            else:
                logger.warning(f"토큰 갱신 응답에 expires_in 정보가 없습니다: {data}")
            
            return access_token, expires_at

