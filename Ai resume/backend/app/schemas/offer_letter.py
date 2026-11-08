from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class OfferLetterGenerateDraftRequest(BaseModel):
    application_id: int
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    offered_salary: float = Field(..., gt=0, description="Monthly salary in BDT")
    joining_date: str = Field(..., description="Target joining date, e.g. '2026-12-01'")
    workplace_type: str = Field("Remote", description="Remote, On-site, or Hybrid")
    probation_period_months: int = Field(3, ge=0, le=12)
    custom_perks: Optional[str] = Field(None, description="Perks, bonuses, medical insurance, allowance")
    department: Optional[str] = Field(None, description="Engineering, Product, etc.")
    supervisor_title: Optional[str] = Field(None, description="Engineering Manager, VP of Tech, etc.")


class OfferLetterDraftResponse(BaseModel):
    application_id: int
    candidate_id: int
    candidate_name: str
    candidate_email: str
    company_name: str
    job_title: str
    offered_salary: float
    joining_date: str
    workplace_type: str
    probation_period_months: int
    custom_perks: Optional[str] = None
    letter_content_html: str


class OfferLetterSendRequest(BaseModel):
    application_id: int
    offered_salary: float
    joining_date: str
    workplace_type: str = "Remote"
    probation_period_months: int = 3
    custom_perks: Optional[str] = None
    letter_content_html: str


class OfferLetterResponse(BaseModel):
    id: int
    application_id: int
    candidate_id: int
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    recruiter_id: int
    job_id: Optional[int] = None
    job_title: str
    company_name: str
    offered_salary: float
    joining_date: str
    workplace_type: str
    probation_period_months: int
    custom_perks: Optional[str] = None
    letter_content_html: str
    status: str
    signed_at: Optional[datetime] = None
    candidate_response_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OfferLetterRespondRequest(BaseModel):
    response: str = Field(..., description="ACCEPTED or DECLINED")
    notes: Optional[str] = Field(None, description="Candidate response remarks or reasons")
