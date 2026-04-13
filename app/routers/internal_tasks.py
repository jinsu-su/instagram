from fastapi import APIRouter, HTTPException, Security, status, Depends
from fastapi.security.api_key import APIKeyHeader
from app.config import get_settings
from app.database import get_db_session
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.subscription_service import SubscriptionService
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()

API_KEY_NAME = "X-Internal-Token"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def verify_internal_token(token: str = Depends(api_key_header)):
    if not token or token != str(settings.state_secret_key.get_secret_value()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    return token

@router.get("/tasks/refresh-tokens")
async def tasks_refresh_tokens(
    token: str = Depends(verify_internal_token),
    db: AsyncSession = Depends(get_db_session)
):
    """Trigger the Instagram token refresh logic."""
    logger.info("Internal task: Triggering token refresh")
    from app.models.instagram_account import InstagramAccount
    from app.services.meta_oauth import MetaOAuthService
    from sqlalchemy import select
    
    refresh_threshold = timedelta(days=10)
    now = datetime.utcnow()
    
    stmt = select(InstagramAccount).where(
        InstagramAccount.access_token.isnot(None),
        InstagramAccount.connection_status == "CONNECTED"
    )
    result = await db.execute(stmt)
    accounts = result.scalars().all()
    
    refreshed = 0
    failed = 0
    skipped = 0
    
    for account in accounts:
        try:
            # Re-use logic from token_refresh_scheduler
            if account.token_expires_at:
                time_until_expiry = account.token_expires_at - now
                if time_until_expiry.total_seconds() > 0 and time_until_expiry > refresh_threshold:
                    skipped += 1
                    continue
            
            oauth_service = MetaOAuthService.from_settings()
            refresh_result = await oauth_service.auto_refresh_token(account.access_token)
            
            new_token = refresh_result.get("access_token")
            expires_in = refresh_result.get("expires_in")
            
            if new_token:
                account.access_token = new_token
                if expires_in:
                    account.token_expires_at = now + timedelta(seconds=int(expires_in))
                await db.commit()
                refreshed += 1
            else:
                failed += 1
        except Exception as e:
            logger.error(f"Error in token refresh task for {account.customer_id}: {e}")
            failed += 1
            
    return {
        "status": "success",
        "processed": len(accounts),
        "refreshed": refreshed,
        "failed": failed,
        "skipped": skipped
    }

@router.get("/tasks/process-subscriptions")
async def tasks_process_subscriptions(
    token: str = Depends(verify_internal_token),
    db: AsyncSession = Depends(get_db_session)
):
    """Trigger the subscription renewal logic."""
    logger.info("Internal task: Triggering subscription processing")
    service = SubscriptionService(db)
    renewal_results = await service.process_due_subscriptions()
    return {"status": "success", "results": renewal_results}
