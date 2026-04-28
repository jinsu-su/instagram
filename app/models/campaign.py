from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from app.models.base import Base

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customer.id"), nullable=False, index=True)
    
    # Campaign Type: 'WELCOME', 'STORY_MENTION', 'NO_SHOW', 'ABANDONMENT'
    type = Column(String, nullable=False, index=True)
    
    is_active = Column(Boolean, default=False)
    template_id = Column(String, nullable=True) # For predefined templates
    
    # Configuration (Message content, delay, etc.)
    config = Column(JSON, default={}) 
    
    # Statistics (Sent count, Click count, etc.)
    stats = Column(JSON, default={"sent": 0, "clicked": 0, "revenue": 0}) 
    
    # Broadcast-specific fields
    scheduled_at = Column(DateTime, nullable=True)  # Scheduled send time
    sent_at = Column(DateTime, nullable=True)       # Actual send time
    target_segment = Column(JSON, nullable=True)    # Target audience criteria
    # Example target_segment: {
    #   "tags": ["VIP", "구매의사"],
    #   "last_active_days": 7,
    #   "min_engagement_score": 50
    # }
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    customer = relationship("Customer")
