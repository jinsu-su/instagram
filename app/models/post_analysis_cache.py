from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.models.base import Base


class PostAnalysisCache(Base):
    """게시물별 AI 분석 결과 캐시 테이블"""
    __tablename__ = "post_analysis_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customer.id"), nullable=False, index=True)
    post_id = Column(String(200), nullable=False, index=True)  # Instagram 게시물 ID
    comments_count = Column(String(20), nullable=False)  # 댓글 수 (캐시 키의 일부)
    analysis_data = Column(JSON, nullable=False)  # AI 분석 결과 전체 데이터
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<PostAnalysisCache(customer_id={self.customer_id}, post_id={self.post_id[:20]}..., comments_count={self.comments_count})>"
