from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List

from app.database import get_db_session
from app.services.contact_service import ContactService
from app.schemas.common import SimpleStatusResponse
from app.routers.admin_auth import get_current_user
from app.models.customer import Customer

router = APIRouter()

@router.get("/list", response_model=List[dict])
async def list_contacts(
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Lists all contacts for a specific customer."""
    customer_id = current_user.id
    service = ContactService(db)
    contacts = await service.list_contacts(customer_id)
    
    # Simple serialization
    return [
        {
            "id": str(c.id),
            "instagram_id": c.instagram_id,
            "username": c.username,
            "full_name": c.full_name,
            "profile_pic": c.profile_pic,
            "tags": c.tags,
            "ai_summary": c.ai_summary,
            "buying_phase": c.buying_phase,
            "engagement_score": c.engagement_score,
            "interaction_count": c.interaction_count,
            "last_interaction_at": c.last_interaction_at.isoformat() if c.last_interaction_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in contacts
    ]

@router.delete("/{contact_id}")
async def delete_contact(
    contact_id: UUID,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Deletes a contact."""
    from app.models.contact import Contact
    from sqlalchemy import delete
    
    # Verify ownership
    await db.execute(
        delete(Contact)
        .where(Contact.id == contact_id)
        .where(Contact.customer_id == current_user.id)
    )
    await db.commit()
    return {"status": "success"}

@router.post("/{contact_id}/tags")
async def update_tags(
    contact_id: UUID,
    tags: List[str],
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """Manually updates tags for a contact."""
    from app.models.contact import Contact
    from sqlalchemy import select
    
    result = await db.execute(
        select(Contact)
        .where(Contact.id == contact_id)
        .where(Contact.customer_id == current_user.id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    contact.tags = tags
    await db.commit()
    return {"status": "success", "tags": contact.tags}
