from sqlalchemy import Column, String, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.models.base import Base

class AutomationActivity(Base):
    __tablename__ = "automation_activity"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(PostgresUUID(as_uuid=True), ForeignKey("customer.id"), nullable=False, index=True)
    contact_id = Column(PostgresUUID(as_uuid=True), ForeignKey("contact.id"), nullable=True)
    
    # Event types: "COMMENT_REPLY", "STORY_REPLY", "DM_AUTO_REPLY", "FLOW_TRIGGER", "AI_CHAT_REPLY"
    event_type = Column(String(50), nullable=False, index=True)
    
    # Trigger source: "keyword", "comment", "story", "ai", "mention"
    trigger_source = Column(String(50), nullable=True)
    
    # Execution details
    trigger_text = Column(Text, nullable=True) # What the user said
    action_text = Column(Text, nullable=True)  # What the AI/System sent back
    
    intent = Column(String(100), nullable=True) # AI categorized intent
    
    status = Column(String(20), default="SUCCESS", index=True) # SUCCESS, FAILED
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    customer = relationship("Customer")
    contact = relationship("Contact")
