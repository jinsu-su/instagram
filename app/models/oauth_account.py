from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import relationship

from app.models.base import Base, EncryptedToken


class OAuthProvider(str, Enum):
    GOOGLE = "GOOGLE"
    META = "META"


class OAuthAccount(Base):
    __tablename__ = "oauth_account"

    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    customer_id = Column(PostgresUUID(as_uuid=True), ForeignKey("customer.id"), nullable=False, index=True)
    provider = Column(String(50), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    access_token = Column(EncryptedToken, nullable=True)
    refresh_token = Column(EncryptedToken, nullable=True)
    expires_at = Column(DateTime(timezone=False), nullable=True)
    created_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=False), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", back_populates="oauth_accounts")






