
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.contact import Contact
from app.utils.logging import get_logger
import os

router = APIRouter(prefix="/api/verification", tags=["Verification"])
logger = get_logger(__name__)

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")

@router.get("/verify-email")
async def verify_email(token: str = Query(...), db: AsyncSession = Depends(get_db)):
    """
    Verifies an email using the token from the magic link.
    Redirects to the frontend success page.
    """
    logger.info(f"Checking verification token: {token}")
    
    result = await db.execute(select(Contact).where(Contact.verification_token == token))
    contact = result.scalar_one_or_none()
    
    if not contact:
        logger.warning(f"❌ Invalid verification token: {token}")
        # Redirect to frontend error page
        return RedirectResponse(f"{FRONTEND_BASE_URL}/verification-failed?reason=invalid_token")
    
    # Update Contact
    contact.is_email_verified = True
    contact.verification_token = None  # Invalidate token after use
    await db.commit()
    
    logger.info(f"✅ Email verified for Contact: {contact.id} ({contact.email})")
    
    # Redirect to frontend success page
    return RedirectResponse(f"{FRONTEND_BASE_URL}/verification-success?email={contact.email}")
