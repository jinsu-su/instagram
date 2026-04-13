from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean, Float, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customer.id"), unique=True, nullable=False)
    
    # Billing Information
    plan_name = Column(String, default="free") # free, starter, pro
    pending_plan = Column(String, nullable=True) # Plan to switch to at next billing
    status = Column(String, default="active") # active, canceled, past_due, paused
    
    # PortOne Billing Key (for recurring payments)
    billing_key = Column(String, nullable=True)
    pg_provider = Column(String, nullable=True) # kcp, tosspayments, paypal, etc.
    
    # Cycle
    current_period_start = Column(DateTime, default=datetime.utcnow)
    current_period_end = Column(DateTime, nullable=True)
    next_billing_date = Column(DateTime, nullable=True)
    
    amount = Column(Integer, default=0)
    currency = Column(String, default="KRW") # KRW, USD

    # Masked Card Information
    card_name = Column(String, nullable=True) # e.g. Samsung, Shinhan
    card_number = Column(String, nullable=True) # last 4 digits "1234"
    
    # Usage Limits (Monthly)
    usage_count = Column(Integer, default=0)
    usage_limit = Column(Integer, default=50) # Default free limit
    
    # AI Insights Usage Tracking (Monthly)
    performance_report_count = Column(Integer, default=0)  # AI 바이럴 분석 횟수 (월간)
    comment_analysis_count = Column(Integer, default=0)   # 댓글 AI 분석 횟수 (월간)
    
    # Daily Usage Tracking (일일 제한용)
    performance_report_daily_count = Column(Integer, default=0)  # AI 바이럴 분석 일일 횟수
    performance_report_last_date = Column(DateTime, nullable=True)  # 마지막 사용 날짜 (일일 리셋용)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", back_populates="subscription")
    payments = relationship("PaymentHistory", back_populates="subscription")

class PaymentHistory(Base):
    __tablename__ = "payment_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customer.id"), nullable=False)
    
    # Transaction Details
    imp_uid = Column(String, unique=True, nullable=True) # PortOne ID
    merchant_uid = Column(String, unique=True, nullable=False) # Our Order ID
    
    amount = Column(Integer, nullable=False)
    currency = Column(String, default="KRW")
    status = Column(String, nullable=False) # paid, failed, refunded
    
    pay_method = Column(String, nullable=True) # card, trans, paypal
    
    # Card details (masked)
    card_name = Column(String, nullable=True)
    card_number = Column(String, nullable=True)
    
    fail_reason = Column(Text, nullable=True)
    
    paid_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    subscription = relationship("Subscription", back_populates="payments")
