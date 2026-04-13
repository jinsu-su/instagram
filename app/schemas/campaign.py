from pydantic import BaseModel, UUID4
from typing import Optional, Any, Dict, List
from datetime import datetime

class CampaignBase(BaseModel):
    type: str  # 'WELCOME', 'STORY_MENTION', 'NO_SHOW', 'ABANDONMENT'
    is_active: bool = False
    template_id: Optional[str] = None
    config: Dict[str, Any] = {}

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(BaseModel):
    is_active: Optional[bool] = None
    template_id: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

class CampaignResponse(CampaignBase):
    id: UUID4
    customer_id: UUID4
    stats: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CampaignListResponse(BaseModel):
    campaigns: List[CampaignResponse]
    total: int
