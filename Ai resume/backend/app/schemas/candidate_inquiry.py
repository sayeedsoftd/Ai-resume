from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CandidateInquiryInterviewDetails(BaseModel):
    id: Optional[int] = None
    interview_title: Optional[str] = None
    scheduled_at: Optional[str] = None
    meeting_url: Optional[str] = None
    duration_minutes: Optional[int] = 45
    timezone: Optional[str] = "Asia/Dhaka"
    notes: Optional[str] = None
    status: str = "SCHEDULED"  # SCHEDULED, ACCEPTED, RESCHEDULE_REQUESTED, CANCELLED

    model_config = ConfigDict(from_attributes=True)


class CandidateInquiryItem(BaseModel):
    id: int
    recruiter_id: Optional[int] = None
    recruiter_name: str
    company_name: str
    job_title: str
    type: str  # "INTERVIEW_INVITE" | "FORMAL_EMAIL"
    subject: str
    message_body: str
    interview_details: Optional[CandidateInquiryInterviewDetails] = None
    is_read: bool = False
    sent_at: str
    created_at: datetime
    application_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class CandidateInquiryReplyRequest(BaseModel):
    message: str
    subject: Optional[str] = None


class CandidateInquiryActionRequest(BaseModel):
    action: str  # "ACCEPT" or "RESCHEDULE"
    reschedule_reason: Optional[str] = None
