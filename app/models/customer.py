from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Column, DateTime, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import relationship

from app.models.base import Base


class Customer(Base):
    __tablename__ = "customer"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    industry = Column(String(120), nullable=True)
    business_type = Column(String(120), nullable=True)
    partner_code = Column(String(32), nullable=True)
    signup_source = Column(String(50), nullable=False)
    
    # Auth Data
    hashed_password = Column(String(255), nullable=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(100), nullable=True, unique=True)
    reset_password_token = Column(String(64), nullable=True) # Storing SHA256 Hash
    reset_password_token_expires_at = Column(DateTime(timezone=False), nullable=True)
    marketing_opt_in = Column(Boolean, default=False, nullable=False)
    terms_agreed_at = Column(DateTime(timezone=False), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    integration_status = Column(String(50), nullable=False, default="PENDING", server_default="PENDING")
    
    # AI Settings (moved from InstagramAccount for persistence)
    system_prompt = Column(Text, nullable=True)
    is_ai_active = Column(Boolean, default=True)
    ai_operate_start = Column(String(5), nullable=True, default="00:00")
    ai_operate_end = Column(String(5), nullable=True, default="23:59")
    timezone = Column(String(50), nullable=True, default="Asia/Seoul")
    ai_knowledge_base_url = Column(Text, nullable=True)
    ai_knowledge_base_filename = Column(String(255), nullable=True)
    keyword_replies = Column(JSON, nullable=True)
    is_moderation_alert_active = Column(Boolean, default=True)
    
    # Email Reputation Management
    is_email_blocked = Column(Boolean, default=False, nullable=False)
    email_block_reason = Column(String(100), nullable=True) # e.g., "bounce", "complaint"

    # Relationships
    oauth_accounts = relationship("OAuthAccount", back_populates="customer", cascade="all, delete-orphan")
    instagram_account = relationship("InstagramAccount", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    ai_reports = relationship("AIPerformanceReport", back_populates="customer", cascade="all, delete-orphan")
    ai_insights = relationship("AiInsight", back_populates="customer", cascade="all, delete-orphan")
    
    # Billing
    subscription = relationship("Subscription", back_populates="customer", uselist=False, cascade="all, delete-orphan")
