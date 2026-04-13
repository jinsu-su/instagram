from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

from app.models.base import Base


class Flow(Base):
    __tablename__ = "flow"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    customer_id = Column(PostgresUUID(as_uuid=True), ForeignKey("customer.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    trigger_type = Column(String(50), nullable=False)  # keyword, story_reply, welcome, etc.
    trigger_source = Column(String(20), nullable=True, default="all") # all, comment, dm
    trigger_config = Column(JSON, nullable=True)  # {"keyword": "price", "match_type": "exact"}
    actions = Column(JSON, nullable=False)  # [{"type": "send_message", "content": "Hello!"}]
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
