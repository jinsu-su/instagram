from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, DateTime, Boolean, ForeignKey, String, Text, JSON, Integer, Float

from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import relationship

from app.models.base import Base

class Contact(Base):
    __tablename__ = "contact"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    customer_id = Column(PostgresUUID(as_uuid=True), ForeignKey("customer.id"), nullable=False, index=True)
    
    # Instagram specific info
    instagram_id = Column(String(100), nullable=False, index=True)
    
    # NEW: Cache the permanent numeric ID for latency optimization & loop prevention
    numeric_ig_id = Column(String(100), nullable=True, index=True)
    
    username = Column(String(100), nullable=True)
    full_name = Column(String(200), nullable=True)
    profile_pic = Column(Text, nullable=True)
    
    # Verification Data
    email = Column(String(255), nullable=True, index=True)
    is_email_verified = Column(Boolean, default=False)  # False, True
    verification_token = Column(String(100), nullable=True)
    
    # CRM Data
    tags = Column(JSON, nullable=True, default=[]) # ["VIP", "Interested", "Inquiry"]
    custom_fields = Column(JSON, nullable=True, default={})
    notes = Column(Text, nullable=True)
    
    # AI Insights
    ai_summary = Column(Text, nullable=True)
    buying_phase = Column(String(50), nullable=True) # Awareness, Consideration, Decision, etc.
    engagement_score = Column(Float, default=0.0) # 0.0 to 100.0
    interaction_count = Column(Integer, default=0)
    
    last_interaction_at = Column(DateTime(timezone=False), nullable=True)
    created_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", backref="contacts")
