from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.base import Base


class ChatMessage(Base):
    """
    Real-Time Recruiter-Candidate Direct Live Chat Message.
    Supports instant bidirectional communication, thread history, and read receipts.
    """
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(
        Integer,
        ForeignKey("job_applications.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    sender_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recipient_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    message_text = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])
    application = relationship("JobApplication")

    # Composite Index for rapid thread querying
    __table_args__ = (
        Index("ix_chat_thread", "sender_id", "recipient_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<ChatMessage id={self.id} sender={self.sender_id} recipient={self.recipient_id} read={self.is_read}>"
