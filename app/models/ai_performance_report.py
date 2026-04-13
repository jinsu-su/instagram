from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.models.base import Base


class AIPerformanceReport(Base):
    """AI 성과 분석 리포트 캐시 테이블"""
    __tablename__ = "ai_performance_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customer.id"), nullable=False, index=True)
    media_ids_hash = Column(String(64), nullable=False, index=True)  # 게시물 ID 해시
    report_data = Column(JSON, nullable=False)  # AI 분석 결과
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship
    customer = relationship("Customer", back_populates="ai_reports")

    def __repr__(self):
        return f"<AIPerformanceReport(customer_id={self.customer_id}, hash={self.media_ids_hash[:8]}...)>"
