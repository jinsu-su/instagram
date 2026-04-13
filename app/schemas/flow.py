from datetime import datetime
from typing import List, Optional, Any, Dict
from uuid import UUID

from pydantic import BaseModel, Field


class FlowBase(BaseModel):
    name: str = Field(..., description="Flow name")
    description: Optional[str] = None
    trigger_type: str = Field(..., description="Trigger type (e.g., keyword, story_reply)")
    trigger_config: Optional[Dict[str, Any]] = None
    trigger_source: str = Field("all", description="Trigger source (all, dm, comment)")
    actions: List[Dict[str, Any]] = Field(..., description="List of actions to execute")
    is_active: bool = True


class FlowCreate(FlowBase):
    pass


class FlowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_type: Optional[str] = None
    trigger_config: Optional[Dict[str, Any]] = None
    trigger_source: Optional[str] = None
    actions: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = None


class Flow(FlowBase):
    id: UUID
    customer_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
