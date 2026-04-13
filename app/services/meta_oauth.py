from __future__ import annotations

import secrets
import traceback
from datetime import datetime, timedelta
from typing import Tuple, Optional
from urllib.parse import urlencode, urlparse
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, status
from app.config import Settings, get_settings
from app.schemas.auth import MetaCallbackResult, MetaPageInfo, MetaUserInfo
from app.services.customer_service import CustomerService, CustomerUpsertResult
from app.utils.security import dumps_state, loads_state
from app.utils.logging import get_logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, DBAPIError

logger = get_logger(__name__)


class MetaOAuthService:
    AUTH_BASE_URL = "https://www.facebook.com/v25.0/dialog/oauth"
    TOKEN_URL = "https://graph.instagram.com/v25.0/oauth/access_token"
    LONG_LIVED_TOKEN_URL = "https://graph.instagram.com/v25.0/oauth/access_token"
    ME_URL = "https://graph.instagram.com/v25.0/me"
    PAGES_URL = "https://graph.instagram.com/v25.0/me/accounts"
    DEBUG_TOKEN_URL = "https://graph.instagram.com/v25.0/debug_token" # Native IG host equivalent

    def __init__(self, settings: Settings, customer_service: CustomerService):
        self.settings = settings
        self.customer_service = customer_service

    @classmethod
    def from_settings(
        cls,
        settings: Settings = Depends(get_settings),
        customer_service: CustomerService = Depends(CustomerService),
    ) -> "MetaOAuthService":
        return cls(settings=settings, customer_service=customer_service)

    def build_authorization_url(self, redirect_uri: str | None = None, use_business_login: bool = True) -> Tuple[str, str]:
        """
        Facebook OAuth 인증 URL 생성
        
        Args:
            redirect_uri: 로그인 후 리디렉션할 프론트엔드 URI
            use_business_login: True이면 Facebook Login for Business 방식 사용 (공식 문서 권장)
                               False이면 일반 Facebook OAuth 방식 사용
        
        Returns:
            (auth_url, state) 튜플
        """
        if redirect_uri:
            state_redirect_uri = redirect_uri
        else:
            frontend_base = str(self.settings.frontend_base_url).rstrip("/")
            state_redirect_uri = f"{frontend_base}/dashboard"
        
        state_payload = {
            "redirect_uri": state_redirect_uri,
            "nonce": secrets.token_urlsafe(16),
            "use_business_login": use_business_login,  # 콜백에서 처리 방식을 구분하기 위해
        }
        state = dumps_state(state_payload)
        
        if use_business_login:
            # Facebook Login for Business 방식 (공식 문서 권장)
            # ⚠️ 주의: response_type=token 방식에서는 일부 페이지 권한(pages_read_engagement, pages_manage_metadata)이
            # 토큰에 포함되지 않을 수 있습니다. 따라서 response_type=code 방식을 사용하여 모든 권한을 확실히 받습니다.
            # https://developers.facebook.com/docs/instagram-api/getting-started
            import json
            query = {
                "client_id": self.settings.meta_app_id,
                "redirect_uri": str(self.settings.meta_redirect_uri),
                "scope": ",".join(self.settings.meta_required_scopes),
                "response_type": "code",  # ⚠️ code 방식으로 변경: 모든 권한을 확실히 받기 위해
                "display": "page",  # 필수 - 페이지 선택 화면 표시
                "extras": json.dumps({
                    "setup": {
                        "channel": "IG_API_ONBOARDING"
                    }
                }),  # Instagram API 온보딩
                # reauthenticate는 "다시 로그인"만 강제하고, 과거 거절된 권한을 다시 띄우지 않을 수 있습니다.
                # rerequest는 과거 거절된 권한을 다시 요청하는 데 유리합니다.
                # reauthenticate + rerequest를 함께 시도 (일부 계정에서 계정 재선택/재동의 유도)
                # Facebook 문서상 auth_type은 string이며, 실무에선 콤마로 복수 값을 넣는 케이스가 있어 이를 사용합니다.
                "auth_type": "rerequest,reauthenticate",
                # return_scopes를 켜면 OAuth 응답에 granted_scopes/denied_scopes가 포함될 수 있어 디버깅이 쉬워집니다.
                "return_scopes": "true",
                "state": state,
            }
        else:
            # 일반 Facebook OAuth 방식 (response_type=code)
            # ⚠️ 이 방식이 권장됩니다: 모든 권한이 토큰에 포함됩니다.
            import json
            query = {
                "client_id": self.settings.meta_app_id,
                "redirect_uri": str(self.settings.meta_redirect_uri),
                "scope": ",".join(self.settings.meta_required_scopes),
                "response_type": "code",
                "display": "page",  # 페이지 선택 화면 표시
                "extras": json.dumps({
                    "setup": {
                        "channel": "IG_API_ONBOARDING"
                    }
                }),  # Instagram API 온보딩 (Facebook Login for Business 기능 유지)
                # 과거 거절된 권한이 있으면 reauthenticate로는 다시 뜨지 않는 케이스가 있어 rerequest 사용
                "auth_type": "rerequest,reauthenticate",
                "return_scopes": "true",
                "state": state,
            }
        
        auth_url = f"{self.AUTH_BASE_URL}?{urlencode(query)}"
        
        # 🔍 검수용: OAuth URL에 포함된 권한 로그 출력
        logger.info("=" * 80)
        logger.info("🔍 OAuth Authorization URL 생성 (검수용)")
        logger.info(f"   요청된 권한 목록 ({len(self.settings.meta_required_scopes)}개):")
        for i, scope in enumerate(self.settings.meta_required_scopes, 1):
            is_critical = scope in ["pages_read_engagement", "pages_manage_metadata"]
            marker = "⭐" if is_critical else "  "
            logger.info(f"   {marker} {i:2d}. {scope}")
        logger.info(f"   OAuth URL: {auth_url[:200]}...")  # URL이 너무 길 수 있으므로 처음 200자만
        logger.info("=" * 80)
        
        return auth_url, state

    async def handle_callback_with_token(self, access_token: str, long_lived_token: str | None, state: str, db: AsyncSession) -> MetaCallbackResult:
        """
        Facebook Login for Business 방식: 프론트엔드에서 받은 토큰으로 처리
        (response_type=token, fragment로 반환된 토큰 처리)
        """
        try:
            state_payload = loads_state(state)
        except Exception as e:
            logger.error(f"Failed to load state: {str(e)}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"잘못된 상태 파라미터입니다: {str(e)}")

        # long_lived_token이 있으면 사용, 없으면 access_token 사용 후 교환
        if long_lived_token:
            logger.info("Using provided long-lived token from fragment")
            long_lived_token_final = long_lived_token
        else:
            try:
                logger.info("Exchanging short-lived token for long-lived token")
                long_lived_token_final = await self._exchange_for_long_lived_token(access_token)
                logger.info("Successfully obtained long-lived token")
            except Exception as e:
                logger.error(f"Failed to exchange for long-lived token: {str(e)}")
                logger.error(traceback.format_exc())
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"토큰 교환에 실패했습니다: {str(e)}")

        return await self._process_oauth_success(long_lived_token_final, state_payload, db)

    async def _process_oauth_success(self, long_lived_token: str, state_payload: dict, db: AsyncSession, instagram_user_id: str = None) -> MetaCallbackResult:
        """
        OAuth 성공 후 공통 처리 로직 (code 방식과 token 방식 모두에서 사용)
        """
        # 변수 초기화 (NameError 방지)
        pages_with_instagram = []
        customer_data = None
        user_info = None
        captured_page_id = None

        try:
            logger.info("Fetching Instagram user info (Instagram Business Login)")
            # Always use Instagram branded flow logic
            user_info = await self._get_instagram_user_info_direct(long_lived_token)
            logger.info("Successfully fetched Instagram user info")
        except Exception as e:
            logger.error(f"Failed to fetch user info via graph.instagram.com: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Instagram 사용자 정보를 가져오는 데 실패했습니다: {str(e)}")
        
        # 🔥 실제로 받은 권한 확인
        try:
            logger.info("🔍 실제로 받은 권한 확인 중...")
            debug_info = await self.debug_token(long_lived_token)
            token_data = debug_info.get("data", {})
            granted_scopes = token_data.get("scopes", [])
            
            logger.info(f"   실제 승인된 권한 ({len(granted_scopes)}개): {granted_scopes}")
            
            # 필수 권한 확인
            required_scopes = [
                "pages_show_list",
                "pages_read_engagement",
                "pages_manage_metadata",
                "instagram_basic,",
                "instagram_business_manage_messages,",
            ]
            
            missing_scopes = [scope for scope in required_scopes if scope not in granted_scopes]
            
            if missing_scopes:
                logger.warning(f"⚠️ ⚠️ ⚠️ 누락된 필수 권한: {missing_scopes}")
                logger.warning(f"   → 이 권한들이 없으면 Page Access Token 획득이 실패할 수 있습니다.")
                logger.warning(f"   → 원인 분석:")
                logger.warning(f"      1. 사용자가 페이지 관리자가 아닐 수 있음")
                logger.warning(f"         → Facebook Page 설정에서 역할 확인 필요")
                logger.warning(f"      2. 앱이 개발 모드일 수 있음 (테스트 계정만 가능)")
                logger.warning(f"         → Facebook 개발자 콘솔에서 앱 모드 확인")
                logger.warning(f"      3. 앱 권한 검수가 완료되지 않았을 수 있음")
                logger.warning(f"         → Facebook 개발자 콘솔 > 앱 검수에서 확인")
                logger.warning(f"   → 해결 방법:")
                logger.warning(f"      1. Facebook Page 설정에서 사용자를 관리자로 추가")
                logger.warning(f"      2. Facebook 개발자 콘솔에서 앱 권한 검수 완료")
                logger.warning(f"      3. OAuth 재실행 시 모든 권한을 명시적으로 승인")
            else:
                logger.info(f"✅ 모든 필수 권한이 포함되어 있습니다!")
        except Exception as e:
            logger.warning(f"⚠️ 권한 확인 실패 (계속 진행): {str(e)}")

        try:
            logger.info("Upserting customer and OAuth account")
            customer_data: CustomerUpsertResult = await self.customer_service.upsert_meta_account(
                db=db,
                meta_user=user_info,
                long_lived_token=long_lived_token,
                customer_id=state_payload.get("customer_id")
            )
            logger.info(f"Successfully upserted customer: customer_id={customer_data.id}, is_new={customer_data.is_new}")
        except (IntegrityError, DBAPIError) as e:
            error_str = str(e).lower()
            if "unique" in error_str or "duplicate" in error_str or "already exists" in error_str:
                logger.error(f"IntegrityError after retry logic failed: {str(e)}")
                logger.error(traceback.format_exc())
                from app.models import Customer, OAuthAccount
                from app.models.oauth_account import OAuthProvider
                from sqlalchemy import select
                
                pseudo_email = user_info.email or f"{user_info.facebook_user_id}@facebook.com"
                result = await db.execute(select(Customer).where(Customer.email == pseudo_email))
                customer = result.scalar_one_or_none()
                if customer:
                    logger.info(f"Found customer in meta_oauth fallback: customer_id={customer.id}")
                    customer_data = CustomerUpsertResult(id=str(customer.id), is_new=False)
                else:
                    result = await db.execute(
                        select(OAuthAccount).where(
                            OAuthAccount.provider == OAuthProvider.META,
                            OAuthAccount.subject == user_info.facebook_user_id,
                        )
                    )
                    oauth_account = result.scalar_one_or_none()
                    if oauth_account:
                        customer = await db.get(Customer, oauth_account.customer_id)
                        if customer:
                            logger.info(f"Found customer by OAuthAccount in meta_oauth fallback: customer_id={customer.id}")
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

        # Instagram Business Login Flow (Direct IG Token)
        if instagram_user_id:
            logger.info(f"   🔄 Branded flow fallback: instagram_user_id={instagram_user_id} 직접 연동 시도")
            try:
                # 1. Instagram 프로필 정보 직접 조회
                profile_info = {}
                try:
                    profile_info = await self.get_instagram_user_info(long_lived_token, instagram_user_id)
                    logger.info(f"   ✅ Instagram 프로필 정보 획득 완료: {profile_info.get('username')}")
                except Exception as e:
                    logger.warning(f"   ⚠️ Instagram 프로필 정보 직접 조회 실패: {str(e)}")
                
                # 1.5. Facebook Page 찾기 로직 제거됨 (Instagram 순수 연동 방식만 허용)
                page_id_to_save = None
                page_access_token_to_save = None
                
                # 저장할 토큰 결정: 항상 Instagram 토큰 사용
                token_to_save = long_lived_token
                
                # 토큰 만료 시간 확인
                token_expires_at = await self.get_token_expiration(token_to_save)

                # 2. 계정 저장 (page_id 포함 - 찾았다면)
                # Note: Page ID가 있으면 DM 자동화 가능, 없으면 추후 Meta OAuth 필요
                instagram_account = await self.customer_service.save_instagram_account(
                    db=db,
                    customer_id=customer_data.id,
                    page_id=page_id_to_save,  # ✅ 찾은 page_id 사용 (없으면 None)
                    instagram_user_id=instagram_user_id,
                    access_token=token_to_save,  # ✅ Page Access Token 우선 사용
                    token_expires_at=token_expires_at,
                    instagram_username=profile_info.get("username") or instagram_user_id,
                    profile_picture_url=profile_info.get("profile_picture_url"),
                    followers_count=profile_info.get("followers_count"),
                    follows_count=profile_info.get("follows_count"),
                    media_count=profile_info.get("media_count"),
                    force_transfer=False, commit=False, # Default
                )
                if str(instagram_account.customer_id) != str(customer_data.id):
                    logger.warning(f"Instagram account {instagram_user_id} is already owned by {instagram_account.customer_id}. Transfer required.")
                    customer_data.transfer_required = True
                    captured_page_id = str(page_id_to_save or instagram_user_id)

                logger.info(f"   ✅ Branded flow fallback으로 Instagram 계정 저장 시도 완료: {instagram_user_id}")

                # 3. Webhook Subscription (Critical for DMs)
                # 🔥 Page ID가 있거나, IG 네이티브 토큰인 경우 웹훅 구독 시도
                should_subscribe = False
                if page_id_to_save and page_access_token_to_save:
                    should_subscribe = True
                elif token_to_save and token_to_save.startswith("IG"):
                    should_subscribe = True
                    logger.info("   ℹ️ Page ID가 없지만 IG 네이티브 토큰이므로 직접 웹훅 구독을 시도합니다.")

                if should_subscribe:
                    try:
                        logger.info(f"   🔔 웹훅 구독 시도: target_id={page_id_to_save or instagram_user_id}")
                        webhook_subscribed = await self.subscribe_page_to_webhook(
                            page_id=page_id_to_save or instagram_user_id,
                            page_access_token=token_to_save,
                        )
                        if webhook_subscribed:
                            logger.info(f"   🔔 IG Native 웹훅 구독 성공! (target_id={page_id_to_save or instagram_user_id})")
                    except Exception as e:
                        logger.error(f"   ❌ IG Native 웹훅 구독 실패: {str(e)}")
            except Exception as e:
                logger.error(f"   ❌ Branded flow fallback 저장 실패: {str(e)}")

        # Ensure customer_data is valid before use (prevent AttributeError during redirect URL building)
        if not customer_data:
            logger.warning("customer_data is None. Attempting to recover from state_payload...")
            cid_from_state = state_payload.get("customer_id")
            if cid_from_state:
                customer_data = CustomerUpsertResult(id=cid_from_state, is_new=False, transfer_required=False)
                logger.info(f"Recovered customer_id from state: {customer_data.id}")
            else:
                logger.error("No customer_id found in state_payload. Cannot return valid result.")
                raise HTTPException(status_code=500, detail="고객 정보를 생성하거나 찾을 수 없습니다.")

        redirect_uri_from_state = state_payload.get("redirect_uri")
        if redirect_uri_from_state:
            base_redirect_url = redirect_uri_from_state.strip()
        else:
            frontend_base = str(self.settings.frontend_base_url).rstrip("/")
            base_redirect_url = f"{frontend_base}/dashboard"

        parsed = urlparse(base_redirect_url)
        normalized_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/")
        
        params = {
            "customer_id": customer_data.id,
            "is_new": "true",
            "meta_logged_in": "true",
        }
        
        redirect_with_params = f"{normalized_url}?{urlencode(params)}"
        logger.info(f"Redirecting to: {redirect_with_params}")

        # Since we exclusively use Instagram Business Login Flow with direct tokens,
        # we deliberately ignore Facebook Page ID dependencies.
        is_page_missing = False
        
        # Ensure we return a valid captured_page_id for the frontend
        if not captured_page_id and instagram_user_id:
            captured_page_id = str(instagram_user_id)
            logger.info(f"   ℹ️ Using instagram_user_id as proxy for captured_page_id: {captured_page_id}")

        # 🔥 Final commit consolidated
        try:
            await db.commit()
            logger.info("✅ Final database commit successful.")
        except Exception as e:
            logger.error(f"❌ Final commit failed: {str(e)}")
            await db.rollback()
            raise
        return MetaCallbackResult(
            customer_id=customer_data.id,
            redirect_url=redirect_with_params,
            page_id_missing=is_page_missing,
            transfer_required=customer_data.transfer_required,
            page_id=captured_page_id,
        )

    async def handle_callback(self, code: str, state: str, db: AsyncSession) -> MetaCallbackResult:
        try:
            state_payload = loads_state(state)
        except Exception as e:
            logger.error(f"Failed to load state: {str(e)}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"잘못된 상태 파라미터입니다: {str(e)}")

        try:
            logger.info("Exchanging authorization code for access token")
            short_lived = await self._exchange_code_for_token(code)
            logger.info("Successfully obtained short-lived token")
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
            logger.error(f"Unexpected error exchanging code for token: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"토큰 교환에 실패했습니다: {str(e)}")

        try:
            logger.info("Exchanging short-lived token for long-lived token")
            long_lived_token = await self._exchange_for_long_lived_token(short_lived["access_token"])
            logger.info("Successfully obtained long-lived token")
        except httpx.HTTPStatusError as e:
            error_detail = f"장기 토큰 교환에 실패했습니다: {e.response.status_code}"
            try:
                error_data = e.response.json()
                error_detail += f" - {error_data.get('error', {}).get('message', '알 수 없는 오류')}"
            except:
                error_detail += f" - {e.response.text[:200]}"
            logger.error(error_detail)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_detail)
        except Exception as e:
            logger.error(f"Unexpected error exchanging for long-lived token: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"장기 토큰 교환에 실패했습니다: {str(e)}")

        # state에서 처리 방식 확인
        state_payload_for_processing = loads_state(state)
        return await self._process_oauth_success(long_lived_token, state_payload_for_processing, db)

    async def _exchange_code_for_token(self, code: str) -> dict:
        redirect_uri = str(self.settings.meta_redirect_uri).strip()
        client_id = self.settings.meta_app_id
        client_secret = self.settings.meta_app_secret.get_secret_value()
        
        logger.info(f"OAuth 토큰 교환 파라미터:")
        logger.info(f"  client_id: {client_id}")
        logger.info(f"  redirect_uri: {redirect_uri}")
        logger.info(f"  redirect_uri 길이: {len(redirect_uri)}")
        logger.info(f"  redirect_uri (repr): {repr(redirect_uri)}")
        logger.info(f"  client_secret 길이: {len(client_secret)}")
        logger.info(f"  client_secret 처음 4자: {client_secret[:4]}... (디버깅용)")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.TOKEN_URL,
                params={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "code": code,
                },
            )
            response.raise_for_status()
            return response.json()

    async def _exchange_for_long_lived_token(self, short_lived_token: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.LONG_LIVED_TOKEN_URL,
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": self.settings.meta_app_id,
                    "client_secret": self.settings.meta_app_secret.get_secret_value(),
                    "fb_exchange_token": short_lived_token,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("access_token", "")

    async def refresh_long_lived_token(self, long_lived_token: str) -> dict:
        """Long-lived 토큰을 갱신합니다. (60일 연장) - Facebook 토큰(EA...) 전용"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.LONG_LIVED_TOKEN_URL,
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": self.settings.meta_app_id,
                    "client_secret": self.settings.meta_app_secret.get_secret_value(),
                    "fb_exchange_token": long_lived_token,
                },
            )
            response.raise_for_status()
            return response.json()

    async def refresh_instagram_token(self, access_token: str) -> dict:
        """Instagram 토큰(IGAA...) 전용 갱신 - graph.instagram.com/refresh_access_token 사용
        
        - IG Business Login 토큰(IGAA...)에 사용
        - 만료 전에만 갱신 가능 (만료 후엔 사용자 재로그인 필요)
        - 갱신 성공 시 60일 연장된 새 토큰 반환
        """
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                "https://graph.instagram.com/refresh_access_token",
                params={
                    "grant_type": "ig_refresh_token",
                    "access_token": access_token,
                },
            )
            response.raise_for_status()
            return response.json()

    async def auto_refresh_token(self, access_token: str) -> dict:
        """토큰 타입에 맞는 갱신 방법 자동 선택
        
        - IGAA... 토큰: graph.instagram.com/refresh_access_token 사용
        - 그 외(EA... 등): graph.instagram.com oauth 교환 방식 사용
        """
        if access_token.startswith("IG"):
            logger.info("🔄 IG 토큰 갱신 시도 (graph.instagram.com/refresh_access_token)")
            return await self.refresh_instagram_token(access_token)
        else:
            logger.info("🔄 FB 토큰 갱신 시도 (graph.instagram.com oauth 교환)")
            return await self.refresh_long_lived_token(access_token)


    async def get_token_expiration(self, access_token: str) -> Optional[datetime]:
        """토큰을 디버그하여 만료 시간을 가져옵니다."""
        try:
            debug_info = await self.debug_token(access_token)
            expires_at_unix = debug_info.get("data", {}).get("expires_at")
            if expires_at_unix and expires_at_unix > 0:
                return datetime.fromtimestamp(expires_at_unix)
            
            # data_access_expires_at 도 확인 (앱 권한 만료)
            data_expires_at_unix = debug_info.get("data", {}).get("data_access_expires_at")
            if data_expires_at_unix and data_expires_at_unix > 0:
                return datetime.fromtimestamp(data_expires_at_unix)
                
            return None
        except Exception as e:
            logger.warning(f"토큰 만료 시간 확인 실패: {str(e)}")
            return None

    async def _get_instagram_user_info_direct(self, access_token: str) -> MetaUserInfo:
        """Call graph.instagram.com/me for branded login tokens."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://graph.instagram.com/me",
                params={
                    "access_token": access_token,
                    "fields": "id,username",
                },
                timeout=10.0,
            )
            resp.raise_for_status()
            data = resp.json()
            return MetaUserInfo(
                facebook_user_id=f"ig_{data.get('id')}",
                name=data.get("username"),
            )



    async def list_instagram_pages(self, access_token: str) -> list[MetaPageInfo]:
        if access_token.startswith("IGAAV"):
            logger.info("Instagram Basic Display token detected. Skipping Facebook Page lookup.")
            return []
        return await self._get_pages(access_token)

    async def get_page_info(self, user_access_token: str, page_id: str) -> MetaPageInfo:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://graph.instagram.com/v25.0/{page_id}",
                params={
                    "access_token": user_access_token,
                    "fields": "id,name,access_token,instagram_business_account{id,username,profile_picture_url}",
                },
            )
            response.raise_for_status()
            data = response.json()
            instagram_account = data.get("instagram_business_account") or {}
            return MetaPageInfo(
                page_id=data.get("id", ""),
                page_name=data.get("name", ""),
                access_token=data.get("access_token", ""),
                instagram_user_id=instagram_account.get("id"),
                instagram_username=instagram_account.get("username"),
                # instagram_asid is not easily available in this single-object call,
                # but instagram_user_id should be the IGBID from this field.
            )

    async def subscribe_page_to_webhook(self, page_id: str, page_access_token: str) -> bool:
        """
        Facebook Page를 웹훅에 구독합니다.
        
        Instagram DM은 Facebook Page 웹훅을 통해 들어오므로,
        Instagram 계정과 연결된 Page를 웹훅에 구독해야 메시지를 받을 수 있습니다.
        
        API: POST /{page-id}/subscribed_apps
        """
        try:
            # 웹훅 URL은 instargram_google_cloud 서버의 /instagram/webhook 엔드포인트를 가리켜야 함
            # api_base_url이 instargram_google_cloud 서버를 가리키는지 확인 필요
            # 만약 다른 서버라면 INSTAGRAM_WEBHOOK_URL 환경변수 사용
            import os
            webhook_base_url = os.getenv("INSTAGRAM_WEBHOOK_URL") or str(self.settings.api_base_url).rstrip("/")
            webhook_url = webhook_base_url + "/instagram/webhook"
            logger.info(f"🔔 웹훅 구독 URL: {webhook_url}")
            
            # Check for Instagram User Token (IG...)
            if page_access_token and page_access_token.startswith("IG"):
                logger.info(f"ℹ️ IG Token detected for webhook subscription. Using graph.instagram.com/me/subscribed_apps")
                async with httpx.AsyncClient() as client:
                     # For IG User Token, we subscribe the USER (me) to the app
                     subscribe_url = "https://graph.instagram.com/v25.0/me/subscribed_apps"
                     
                     # Check existing subscriptions
                     try:
                         check_resp = await client.get(subscribe_url, params={"access_token": page_access_token})
                         if check_resp.status_code == 200:
                             logger.info("   Checked current IG subscriptions successfully.")
                     except Exception as e:
                         logger.warning(f"   Failed to check IG subscriptions: {e}")

                     # Subscribe
                     # Fields for Instagram Messaging: messages
                     # Also probably: feed? No, for messaging it's messages or corresponding field.
                     # According to docs: "messages" field on User node or subscribed_apps?
                     # Webhooks on "Instagram User" node: https://developers.facebook.com/docs/instagram-api/guides/webhooks
                     # Fields: comments, live_comments, mentions, story_insights. 
                     # WAIT. "messages" field is for "Instagram Messaging" which usually requires Page subscription if via Graph API?
                     # BUT user says "Webhooks for DM detection" works with IG Login.
                     # If verification script GET /me/subscribed_apps returned 200 OK, it implies we can subscribe.
                     # Let's try subscribing to 'messages' field.
                     
                     logger.info(f"   Subscribing to 'messages' field on graph.instagram.com...")
                     response = await client.post(
                        subscribe_url,
                        params={
                            "access_token": page_access_token,
                            # "subscribed_fields": "messages,comments,mentions", # Try messages first
                            # User said "Webhooks for DM detection".
                            # Standard fields for IG Messaging: messages
                             # Standard fields for IG Messaging: messages, plus comments and mentions for mentions
                             "subscribed_fields": "messages,comments,mentions,messaging_postbacks", 
                        }
                     )
                     
                     if response.status_code == 200:
                         logger.info(f"✅ IG Webhook subscription successful!")
                         return True
                     else:
                         logger.warning("⚠️ IG Webhook subscription failed. Check Meta App Dashboard for details.")
                         # Continue to standard logic? No, if it's IG token, standard logic (graph.instagram.com/{page_id}) probably fails or is wrong.
                         return False

            async with httpx.AsyncClient() as client:
                # Instagram Business Login: Always use graph.instagram.com
                logger.info(f"🔍 기존 웹훅 구독 상태 확인 중 (IG Native)...")
                check_url = f"https://graph.instagram.com/v25.0/{page_id}/subscribed_apps"
                check_response = await client.get(
                    check_url,
                    params={"access_token": page_access_token},
                )
                
                if check_response.is_success:
                    check_data = check_response.json()
                    subscribed_apps = check_data.get("data", [])
                    our_app_id = str(self.settings.meta_app_id)
                    
                    logger.info(f"   현재 구독된 앱 개수: {len(subscribed_apps)}")
                    for app in subscribed_apps:
                        app_id = str(app.get("id") or app.get("app_id", ""))
                        logger.info(f"   구독된 앱 ID: {app_id}")
                        if app_id != our_app_id:
                            logger.warning(f"   ⚠️ 다른 앱({app_id})으로 구독되어 있습니다.")
                            logger.warning(f"   → Page Access Token이 다른 앱의 토큰입니다.")
                            logger.warning(f"   → 올바른 앱({our_app_id})의 토큰을 받기 위해 Meta OAuth를 다시 진행해야 합니다.")
                            logger.warning(f"   → 또는 Facebook 개발자 대시보드에서 수동으로 웹훅 구독을 설정하세요.")
                            
                            # 다른 앱 구독 해제 시도
                            try:
                                unsubscribe_url = f"https://graph.instagram.com/v25.0/{page_id}/subscribed_apps"
                                unsubscribe_response = await client.delete(
                                    unsubscribe_url,
                                    params={
                                        "access_token": page_access_token,
                                    },
                                )
                                if unsubscribe_response.is_success:
                                    logger.info(f"   ✅ 기존 구독 해제 성공")
                                else:
                                    error_data = unsubscribe_response.json() if unsubscribe_response.content else {}
                                    error_msg = error_data.get("error", {}).get("message", "Unknown error")
                                    logger.warning(f"   ⚠️ 기존 구독 해제 실패: {error_msg}")
                                    logger.warning(f"   → 다른 앱의 토큰으로는 구독 해제가 실패할 수 있습니다.")
                            except Exception as e:
                                logger.warning(f"   ⚠️ 기존 구독 해제 중 오류: {str(e)}")
                
                # 올바른 앱으로 웹훅 구독
                # 참고: /subscribed_apps API는 Page Access Token을 사용하지만,
                # 어떤 앱으로 구독되는지는 Page Access Token이 어떤 앱의 토큰인지에 따라 결정됩니다.
                # 
                # 해결 방법:
                # 1. App Access Token 사용 시도 (우리 앱으로 구독)
            # Instagram Business Login: Always use graph.instagram.com for webhook subscriptions
            app_access_token = f"{self.settings.meta_app_id}|{self.settings.meta_app_secret.get_secret_value()}"
            subscribe_url = f"https://graph.instagram.com/v25.0/{page_id}/subscribed_apps"
            
            logger.info(f"🔔 Instagram Native 웹훅 구독 시도...")
            logger.info(f"   웹훅 URL: {webhook_url}")
            
            # 방법 1: App Access Token으로 구독 시도
            logger.info(f"   방법 1: App Access Token 사용...")
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    subscribe_url,
                    params={
                        "access_token": app_access_token,
                        "subscribed_fields": "messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads,comments,mentions",
                    },
                )
                
                # 방법 2: 실패하면 Page Access Token으로 재시도
                if not response.is_success:
                    error_data = response.json() if response.content else {}
                    logger.warning(f"   ⚠️ 방법 1 실패: {error_data.get('error', {}).get('message', 'Unknown error')}")
                    logger.info(f"   방법 2: Page Access Token으로 재시도...")
                    response = await client.post(
                        subscribe_url,
                        params={
                            "access_token": page_access_token,
                            "subscribed_fields": "messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads,comments,mentions",
                        },
                    )
                
                if response.is_success:
                    data = response.json()
                    if data.get("success"):
                        logger.info(f"✅ 웹훅 구독 성공: page_id={page_id}")
                        return True
                    else:
                        logger.warning(f"⚠️ 웹훅 구독 실패 (success=false): {data}")
                        return False
                else:
                    error_data = response.json() if response.content else {}
                    logger.error(f"❌ 웹훅 구독 API 호출 실패: {error_data.get('error', {}).get('message', 'Unknown error')}")
                    return False
                    return False
        except Exception as e:
            logger.error(f"❌ Page 웹훅 구독 중 예외 발생: page_id={page_id}, error={str(e)}")

            logger.debug(traceback.format_exc())
            return False

    async def subscribe_all_webhooks(self, db: AsyncSession) -> dict:
        """
        모든 활성 Instagram 계정을 웹훅에 일괄 구독합니다.
        서버 재시작이나 웹훅 URL 변경 시 유용합니다.
        """
        accounts = await self.customer_service.get_all_active_instagram_accounts(db)
        
        results = {
            "total": len(accounts),
            "success": 0,
            "failed": 0,
            "details": []
        }
        
        logger.info(f"🔄 웹훅 일괄 구독 시작: 총 {len(accounts)}개 계정")
        
        for account in accounts:
            try:
                if not account.page_id or not account.access_token:
                    continue
                    
                subscribed = await self.subscribe_page_to_webhook(
                    page_id=account.page_id,
                    page_access_token=account.access_token
                )
                
                if subscribed:
                    results["success"] += 1
                else:
                    results["failed"] += 1
                    results["details"].append({
                        "customer_id": str(account.customer_id),
                        "page_id": account.page_id,
                        "error": "Subscription failed"
                    })
            except Exception as e:
                results["failed"] += 1
                results["details"].append({
                    "customer_id": str(account.customer_id),
                    "page_id": account.page_id,
                    "error": str(e)
                })
        
        logger.info(f"✅ 웹훅 일괄 구독 완료: 성공 {results['success']}, 실패 {results['failed']}")
        return results

    async def _get_pages(self, access_token: str) -> list[MetaPageInfo]:
        """
        User Access Token으로 /me/accounts API를 호출하여 Page Access Token을 획득합니다.
        
        공식 문서에 따르면:
        1. User Access Token으로 /me/accounts 호출
        2. 각 페이지 객체의 'access_token' 필드가 바로 Page Access Token
        3. 이 Page Access Token으로 웹훅 구독 및 메시지 전송 가능
        
        추가 방법:
        - Facebook User ID를 얻어서 /{user-id}/accounts 호출 시도
        - 페이지 ID를 알고 있으면 직접 조회 시도
        """
        if access_token.startswith("IGAAV"):
            logger.info("Instagram Basic Display token detected in _get_pages. Skipping.")
            return []
            
        async with httpx.AsyncClient() as client:
            # 🔥 방법 0: Facebook User ID 획득
            facebook_user_id = None
            try:
                me_response = await client.get(
                    self.ME_URL,
                    params={
                        "access_token": access_token,
                        "fields": "id",
                    },
                    timeout=5.0,
                )
                if me_response.is_success:
                    me_data = me_response.json()
                    facebook_user_id = me_data.get("id")
                    logger.info(f"✅ Facebook User ID 획득: {facebook_user_id}")
            except Exception as e:
                logger.debug(f"Facebook User ID 획득 실패 (무시): {str(e)}")
            
            # 🔥 핵심: User Access Token으로 /me/accounts 호출하여 Page Access Token 획득
            logger.info(f"🔍 방법 1: User Access Token으로 /me/accounts 호출하여 Page Access Token 획득 시도...")
            logger.info(f"   API: GET {self.PAGES_URL}")
            logger.info(f"   fields: id,name,access_token,instagram_business_account{{id,username,profile_picture_url}}")
            
            # 방법 1: 기본 호출
            response = await client.get(
                self.PAGES_URL,
                params={
                    "access_token": access_token,
                    "fields": "id,name,access_token,instagram_business_account{id,username,profile_picture_url}",
                    "limit": 100,  # 최대 100개까지 요청
                },
                timeout=10.0,
            )
            
            # 만약 빈 배열이면, limit 없이 다시 시도
            if response.is_success:
                temp_data = response.json()
                if not temp_data.get("data") or len(temp_data.get("data", [])) == 0:
                    logger.info(f"   ⚠️ limit 파라미터로도 빈 배열 반환. limit 없이 재시도...")
                    response = await client.get(
                        self.PAGES_URL,
                        params={
                            "access_token": access_token,
                            "fields": "id,name,access_token,instagram_business_account{id,username,profile_picture_url}",
                        },
                        timeout=10.0,
                    )
                    
                    # 여전히 빈 배열이면 /{user-id}/accounts 시도
                    if response.is_success:
                        temp_data2 = response.json()
                        if (not temp_data2.get("data") or len(temp_data2.get("data", [])) == 0) and facebook_user_id:
                            logger.info(f"   ⚠️ /me/accounts도 빈 배열 반환. /{facebook_user_id}/accounts 시도...")
                            try:
                                user_accounts_response = await client.get(
                                    f"https://graph.instagram.com/v25.0/{facebook_user_id}/accounts",
                                    params={
                                        "access_token": access_token,
                                        "fields": "id,name,access_token,instagram_business_account{id,username,profile_picture_url}",
                                        "limit": 100,
                                    },
                                    timeout=10.0,
                                )
                                if user_accounts_response.is_success:
                                    user_accounts_data = user_accounts_response.json()
                                    if user_accounts_data.get("data") and len(user_accounts_data.get("data", [])) > 0:
                                        logger.info(f"   ✅ /{facebook_user_id}/accounts에서 페이지 발견! 응답 교체")
                                        response = user_accounts_response
                            except Exception as e:
                                logger.debug(f"   /{facebook_user_id}/accounts 시도 실패 (무시): {str(e)}")
            
            # 응답 상태 코드 로깅
            logger.info(f"   응답 상태 코드: {response.status_code}")
            
            response.raise_for_status()
            data = response.json()
            
            # 응답 데이터 로깅
            pages_count = len(data.get("data", []))
            logger.info(f"   /me/accounts 응답: {pages_count}개 페이지 발견")
            
            if pages_count > 0:
                logger.info(f"   ✅ /me/accounts 성공! 각 페이지의 'access_token' 필드가 Page Access Token입니다.")
                for idx, page in enumerate(data.get("data", []), 1):
                    page_id = page.get("id", "N/A")
                    page_name = page.get("name", "N/A")
                    page_token = page.get("access_token", "")
                    ig_account = page.get("instagram_business_account", {})
                    ig_id = ig_account.get("id", "N/A") if ig_account else "N/A"
                    ig_username = ig_account.get("username", "N/A") if ig_account else "N/A"
                    
                    logger.info(f"   페이지 #{idx}:")
                    logger.info(f"      - page_id: {page_id}")
                    logger.info(f"      - page_name: {page_name}")
                    logger.info(f"      - page_access_token: {'✅ 있음' if page_token else '❌ 없음'}")
                    logger.info(f"      - instagram_user_id: {ig_id}")
                    logger.info(f"      - instagram_username: {ig_username}")
            
            # 만약 빈 배열이면, 공식 문서에 따르면 사용자가 페이지에 대해 
            # MANAGE, CREATE_CONTENT, MODERATE, 또는 ADVERTISE 작업을 수행할 수 있는 권한이 없다는 의미
            if not data.get("data") or len(data.get("data", [])) == 0:
                logger.warning(f"⚠️ /me/accounts가 빈 배열을 반환했습니다.")
                logger.warning(f"")
                logger.warning(f"   📚 공식 문서 설명:")
                logger.warning(f"   /me/accounts는 사용자가 관리할 수 있는 페이지 목록을 반환합니다.")
                logger.warning(f"   각 페이지 객체의 'access_token' 필드가 바로 Page Access Token입니다.")
                logger.warning(f"   빈 배열은 다음 중 하나를 의미할 수 있습니다:")
                logger.warning(f"   1. 사용자가 페이지에 대해 MANAGE, CREATE_CONTENT, MODERATE, ADVERTISE 작업 권한이 없음")
                logger.warning(f"   2. Facebook 비즈니스 통합 설정에서 페이지 권한이 제대로 승인되지 않음")
                logger.warning(f"   3. 페이지 역할이 관리자/편집자가 아님")
                logger.warning(f"")
                logger.warning(f"   🔧 해결 방법:")
                logger.warning(f"   1. Facebook 페이지 설정 → '페이지 역할' 확인 (관리자 또는 편집자 권한 필요)")
                logger.warning(f"   2. Facebook 비즈니스 통합 설정에서 페이지 권한 재승인")
                logger.warning(f"   3. Meta OAuth 재인증 (auth_type=reauthenticate로 강제 재인증)")
                logger.warning(f"   4. 필요한 스코프 확인: pages_show_list, pages_read_engagement, pages_manage_metadata")
                
                # 토큰 디버그로 granular_scopes 확인
                try:
                    debug_info = await self.debug_token(access_token)
                    scopes = debug_info.get("data", {}).get("scopes", [])
                    granular_scopes = debug_info.get("data", {}).get("granular_scopes", [])
                    
                    logger.info(f"   토큰 스코프: {scopes}")
                    logger.info(f"   Granular 스코프: {granular_scopes}")
                    
                    # pages_show_list의 target_ids 확인
                    pages_target_ids = []
                    for gs in granular_scopes:
                        if gs.get("scope") == "pages_show_list":
                            pages_target_ids = gs.get("target_ids", [])
                            break
                    
                    # instagram_basic의 target_ids도 확인 (사용자가 선택한 Instagram 계정)
                    instagram_target_ids = []
                    for gs in granular_scopes:
                        if gs.get("scope") == "instagram_basic":
                            instagram_target_ids = gs.get("target_ids", [])
                            break
                    
                    if instagram_target_ids:
                        logger.info(f"   instagram_basic target_ids 발견: {instagram_target_ids}")
                        logger.info(f"   🔍 사용자가 선택한 Instagram 계정을 직접 조회 시도...")
                        
                        # Instagram 계정 ID로 페이지 찾기
                        for instagram_user_id in instagram_target_ids:
                            try:
                                logger.info(f"   Instagram 계정 {instagram_user_id}로 연결된 페이지 찾기 시도...")
                                
                                # Instagram Graph API로 페이지 정보 조회
                                ig_response = await client.get(
                                    f"https://graph.instagram.com/v25.0/{instagram_user_id}",
                                    params={
                                        "access_token": access_token,
                                        "fields": "id,username,profile_picture_url",
                                    },
                                    timeout=10.0,
                                )
                                
                                if ig_response.is_success:
                                    ig_data = ig_response.json()
                                    logger.info(f"   ✅ Instagram 계정 {instagram_user_id} 조회 성공: @{ig_data.get('username')}")
                                    
                                    # 이 Instagram 계정이 연결된 페이지 찾기 (모든 페이지 조회)
                                    if pages_target_ids:
                                        for page_id in pages_target_ids:
                                            try:
                                                page_check = await client.get(
                                                    f"https://graph.instagram.com/v25.0/{page_id}",
                                                    params={
                                                        "access_token": access_token,
                                                        "fields": "id,name,access_token,instagram_business_account{id,username}",
                                                    },
                                                    timeout=10.0,
                                                )
                                                
                                                if page_check.is_success:
                                                    page_check_data = page_check.json()
                                                    ig_account = page_check_data.get("instagram_business_account", {})
                                                    if isinstance(ig_account, dict) and ig_account.get("id") == instagram_user_id:
                                                        logger.info(f"   ✅ Instagram 계정 {instagram_user_id}가 페이지 {page_id}에 연결됨!")
                                                        # 이미 data["data"]에 추가되어 있는지 확인
                                                        existing = next((p for p in data.get("data", []) if p.get("id") == page_id), None)
                                                        if not existing:
                                                            if "data" not in data:
                                                                data["data"] = []
                                                            data["data"].append(page_check_data)
                                                            logger.info(f"   ✅ 페이지 {page_id} 추가 완료!")
                                            except Exception as e:
                                                logger.debug(f"   페이지 {page_id} 확인 실패 (무시): {str(e)}")
                            except Exception as e:
                                logger.warning(f"   ⚠️ Instagram 계정 {instagram_user_id} 조회 실패: {str(e)}")
                    
                    if pages_target_ids:
                        logger.info(f"   pages_show_list target_ids 발견: {pages_target_ids}")
                        logger.info(f"   🔍 target_ids에 있는 모든 페이지를 직접 조회 시도...")
                        
                        # target_ids에 있는 모든 페이지 ID를 직접 조회
                        for page_id in pages_target_ids:
                            try:
                                logger.info(f"   페이지 {page_id} 직접 조회 시도...")
                                
                                # 방법 1: 기본 필드로 조회
                                page_response = await client.get(
                                    f"https://graph.instagram.com/v25.0/{page_id}",
                                    params={
                                        "access_token": access_token,
                                        "fields": "id,name,access_token,instagram_business_account{id,username,profile_picture_url}",
                                    },
                                    timeout=10.0,
                                )
                                
                                page_access_token = None
                                page_data = None
                                
                                if page_response.is_success:
                                    page_data = page_response.json()
                                    page_access_token = page_data.get("access_token", "")
                                    page_name = page_data.get("name", f"Page {page_id}")
                                    ig_account = page_data.get("instagram_business_account")
                                    
                                    if page_access_token:
                                        logger.info(f"   ✅ 페이지 {page_id} ({page_name}) 조회 성공! Page Access Token 획득!")
                                        
                                        # instagram_business_account가 있으면 추가
                                        if ig_account and isinstance(ig_account, dict):
                                            logger.info(f"      Instagram Business Account 연결됨: {ig_account.get('id')} (@{ig_account.get('username')})")
                                        
                                        # data["data"]에 추가
                                        if "data" not in data:
                                            data["data"] = []
                                        
                                        # 이미 같은 page_id가 있는지 확인
                                        existing_page = next((p for p in data["data"] if p.get("id") == page_id), None)
                                        if not existing_page:
                                            data["data"].append(page_data)
                                            logger.info(f"   ✅ 페이지 {page_id} ({page_name}) 추가 완료!")
                                        else:
                                            # 기존 항목 업데이트 (access_token이 있으면)
                                            if page_access_token:
                                                existing_page["access_token"] = page_access_token
                                                existing_page["name"] = page_name
                                                if ig_account:
                                                    existing_page["instagram_business_account"] = ig_account
                                                logger.info(f"   ✅ 기존 페이지 {page_id} 업데이트: Page Access Token 추가됨!")
                                    else:
                                        logger.warning(f"   ⚠️ 페이지 {page_id} 조회 성공했지만 Page Access Token이 없습니다. 추가 방법 시도...")
                                        
                                        # 방법 2: access_token 필드만 명시적으로 요청
                                        try:
                                            token_only_response = await client.get(
                                                f"https://graph.instagram.com/v25.0/{page_id}",
                                                params={
                                                    "access_token": access_token,
                                                    "fields": "access_token",
                                                },
                                                timeout=10.0,
                                            )
                                            
                                            if token_only_response.is_success:
                                                token_data = token_only_response.json()
                                                page_access_token = token_data.get("access_token", "")
                                                if page_access_token:
                                                    logger.info(f"   ✅ 방법 2로 Page Access Token 획득 성공!")
                                                    if page_data:
                                                        page_data["access_token"] = page_access_token
                                                    else:
                                                        page_data = {
                                                            "id": page_id,
                                                            "name": page_name or f"Page {page_id}",
                                                            "access_token": page_access_token,
                                                            "instagram_business_account": ig_account if ig_account else None
                                                        }
                                                    
                                                    # data["data"]에 추가/업데이트
                                                    if "data" not in data:
                                                        data["data"] = []
                                                    
                                                    existing_page = next((p for p in data["data"] if p.get("id") == page_id), None)
                                                    if not existing_page:
                                                        data["data"].append(page_data)
                                                    else:
                                                        existing_page["access_token"] = page_access_token
                                                        if page_name:
                                                            existing_page["name"] = page_name
                                                        if ig_account:
                                                            existing_page["instagram_business_account"] = ig_account
                                                else:
                                                    logger.warning(f"   ⚠️ 방법 2로도 Page Access Token을 가져올 수 없습니다.")
                                        except Exception as e2:
                                            logger.debug(f"   방법 2 시도 실패 (예상됨): {str(e2)}")
                                        
                                        # 방법 3: refresh_page_access_token 메서드 활용
                                        if not page_access_token:
                                            try:
                                                logger.info(f"   🔄 refresh_page_access_token 메서드로 시도...")
                                                page_access_token = await self.refresh_page_access_token(access_token, page_id)
                                                if page_access_token:
                                                    logger.info(f"   ✅ 방법 3으로 Page Access Token 획득 성공!")
                                                    if page_data:
                                                        page_data["access_token"] = page_access_token
                                                    else:
                                                        page_data = {
                                                            "id": page_id,
                                                            "name": page_name or f"Page {page_id}",
                                                            "access_token": page_access_token,
                                                            "instagram_business_account": ig_account if ig_account else None
                                                        }
                                                    
                                                    # data["data"]에 추가/업데이트
                                                    if "data" not in data:
                                                        data["data"] = []
                                                    
                                                    existing_page = next((p for p in data["data"] if p.get("id") == page_id), None)
                                                    if not existing_page:
                                                        data["data"].append(page_data)
                                                    else:
                                                        existing_page["access_token"] = page_access_token
                                                        if page_name:
                                                            existing_page["name"] = page_name
                                                        if ig_account:
                                                            existing_page["instagram_business_account"] = ig_account
                                                else:
                                                    logger.warning(f"   ⚠️ 방법 3으로도 Page Access Token을 가져올 수 없습니다.")
                                            except Exception as e3:
                                                logger.debug(f"   방법 3 시도 실패 (예상됨): {str(e3)}")
                                else:
                                    error_data = page_response.json() if page_response.content else {}
                                    error_msg = error_data.get("error", {}).get("message", "Unknown error")
                                    logger.warning(f"   ⚠️ 페이지 {page_id} 직접 조회 실패: {page_response.status_code} - {error_msg}")
                            except Exception as e:
                                logger.warning(f"   ⚠️ 페이지 {page_id} 직접 조회 중 오류: {str(e)}")
                        
                        # data["data"]가 채워졌으면 pages를 다시 구성
                        if data.get("data"):
                            logger.info(f"   ✅ target_ids에서 {len(data['data'])}개 페이지 조회 완료!")
                    
                    # Instagram Basic 권한의 target_ids 확인
                    instagram_target_ids = []
                    for gs in granular_scopes:
                        if gs.get("scope") == "instagram_basic":
                            instagram_target_ids = gs.get("target_ids", [])
                            break
                    
                    logger.info(f"   instagram_basic target_ids: {instagram_target_ids if instagram_target_ids else '없음 (Instagram 계정 ID를 직접 찾아야 함)'}")
                    
                    # 🔥 핵심 개선: pages_target_ids와 instagram_target_ids가 모두 있으면 조합해서 페이지 정보 생성
                    if pages_target_ids and instagram_target_ids and not data.get("data"):
                        logger.info(f"   ✅ pages_show_list와 instagram_basic의 target_ids를 조합하여 페이지 정보 생성 시도...")
                        
                        for page_id in pages_target_ids:
                            for instagram_user_id in instagram_target_ids:
                                try:
                                    logger.info(f"   페이지 {page_id} + Instagram {instagram_user_id} 조합 시도...")
                                    
                                    # Instagram 계정 정보 조회 (pages_read_engagement 권한 없이도 가능)
                                    instagram_response = await client.get(
                                        f"https://graph.instagram.com/v25.0/{instagram_user_id}",
                                        params={
                                            "access_token": access_token,
                                            "fields": "id,username,profile_picture_url",
                                        },
                                        timeout=10.0,
                                    )
                                    
                                    if instagram_response.is_success:
                                        instagram_data = instagram_response.json()
                                        username = instagram_data.get("username")
                                        profile_picture_url = instagram_data.get("profile_picture_url")
                                        
                                        logger.info(f"   ✅ Instagram 계정 정보 조회 성공: {username}")
                                        
                                        # 페이지 기본 정보 생성
                                        # 페이지 이름과 Page Access Token은 나중에 획득 시도 (pages_read_engagement 권한이 없어도 기본 정보는 생성 가능)
                                        page_data = {
                                            "id": page_id,
                                            "name": f"Page {page_id}",  # 기본 이름 (나중에 업데이트 가능)
                                            "access_token": "",  # Page Access Token은 나중에 획득 시도
                                            "instagram_business_account": {
                                                "id": instagram_user_id,
                                                "username": username,
                                                "profile_picture_url": profile_picture_url,
                                            }
                                        }
                                        
                                        if "data" not in data:
                                            data["data"] = []
                                        
                                        # 중복 확인
                                        existing_page = next((p for p in data["data"] if p.get("id") == page_id), None)
                                        if not existing_page:
                                            data["data"].append(page_data)
                                            logger.info(f"   ✅ 페이지 {page_id} + Instagram {instagram_user_id} (@{username}) 조합 추가 완료!")
                                        else:
                                            # 기존 항목에 Instagram 정보 업데이트
                                            existing_page["instagram_business_account"] = page_data["instagram_business_account"]
                                            logger.info(f"   ✅ 기존 페이지 {page_id}에 Instagram 정보 업데이트: @{username}")
                                    else:
                                        logger.warning(f"   ⚠️ Instagram 계정 {instagram_user_id} 조회 실패: {instagram_response.status_code}")
                                        logger.warning(f"      응답: {instagram_response.text[:200]}")
                                except Exception as e:
                                    logger.warning(f"   ⚠️ 페이지 {page_id} + Instagram {instagram_user_id} 조합 중 오류: {str(e)}")
                        
                        if data.get("data"):
                            logger.info(f"   ✅ target_ids 조합으로 {len(data['data'])}개 페이지 생성 완료!")
                    
                    # 🔥 추가: granular_scopes에 target_ids가 없어도, Instagram 계정 정보를 가져올 수 있는 다른 방법 시도
                    if not instagram_target_ids and not data.get("data"):
                        logger.info(f"   ⚠️ granular_scopes에 instagram_basic target_ids가 없습니다.")
                        logger.info(f"   🔍 Instagram 계정 정보를 가져오기 위해 다른 방법을 시도합니다...")
                        
                        # 방법: /me/accounts 대신 페이지 ID를 알고 있다면 직접 조회 시도
                        # 하지만 먼저 Instagram 계정 ID를 찾아야 함
                        # Instagram 계정 ID는 이미 데이터베이스에 저장되어 있을 수 있음
                        
                        # Instagram 계정 ID로 직접 정보 가져오기 (pages_read_engagement 권한 없이도 가능)
                        for instagram_user_id in instagram_target_ids:
                            try:
                                logger.info(f"   Instagram 계정 {instagram_user_id} 정보 조회 시도...")
                                
                                # Instagram Graph API로 계정 정보 가져오기
                                instagram_response = await client.get(
                                    f"https://graph.instagram.com/v25.0/{instagram_user_id}",
                                    params={
                                        "access_token": access_token,
                                        "fields": "id,username,profile_picture_url",
                                    },
                                )
                                
                                if instagram_response.is_success:
                                    instagram_data = instagram_response.json()
                                    username = instagram_data.get("username")
                                    logger.info(f"   ✅ Instagram 계정 정보 조회 성공: {username}")
                                    
                                    # 페이지 정보는 페이지 ID만 사용 (Instagram 계정 정보는 Instagram API에서 가져옴)
                                    if pages_target_ids:
                                        # 첫 번째 페이지 ID 사용
                                        page_id = pages_target_ids[0]
                                        
                                        # 🔥 Page Access Token 획득 시도
                                        page_access_token = None
                                        try:
                                            # User Access Token으로 페이지 정보 가져오기 (Page Access Token 포함)
                                            page_token_response = await client.get(
                                                f"https://graph.instagram.com/v25.0/{page_id}",
                                                params={
                                                    "access_token": access_token,
                                                    "fields": "id,name,access_token",
                                                },
                                                timeout=10.0,
                                            )
                                            if page_token_response.is_success:
                                                page_token_data = page_token_response.json()
                                                page_access_token = page_token_data.get("access_token")
                                                if page_access_token:
                                                    logger.info(f"   ✅ Page Access Token 획득 성공: page_id={page_id}")
                                                else:
                                                    logger.warning(f"   ⚠️ Page Access Token이 응답에 없습니다: page_id={page_id}")
                                            else:
                                                logger.warning(f"   ⚠️ Page Access Token 조회 실패: {page_token_response.status_code}")
                                        except Exception as e:
                                            logger.warning(f"   ⚠️ Page Access Token 획득 중 오류: {str(e)}")
                                        
                                        # 페이지 기본 정보
                                        page_data = {
                                            "id": page_id,
                                            "name": f"Page {page_id}",  # 이름은 나중에 가져올 수 있음
                                            "access_token": page_access_token or "",  # 획득한 Page Access Token 사용
                                            "instagram_business_account": {
                                                "id": instagram_user_id,
                                                "username": username,
                                            }
                                        }
                                        
                                        if "data" not in data:
                                            data["data"] = []
                                        data["data"].append(page_data)
                                        logger.info(f"   ✅ 페이지 {page_id} + Instagram {instagram_user_id} 조합 추가 (Page Access Token: {'있음' if page_access_token else '없음'})")
                                else:
                                    logger.warning(f"   ⚠️ Instagram 계정 {instagram_user_id} 조회 실패: {instagram_response.status_code}")
                            except Exception as e:
                                logger.warning(f"   ⚠️ Instagram 계정 {instagram_user_id} 조회 중 오류: {str(e)}")
                        
                        # 페이지 ID로 직접 조회 시도 (pages_show_list target_ids 사용)
                        # User Access Token으로 /me/accounts를 다시 호출하여 각 페이지의 Page Access Token 획득 시도
                        logger.info(f"   🔍 User Access Token으로 /me/accounts 재호출하여 Page Access Token 획득 시도...")
                        logger.info(f"   📌 참고: Facebook 비즈니스 관리자를 통해 접근하는 경우, /me/accounts가 빈 배열을 반환할 수 있습니다.")
                        logger.info(f"   📌 하지만 granular_scopes의 target_ids를 사용하여 직접 페이지 정보를 가져올 수 있습니다.")
                        try:
                            # User Access Token으로 /me/accounts 호출 (Page Access Token 획득용)
                            # limit 파라미터를 명시적으로 추가
                            accounts_response = await client.get(
                                "https://graph.instagram.com/v25.0/me/accounts",
                                params={
                                    "access_token": access_token,
                                    "fields": "id,name,access_token,instagram_business_account{id,username,profile_picture_url}",
                                    "limit": 100,
                                },
                                timeout=10.0,
                            )
                            if accounts_response.is_success:
                                accounts_data = accounts_response.json()
                                accounts_pages = accounts_data.get("data", [])
                                logger.info(f"   /me/accounts 재호출 결과: {len(accounts_pages)}개 페이지 발견")
                                
                                if len(accounts_pages) == 0:
                                    logger.warning(f"   ⚠️ /me/accounts 재호출도 빈 배열을 반환했습니다.")
                                    logger.warning(f"   📋 이것은 Facebook API의 알려진 문제일 수 있습니다.")
                                    logger.warning(f"   📋 Facebook 비즈니스 관리자에서 Full Access 권한이 있어도, API 레벨에서는 빈 배열을 반환할 수 있습니다.")
                                    logger.warning(f"   📋 대안: granular_scopes의 target_ids를 사용하여 페이지 정보를 직접 조회합니다.")
                                    
                                    # 🔥 추가: 알려진 페이지 ID들로 직접 조회 시도 (fallback)
                                    # ⚠️ 하드코딩 제거: Supabase에서 실제 데이터를 가져와야 함
                                    # known_page_ids = ["877570858772457"]  # MukBo 페이지 ID
                                    # logger.info(f"   🔍 알려진 페이지 ID로 직접 조회 시도: {known_page_ids}")
                                    
                                    # 하드코딩된 페이지 ID 사용하지 않음 - Supabase에서 동적으로 가져와야 함
                                    known_page_ids = []
                                    
                                    for known_page_id in known_page_ids:
                                        try:
                                            logger.info(f"   페이지 {known_page_id} 직접 조회 시도...")
                                            page_response = await client.get(
                                                f"https://graph.instagram.com/v25.0/{known_page_id}",
                                                params={
                                                    "access_token": access_token,
                                                    "fields": "id,name,access_token,instagram_business_account{id,username,profile_picture_url}",
                                                },
                                                timeout=10.0,
                                            )
                                            
                                            if page_response.is_success:
                                                page_data = page_response.json()
                                                page_access_token = page_data.get("access_token", "")
                                                page_name = page_data.get("name", f"Page {known_page_id}")
                                                ig_account = page_data.get("instagram_business_account")
                                                
                                                if page_access_token or ig_account:
                                                    logger.info(f"   ✅ 페이지 {known_page_id} ({page_name}) 조회 성공!")
                                                    if page_access_token:
                                                        logger.info(f"      Page Access Token 획득!")
                                                    if ig_account:
                                                        logger.info(f"      Instagram Business Account 연결됨: {ig_account.get('id')} (@{ig_account.get('username')})")
                                                    
                                                    # data["data"]에 추가
                                                    if "data" not in data:
                                                        data["data"] = []
                                                    
                                                    existing_page = next((p for p in data["data"] if p.get("id") == known_page_id), None)
                                                    if not existing_page:
                                                        data["data"].append(page_data)
                                                        logger.info(f"   ✅ 페이지 {known_page_id} ({page_name}) 추가 완료!")
                                                    else:
                                                        logger.info(f"   ℹ️ 페이지 {known_page_id}는 이미 목록에 있습니다.")
                                                else:
                                                    logger.warning(f"   ⚠️ 페이지 {known_page_id} 조회 성공했지만 Page Access Token과 Instagram 계정 정보가 없습니다.")
                                            else:
                                                logger.warning(f"   ⚠️ 페이지 {known_page_id} 직접 조회 실패: {page_response.status_code}")
                                                logger.warning(f"      응답: {page_response.text[:200]}")
                                        except Exception as e:
                                            logger.warning(f"   ⚠️ 페이지 {known_page_id} 직접 조회 중 오류: {str(e)}")
                                    
                                    if data.get("data"):
                                        logger.info(f"   ✅ 알려진 페이지 ID로 {len(data['data'])}개 페이지 조회 완료!")
                                
                                # target_ids와 매칭되는 페이지 찾기
                                found_pages = False
                                for page_id in pages_target_ids:
                                    for account_page in accounts_pages:
                                        if account_page.get("id") == page_id:
                                            logger.info(f"   ✅ 페이지 {page_id}의 Page Access Token 발견!")
                                            # 이미 추가되었는지 확인
                                            existing_idx = None
                                            for idx, p in enumerate(data.get("data", [])):
                                                if p.get("id") == page_id:
                                                    existing_idx = idx
                                                    break
                                            
                                            if existing_idx is not None:
                                                # 기존 항목의 access_token 업데이트
                                                data["data"][existing_idx]["access_token"] = account_page.get("access_token", "")
                                                data["data"][existing_idx]["name"] = account_page.get("name", data["data"][existing_idx].get("name", f"Page {page_id}"))
                                                # instagram_business_account도 업데이트
                                                if "instagram_business_account" not in data["data"][existing_idx]:
                                                    data["data"][existing_idx]["instagram_business_account"] = account_page.get("instagram_business_account")
                                                logger.info(f"   ✅ 기존 페이지 항목 업데이트: access_token 추가됨")
                                            else:
                                                # 새로 추가
                                                if "data" not in data:
                                                    data["data"] = []
                                                data["data"].append(account_page)
                                                logger.info(f"   ✅ 페이지 {page_id} 추가: Page Access Token 포함")
                                            found_pages = True
                                            break
                                    if found_pages:
                                        break
                        except Exception as e:
                            logger.debug(f"   /me/accounts 재호출 실패 (예상됨): {str(e)}")
                        
                        # 🔥 추가 시도: 페이지 ID로 직접 조회 (하지만 User Access Token으로는 Page Access Token을 못 가져올 수 있음)
                        # 이 방법은 페이지 이름 등 기본 정보만 가져올 수 있음
                        for page_id in pages_target_ids:
                            try:
                                # 이미 추가되었는지 확인 (access_token이 있는 경우)
                                existing_with_token = any(p.get("id") == page_id and p.get("access_token") and p.get("access_token").strip() for p in data.get("data", []))
                                if existing_with_token:
                                    continue  # 이미 access_token이 있으면 스킵
                                
                                # pages_manage_metadata 또는 pages_read_engagement 권한으로 시도
                                # 참고: User Access Token으로는 access_token 필드가 반환되지 않을 수 있음
                                page_response = await client.get(
                                    f"https://graph.instagram.com/v25.0/{page_id}",
                                    params={
                                        "access_token": access_token,
                                        "fields": "id,name,access_token",
                                    },
                                    timeout=10.0,
                                )
                                if page_response.is_success:
                                    page_data = page_response.json()
                                    if page_data:
                                        # 이미 추가되었는지 확인 (access_token 없이)
                                        existing_idx = None
                                        for idx, p in enumerate(data.get("data", [])):
                                            if p.get("id") == page_id:
                                                existing_idx = idx
                                                break
                                        
                                        if existing_idx is not None:
                                            # 기존 항목의 access_token 업데이트 (있는 경우만)
                                            if page_data.get("access_token") and page_data.get("access_token").strip():
                                                data["data"][existing_idx]["access_token"] = page_data.get("access_token")
                                                data["data"][existing_idx]["name"] = page_data.get("name", data["data"][existing_idx].get("name", f"Page {page_id}"))
                                                logger.info(f"   ✅ 페이지 {page_id}의 access_token 업데이트됨")
                                            elif not data["data"][existing_idx].get("access_token"):
                                                # 기존 항목에 이름만 업데이트 (access_token은 여전히 없음)
                                                data["data"][existing_idx]["name"] = page_data.get("name", data["data"][existing_idx].get("name", f"Page {page_id}"))
                                                logger.info(f"   ℹ️ 페이지 {page_id}의 이름만 업데이트됨 (access_token 없음)")
                                        else:
                                            if "data" not in data:
                                                data["data"] = []
                                            data["data"].append(page_data)
                                            logger.info(f"   ✅ 페이지 {page_id} 직접 조회 성공: {page_data.get('name')} (access_token: {'있음' if page_data.get('access_token') else '없음'})")
                                        
                                        # access_token이 없으면 경고
                                        if not page_data.get("access_token") or not page_data.get("access_token").strip():
                                            logger.warning(f"   ⚠️ 페이지 {page_id}의 access_token을 가져올 수 없습니다.")
                                            logger.warning(f"      → /me/accounts API가 성공해야 Page Access Token을 획득할 수 있습니다.")
                                            logger.warning(f"      → 페이지 권한 확인이 필요합니다 (MANAGE, CREATE_CONTENT, MODERATE, 또는 ADVERTISE)")
                                else:
                                    error_data = page_response.json() if page_response.content else {}
                                    error_msg = error_data.get("error", {}).get("message", "Unknown error")
                                    logger.debug(f"   페이지 {page_id} 직접 조회 실패: {error_msg}")
                            except Exception as e:
                                # pages_read_engagement 권한 없으면 실패할 수 있음 (무시)
                                logger.debug(f"   페이지 {page_id} 직접 조회 실패 (예상됨): {str(e)}")
                except Exception as e:
                    logger.warning(f"   토큰 디버그 실패: {str(e)}")
            
            # 디버깅: 전체 API 응답 로깅
            import json
            logger.info(f"📋 /me/accounts API 응답 (전체): {json.dumps(data, indent=2, ensure_ascii=False)[:2000]}")
            
            logger.info(f"📋 /me/accounts API 응답: 총 {len(data.get('data', []))}개의 페이지 발견")
            
            pages = []
            all_pages_data = data.get("data", [])
            
            for idx, page_data in enumerate(all_pages_data):
                page_id = page_data.get("id", "")
                page_name = page_data.get("name", "")
                
                # instagram_business_account 필드 확인 (다양한 형식 대응)
                instagram_account_raw = page_data.get("instagram_business_account")
                instagram_account = {}
                
                if instagram_account_raw:
                    if isinstance(instagram_account_raw, dict):
                        instagram_account = instagram_account_raw
                    elif isinstance(instagram_account_raw, str):
                        # ID만 문자열로 온 경우
                        instagram_account = {"id": instagram_account_raw}
                
                has_instagram = bool(instagram_account and instagram_account.get("id"))
                
                logger.info(f"   페이지 {idx+1}: page_id={page_id}, page_name={page_name}")
                logger.info(f"      instagram_business_account 원본: {instagram_account_raw}")
                logger.info(f"      instagram_connected={has_instagram}")
                
                # access_token 확인
                page_access_token = page_data.get("access_token", "")
                if not page_access_token:
                    logger.warning(f"      ⚠️ 페이지 {page_id}의 access_token이 없습니다. Page Access Token을 가져올 수 없습니다.")
                
                if has_instagram:
                    instagram_id = instagram_account.get("id")
                    instagram_username = instagram_account.get("username")
                    logger.info(f"      → Instagram ID: {instagram_id}, username: {instagram_username}")
                    logger.info(f"      → Page Access Token: {'있음' if page_access_token else '없음 (필요)'}")
                    
                    pages.append(MetaPageInfo(
                        page_id=page_id,
                        page_name=page_name,
                        access_token=page_data.get("access_token", ""),
                        instagram_user_id=instagram_id,
                        instagram_username=instagram_username,
                    ))
                else:
                    logger.warning(f"      ⚠️ Instagram Business Account가 연결되지 않음")
            
            logger.info(f"✅ Instagram Business Account가 연결된 페이지: {len(pages)}개")
            
            if len(all_pages_data) > 0 and len(pages) == 0:
                logger.warning(f"⚠️ Facebook Page는 {len(all_pages_data)}개 있지만, Instagram Business Account가 연결된 페이지가 없습니다.")
                logger.warning(f"   각 페이지의 instagram_business_account 필드를 확인해주세요.")
            
            # 🔥 추가: 빈 배열이 반환되었지만, Instagram 계정이 있는 경우 직접 페이지 조회 시도
            if len(pages) == 0:
                logger.info(f"   🔍 /me/accounts가 빈 배열을 반환했지만, Instagram 계정 정보로 직접 페이지 조회 시도...")
                logger.info(f"   📌 참고: Facebook 비즈니스 통합 권한이 있어도 Graph API 레벨에서 /me/accounts가 빈 배열을 반환할 수 있습니다.")
                logger.info(f"   📌 이는 Facebook API의 알려진 제한사항입니다.")
                
                # 방법: Instagram Graph API를 통해 연결된 페이지 정보 가져오기
                # Instagram 계정 ID를 알고 있으면, Instagram Graph API로 연결된 페이지 찾기 시도
                if instagram_target_ids:
                    logger.info(f"   🔄 Instagram Graph API를 통해 연결된 페이지 정보 가져오기 시도...")
                    for instagram_user_id in instagram_target_ids:
                        try:
                            # Instagram Graph API로 연결된 Facebook Page 찾기
                            instagram_page_response = await client.get(
                                f"https://graph.instagram.com/v25.0/{instagram_user_id}",
                                params={
                                    "access_token": access_token,
                                    "fields": "connected_facebook_page",
                                },
                                timeout=10.0,
                            )
                            
                            if instagram_page_response.is_success:
                                instagram_page_data = instagram_page_response.json()
                                connected_page = instagram_page_data.get("connected_facebook_page")
                                
                                if connected_page:
                                    if isinstance(connected_page, dict):
                                        connected_page_id = connected_page.get("id")
                                    else:
                                        connected_page_id = str(connected_page)
                                    
                                    if connected_page_id:
                                        logger.info(f"   ✅ Instagram Graph API로 연결된 페이지 발견: {connected_page_id}")
                                        
                                        # 연결된 페이지 ID로 Page Access Token 획득 시도
                                        if connected_page_id in pages_target_ids:
                                            logger.info(f"   🔄 연결된 페이지 {connected_page_id}의 Page Access Token 획득 시도...")
                                            
                                            # 여러 방법으로 Page Access Token 획득 시도
                                            page_token = None
                                            
                                            # 방법 1: 페이지 직접 조회
                                            try:
                                                page_token_response = await client.get(
                                                    f"https://graph.instagram.com/v25.0/{connected_page_id}",
                                                    params={
                                                        "access_token": access_token,
                                                        "fields": "id,name,access_token",
                                                    },
                                                    timeout=10.0,
                                                )
                                                
                                                if page_token_response.is_success:
                                                    page_token_data = page_token_response.json()
                                                    page_token = page_token_data.get("access_token")
                                                    if page_token:
                                                        logger.info(f"   ✅ 방법 1로 Page Access Token 획득 성공!")
                                            except Exception as e:
                                                logger.debug(f"   방법 1 실패: {str(e)}")
                                            
                                            # 방법 2: access_token 필드만 요청
                                            if not page_token:
                                                try:
                                                    token_only_response = await client.get(
                                                        f"https://graph.instagram.com/v25.0/{connected_page_id}",
                                                        params={
                                                            "access_token": access_token,
                                                            "fields": "access_token",
                                                        },
                                                        timeout=10.0,
                                                    )
                                                    
                                                    if token_only_response.is_success:
                                                        token_data = token_only_response.json()
                                                        page_token = token_data.get("access_token", "")
                                                        if page_token:
                                                            logger.info(f"   ✅ 방법 2로 Page Access Token 획득 성공!")
                                                except Exception as e:
                                                    logger.debug(f"   방법 2 실패: {str(e)}")
                                            
                                            # 방법 3: refresh_page_access_token 메서드 활용
                                            if not page_token:
                                                try:
                                                    page_token = await self.refresh_page_access_token(access_token, connected_page_id)
                                                    if page_token:
                                                        logger.info(f"   ✅ 방법 3으로 Page Access Token 획득 성공!")
                                                except Exception as e:
                                                    logger.debug(f"   방법 3 실패: {str(e)}")
                                            
                                            # Page Access Token을 획득했으면 페이지 정보 생성
                                            if page_token:
                                                # Instagram 계정 정보도 가져오기
                                                instagram_info_response = await client.get(
                                                    f"https://graph.instagram.com/v25.0/{instagram_user_id}",
                                                    params={
                                                        "access_token": access_token,
                                                        "fields": "id,username,profile_picture_url",
                                                    },
                                                    timeout=10.0,
                                                )
                                                
                                                instagram_username = None
                                                if instagram_info_response.is_success:
                                                    instagram_info_data = instagram_info_response.json()
                                                    instagram_username = instagram_info_data.get("username")
                                                
                                                # 페이지 이름 가져오기
                                                page_name = f"Page {connected_page_id}"
                                                try:
                                                    page_name_response = await client.get(
                                                        f"https://graph.instagram.com/v25.0/{connected_page_id}",
                                                        params={
                                                            "access_token": access_token,
                                                            "fields": "name",
                                                        },
                                                        timeout=10.0,
                                                    )
                                                    if page_name_response.is_success:
                                                        page_name_data = page_name_response.json()
                                                        page_name = page_name_data.get("name", page_name)
                                                except:
                                                    pass
                                                
                                                # MetaPageInfo 생성
                                                page_info = MetaPageInfo(
                                                    page_id=connected_page_id,
                                                    page_name=page_name,
                                                    access_token=page_token,
                                                    instagram_user_id=instagram_user_id,
                                                    instagram_username=instagram_username,
                                                )
                                                pages.append(page_info)
                                                logger.info(f"   ✅ Instagram Graph API를 통해 페이지 정보 생성 완료: {connected_page_id}")
                                                break  # 첫 번째 성공한 페이지 사용
                        except Exception as e:
                            logger.debug(f"   Instagram Graph API 시도 실패: {str(e)}")
                
                # 여전히 페이지를 찾지 못한 경우
                if len(pages) == 0:
                    logger.warning(f"   ⚠️ /me/accounts API가 빈 배열을 반환했고, Instagram Graph API로도 페이지를 찾지 못했습니다.")
                    logger.warning(f"   📋 이것은 Facebook Graph API의 알려진 제한사항일 수 있습니다.")
                    logger.warning(f"   📋 Facebook 비즈니스 통합에서 모든 권한이 있어도 Graph API에서는 빈 배열을 반환할 수 있습니다.")
                    logger.warning(f"   💡 해결 방법:")
                    logger.warning(f"      1. Facebook Graph API Explorer에서 직접 테스트")
                    logger.warning(f"         - https://developers.facebook.com/tools/explorer/")
                    logger.warning(f"         - User Token으로 /me/accounts 호출")
                    logger.warning(f"      2. Facebook 앱 권한 검수(Review) 확인")
                    logger.warning(f"         - pages_read_engagement, pages_manage_metadata 권한이 검수되었는지 확인")
                    logger.warning(f"      3. Facebook Login for Business 플로우 재실행")
                    logger.warning(f"         - Instagram 프로페셔널 계정 전환 확인")
                    logger.warning(f"         - Facebook Page 생성 및 연결 확인")
            
            return pages

    async def debug_token(self, access_token: str) -> dict:
        """액세스 토큰을 디버그하여 정보를 확인합니다."""
        # App Access Token 또는 User Access Token으로 디버그 토큰 API 호출
        # App Access Token은 app_id|app_secret 형식
        async with httpx.AsyncClient() as client:
            # 먼저 App Access Token으로 시도
            app_access_token = f"{self.settings.meta_app_id}|{self.settings.meta_app_secret.get_secret_value()}"
            try:
                response = await client.get(
                    self.DEBUG_TOKEN_URL,
                    params={
                        "input_token": access_token,
                        "access_token": app_access_token,
                    },
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError:
                # App Access Token으로 실패하면 제공된 토큰 자체를 사용
                response = await client.get(
                    self.DEBUG_TOKEN_URL,
                    params={
                        "input_token": access_token,
                        "access_token": access_token,
                    },
                )
                response.raise_for_status()
                return response.json()

    async def refresh_page_access_token(self, user_access_token: str, page_id: str) -> str:
        """페이지 액세스 토큰을 갱신합니다."""
        async with httpx.AsyncClient() as client:
            # 페이지 정보 가져오기 (페이지 액세스 토큰 포함)
            response = await client.get(
                f"https://graph.instagram.com/v25.0/{page_id}",
                params={
                    "access_token": user_access_token,
                    "fields": "access_token",
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("access_token", "")

    async def get_instagram_user_info(self, access_token: str, instagram_user_id: str) -> dict:
        """Instagram 사용자 ID로부터 계정 정보를 가져옵니다."""
        async with httpx.AsyncClient() as client:
            # Determine base URL based on token prefix
            is_ig_scoped = access_token.startswith("IG")
            base_url = "https://graph.instagram.com" if is_ig_scoped else "https://graph.instagram.com/v25.0"
            
            # Instagram Graph API로 사용자 정보 가져오기
            try:
                response = await client.get(
                    f"{base_url}/{instagram_user_id}",
                    params={
                        "access_token": access_token,
                        "fields": "id,username,profile_picture_url,biography,followers_count,follows_count,media_count,website",
                    },
                )
            except Exception as e:
                logger.error(f"Failed to fetch Instagram user info: {str(e)}")
                raise
            
            if not response.is_success:
                error_data = {}
                try:
                    error_data = response.json()
                except:
                    error_data = {"error": {"message": response.text[:200]}}
                
                error_msg = error_data.get("error", {}).get("message", "Unknown error")
                error_type = error_data.get("error", {}).get("type", "Unknown")
                error_code = error_data.get("error", {}).get("code", response.status_code)
                
                logger.error(f"Instagram API error: {error_type} ({error_code}) - {error_msg}")
                
                raise httpx.HTTPStatusError(
                    message=f"Instagram API error: {error_type} ({error_code}) - {error_msg}",
                    request=response.request,
                    response=response,
                )
            
            return response.json()

