from datetime import datetime
from typing import Optional, List, Any, Dict
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.instagram import InstagramAccountResponse


class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=20)
    industry: Optional[str] = Field(default=None, max_length=120)
    business_type: Optional[str] = Field(default=None, max_length=120)
    partner_code: Optional[str] = Field(default=None, max_length=32)
    marketing_opt_in: bool = Field(default=False)


class CustomerCreateRequest(CustomerBase):
    pass


class CustomerUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    email: Optional[EmailStr] = Field(default=None)  # 이메일 업데이트 허용
    phone: Optional[str] = Field(default=None, max_length=20)
    industry: Optional[str] = Field(default=None, max_length=120)
    business_type: Optional[str] = Field(default=None, max_length=120)
    partner_code: Optional[str] = Field(default=None, max_length=32)
    marketing_opt_in: Optional[bool] = Field(default=None)
    integration_status: Optional[str] = Field(default=None, max_length=50)


class CustomerResponse(CustomerBase):
    id: UUID
    signup_source: str
    terms_agreed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    instagram_account: Optional[InstagramAccountResponse] = None
    profile_picture: Optional[str] = None  # Facebook profile picture URL
    integration_status: str

    class Config:
        from_attributes = True


class DashboardStatsResponse(BaseModel):
    total_contacts: int = 0
    active_automations: int = 0
    total_broadcasts_sent: int = 0
    total_ai_replies: int = 0
    total_flow_triggers: int = 0

class AutomationActivityResponse(BaseModel):
    id: UUID
    contact_id: Optional[UUID] = None
    event_type: str
    trigger_source: Optional[str] = None
    trigger_text: Optional[str] = None
    action_text: Optional[str] = None
    intent: Optional[str] = None
    status: str
    created_at: datetime
    contact_username: Optional[str] = None
    
    class Config:
        from_attributes = True


class BasicTopPost(BaseModel):
    id: str
    media_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    caption: Optional[str] = None
    like_count: int = 0
    comments_count: int = 0
    score: int = 0


class BasicDashboardSummaryResponse(BaseModel):
    today_automated: int = 0
    today_failed: int = 0
    last7_daily_automated: List[int] = []
    top_posts: List[BasicTopPost] = []
