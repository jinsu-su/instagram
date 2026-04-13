from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.models.base import Base

class ChatSession(Base):
    """
    Represents a conversation between our Instagram account and a user.
    """
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customer.id"), nullable=False, index=True)
    
    # Our Account ID (The page/account receiving the message)
    instagram_account_id = Column(String(100), nullable=False, index=True)
    
    # The Other Person (User)
    participant_id = Column(String(100), nullable=False, index=True)
    participant_username = Column(String(200), nullable=True)
    participant_name = Column(String(200), nullable=True)
    participant_profile_pic = Column(Text, nullable=True)
    
    # Conversation State
    last_message_preview = Column(Text, nullable=True)
    last_message_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    is_read = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    customer = relationship("Customer")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="desc(ChatMessage.created_at)")

    __table_args__ = (
        # Composite index for faster lookups of "Chat between Me and You"
        Index('idx_chat_session_participants', 'instagram_account_id', 'participant_id', unique=True),
    )


class ChatMessage(Base):
    """
    Individual message within a session.
    """
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id"), nullable=False, index=True)
    
    # Meta's Message ID (for deduplication)
    mid = Column(String(200), nullable=True, unique=True, index=True)
    
    sender_id = Column(String(100), nullable=False)
    recipient_id = Column(String(100), nullable=True)
    
    is_from_me = Column(Boolean, default=False)
    is_automated = Column(Boolean, default=False)
    
    message_type = Column(String(50), default="text") # text, image, etc.
    content = Column(Text, nullable=True)
    media_url = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationship
    session = relationship("ChatSession", back_populates="messages")
