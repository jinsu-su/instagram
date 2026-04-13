from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from app.models.instagram_account import InstagramAccount
from app.services.meta_oauth import MetaOAuthService
from app.services.instagram_basic_oauth import InstagramBasicOAuthService
from app.services.customer_service import CustomerService
from app.config import Settings, get_settings
from app.utils.logging import get_logger

logger = get_logger(__name__)

class TokenRefreshService:
    def __init__(self, settings: Settings, customer_service: CustomerService):
        self.settings = settings
        self.customer_service = customer_service
        self.meta_oauth = MetaOAuthService(settings, customer_service)
        self.ig_oauth = InstagramBasicOAuthService(settings, customer_service)

    async def get_refreshed_token(self, db: AsyncSession, account: InstagramAccount) -> str:
        """
        토큰이 만료 임박(7일 이내)했다면 갱신하고, 아니면 기존 토큰을 반환합니다.
        """
        access_token = account.access_token
        if not access_token:
            return ""

        # 만료 시간 정보가 없으면 디버깅을 통해 확인 시도
        if not account.token_expires_at:
            logger.info(f"Account {account.instagram_username} has no expiration date. Debugging token...")
            expires_at = await self.meta_oauth.get_token_expiration(access_token)
            if expires_at:
                account.token_expires_at = expires_at
                await db.commit()
                logger.info(f"Updated expiration date for {account.instagram_username}: {expires_at}")
            else:
                # 확인 불가 시 일단 기존 토큰 반환
                return access_token

        # 만료 7일 전인지 확인
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        refresh_threshold = account.token_expires_at - timedelta(days=7)

        if now >= refresh_threshold:
            logger.info(f"Token for {account.instagram_username} is near expiration ({account.token_expires_at}). Refreshing...")
            try:
                # 토큰 타입 확인 (IG... 로 시작하면 Instagram Basic API)
                if access_token.startswith("IG"):
                    new_token, new_expires_at = await self.ig_oauth.refresh_long_lived_token(access_token)
                else:
                    # Meta/Facebook API
                    refresh_result = await self.meta_oauth.refresh_long_lived_token(access_token)
                    new_token = refresh_result.get("access_token")
                    
                    # Meta의 경우 expires_in (초) 또는 debug_token으로 다시 확인
                    expires_in = refresh_result.get("expires_in")
                    if expires_in:
                        new_expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(seconds=expires_in)
                    else:
                        new_expires_at = await self.meta_oauth.get_token_expiration(new_token)

                if new_token:
                    # [STABLE] Model now handles encryption automatically
                    account.access_token = new_token
                    account.token_expires_at = new_expires_at
                    await db.commit()
                    logger.info(f"Successfully refreshed token for {account.instagram_username}. New expiry: {new_expires_at}")
                    return new_token
            except Exception as e:
                logger.error(f"Failed to refresh token for {account.instagram_username}: {str(e)}")
                
                # 🔥 인스타그램 비밀번호 변경 등으로 인한 인증 실패 시 알림
                if "401" in str(e) or "190" in str(e):
                    account.connection_status = "DISCONNECTED"
                    await db.commit()
                    
                    from app.services.activity_service import ActivityService
                    activity_service = ActivityService(db)
                    await activity_service.log_activity(
                        customer_id=account.customer_id,
                        event_type="AUTH_ERROR",
                        trigger_source="system",
                        trigger_text="Token Refresh Failure",
                        action_text=f"인스타그램 계정(@{account.instagram_username})의 자동 토큰 갱신에 실패했습니다. 비밀번호 변경 등이 원인일 수 있으니 재로그인이 필요합니다.",
                        status="FAILED"
                    )
                
                # 갱신 실패 시 기존 토큰이라도 반환 (아직 만료 전일 수 있으므로)
                return access_token

        return access_token
