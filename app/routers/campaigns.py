from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.database import get_db_session
from app.services.campaign_service import CampaignService
from app.schemas.campaign import CampaignResponse, CampaignUpdate, CampaignListResponse, CampaignCreate
from app.routers.admin_auth import get_current_user
from app.models.customer import Customer

router = APIRouter()
campaign_service = CampaignService()

@router.get("/list", response_model=CampaignListResponse)
async def list_campaigns(
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Get all campaigns for a specific customer.
    Automatically creates default campaigns if they don't exist.
    """
    customer_id = current_user.id
    try:
        campaigns = await campaign_service.get_campaigns(db, customer_id)
        return {"campaigns": campaigns, "total": len(campaigns)}
    except Exception as e:
        raise HTTPException(status_code=500, detail="서버 내부 오류가 발생했습니다.")

@router.patch("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: UUID = Path(..., description="Campaign ID"),
    payload: CampaignUpdate = ...,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Update a campaign's status or configuration.
    """
    try:
        # First verify campaign belongs to user
        campaign = await campaign_service.get_campaign_by_id(db, campaign_id)
        if not campaign or campaign.customer_id != current_user.id:
            raise HTTPException(status_code=404, detail="Campaign not found")
            
        campaign = await campaign_service.update_campaign(db, campaign_id, payload)
        return campaign
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="서버 내부 오류가 발생했습니다.")

@router.post("/create", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: CampaignCreate,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Create a new custom campaign.
    """
    customer_id = current_user.id
    try:
        campaign = await campaign_service.create_campaign(db, customer_id, payload)
        return campaign
    except Exception as e:
        raise HTTPException(status_code=500, detail="서버 내부 오류가 발생했습니다.")

# Broadcast endpoints
@router.post("/broadcast/preview")
async def preview_broadcast_audience(
    payload: dict,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Preview target audience for broadcast based on segment criteria.
    """
    from app.services.broadcast_service import BroadcastService
    
    try:
        customer_id = current_user.id
        segment = payload.get("segment", {})
        
        broadcast_service = BroadcastService(db)
        result = await broadcast_service.preview_audience(customer_id, segment)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail="서버 내부 오류가 발생했습니다.")

@router.post("/broadcast/send")
async def send_broadcast(
    payload: dict,
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Send or schedule a broadcast campaign.
    """
    from app.services.broadcast_service import BroadcastService
    
    try:
        campaign_id = UUID(payload["campaign_id"])
        
        # Verify campaign belongs to user
        campaign = await campaign_service.get_campaign_by_id(db, campaign_id)
        if not campaign or campaign.customer_id != current_user.id:
            raise HTTPException(status_code=404, detail="Campaign not found")

        send_now = payload.get("send_now", True)
        scheduled_at = payload.get("scheduled_at")
        
        if scheduled_at and isinstance(scheduled_at, str):
            from datetime import datetime
            scheduled_at = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
        
        broadcast_service = BroadcastService(db)
        result = await broadcast_service.send_broadcast(
            campaign_id,
            send_now=send_now,
            scheduled_at=scheduled_at
        )
        return result
        raise HTTPException(status_code=500, detail="브로드캐스트 전송 중 오류가 발생했습니다.")

@router.get("/{campaign_id}/broadcast/stats")
async def get_broadcast_stats(
    campaign_id: UUID = Path(..., description="Campaign ID"),
    current_user: Customer = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Get broadcast performance statistics.
    """
    from app.services.broadcast_service import BroadcastService
    
    try:
        # Verify campaign belongs to user
        campaign = await campaign_service.get_campaign_by_id(db, campaign_id)
        if not campaign or campaign.customer_id != current_user.id:
            raise HTTPException(status_code=404, detail="Campaign not found")

        broadcast_service = BroadcastService(db)
        stats = await broadcast_service.get_broadcast_stats(campaign_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail="통계 데이터를 불러오지 못했습니다.")
