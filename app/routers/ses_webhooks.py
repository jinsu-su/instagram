from fastapi import APIRouter, Request, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
from app.database import get_db
from app.models.customer import Customer
from app.utils.logging import get_logger

router = APIRouter(prefix="/api/webhooks/ses", tags=["Webhooks"])
logger = get_logger(__name__)

@router.post("")
async def handle_ses_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Handles AWS SES notifications via SNS.
    Tracks Bounces and Complaints to maintain sender reputation.
    """
    try:
        body = await request.body()
        data = json.loads(body)
        
        # 1. Handle SNS Subscription Confirmation
        if data.get("Type") == "SubscriptionConfirmation":
            subscribe_url = data.get("SubscribeURL")
            logger.info(f"🔔 AWS SNS Subscription Confirmation Target: {subscribe_url}")
            # In a real scenario, you might want to automatically hit this URL or log it for manual confirmation
            return {"status": "ok", "message": "Subscription confirmation received"}

        # 2. Handle Notifications (Bounce/Complaint)
        if data.get("Type") == "Notification":
            message = json.loads(data.get("Message", "{}"))
            notification_type = message.get("notificationType")
            
            if notification_type in ["Bounce", "Complaint"]:
                mail = message.get("mail", {})
                recipients = mail.get("destination", [])
                
                for email in recipients:
                    logger.warning(f"🚨 SES {notification_type} detected for: {email}")
                    
                    # Search and block customer
                    result = await db.execute(select(Customer).where(Customer.email == email))
                    customer = result.scalar_one_or_none()
                    
                    if customer:
                        customer.is_email_blocked = True
                        customer.email_block_reason = notification_type.lower()
                        logger.info(f"🚫 Customer {customer.id} blocked due to {notification_type}")
                
                await db.commit()
                
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"❌ Error processing SES webhook: {e}")
        # Always return 200 to SNS to prevent retries if we've already logged the error
        return {"status": "error", "message": str(e)}
