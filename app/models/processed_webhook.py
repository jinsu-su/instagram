from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from app.models.base import Base

class ProcessedWebhook(Base):
    """
    중복 웹훅 처리를 방지하기 위한 데이터베이스 락 테이블.
    여러 컨테이너 인스턴스에서 동일한 웹훅(mid)을 동시에 처리하는 것을 막습니다.
    """
    __tablename__ = "processed_webhook"

    # Meta 웹훅에서 전달하는 고유 메시지 ID
    mid = Column(String(255), primary_key=True)
    
    # 중복 체크 락 생명 주기를 위한 타임스탬프
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
