from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import NotificationType


class NotificationBase(BaseModel):
    title: str
    message: str
    type: NotificationType = NotificationType.SYSTEM


class NotificationCreate(NotificationBase):
    user_id: Optional[int] = None  # None indicates broadcast to all


class NotificationResponse(NotificationBase):
    id: int
    user_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CandidateMessageItem(BaseModel):
    message_id: int
    recruiter_name: str
    recruiter_company: str
    recruiter_email: Optional[str] = None
    job_title: str
    subject: str
    body: str
    created_at: datetime
    is_read: bool
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CandidateReplyRequest(BaseModel):
    message_id: Optional[int] = None
    recruiter_email: Optional[str] = None
    recruiter_name: Optional[str] = None
    job_title: Optional[str] = None
    subject: str
    message: str


class RecruiterInquiryItem(BaseModel):
    inquiry_id: int
    candidate_id: Optional[int] = None
    candidate_name: str
    candidate_email: Optional[str] = None
    job_title: str
    subject: str
    body: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


