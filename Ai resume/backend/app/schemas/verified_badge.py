from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class VerifiedBadgeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    badge_id: str
    candidate_id: int
    job_id: Optional[int] = None
    application_id: Optional[int] = None
    submission_id: Optional[int] = None
    skill_domain: str
    score_achieved: float
    percentile_rank: float
    verified_skills: List[str]
    verification_token: str
    issued_at: datetime
    is_active: bool


class PublicBadgeVerificationResponse(BaseModel):
    badge_id: str
    status: str  # "AUTHENTIC & VERIFIED"
    candidate_id: int
    candidate_name: str
    candidate_headline: Optional[str] = None
    assessment_track: str
    score_achieved: float
    percentile_rank: float
    verified_skills: List[str]
    issued_at: datetime
    verification_token: str
    issuer: str
    verification_url: str
    qr_data: str
