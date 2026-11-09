from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ChatMessageCreate(BaseModel):
    message_text: str
    application_id: Optional[int] = None


class ChatMessageResponse(BaseModel):
    id: int
    application_id: Optional[int] = None
    sender_id: int
    recipient_id: int
    message_text: str
    is_read: bool = False
    created_at: datetime
    sender_name: Optional[str] = None
    sender_avatar: Optional[str] = None
    recipient_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationSummary(BaseModel):
    partner_id: int
    partner_name: str
    partner_email: str
    partner_avatar: Optional[str] = None
    partner_role: str
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    is_online: bool = False


class UnreadCountResponse(BaseModel):
    unread_count: int
