from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, JSON, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import relationship

from app.models.base import Base, EncryptedToken


class InstagramAccount(Base):
    __tablename__ = "instagram_account"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    customer_id = Column(PostgresUUID(as_uuid=True), ForeignKey("customer.id"), nullable=False, index=True)
    page_id = Column(String(100), nullable=True, index=True)
    instagram_user_id = Column(String(100), nullable=True)
    instagram_username = Column(String(100), nullable=True)
    ig_id = Column(String(100), nullable=True)
    access_token = Column(EncryptedToken, nullable=True)
    token_expires_at = Column(DateTime(timezone=False), nullable=True)
    connection_status = Column(String(20), default="CONNECTED", server_default="CONNECTED") # CONNECTED, DISCONNECTED
    system_prompt = Column(Text, nullable=True)
    is_ai_active = Column(Boolean, default=True)
    ai_operate_start = Column(String(5), nullable=True, default="00:00")
    ai_operate_end = Column(String(5), nullable=True, default="23:59")
    timezone = Column(String(50), nullable=True, default="Asia/Seoul")
    ai_knowledge_base_url = Column(Text, nullable=True)
    ai_knowledge_base_filename = Column(String(255), nullable=True)
    keyword_replies = Column(JSON, nullable=True)
    is_moderation_alert_active = Column(Boolean, default=True)
    moderation_disabled_posts = Column(JSON, default=list) # List of post IDs with disabled moderation
    
    # New fields for profile info and metrics
    profile_picture_url = Column(String(500), nullable=True)
    followers_count = Column(Integer, nullable=True)
    follows_count = Column(Integer, nullable=True)
    media_count = Column(Integer, nullable=True)
    last_insights_fetch = Column(DateTime(timezone=False), nullable=True)  # Rate limiting
    cached_media_data = Column(JSON, nullable=True) # Cache for rate limiting fallback
    created_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    customer = relationship("Customer", back_populates="instagram_account")
