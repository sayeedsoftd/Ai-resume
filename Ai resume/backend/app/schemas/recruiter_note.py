from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class EvaluationNoteCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="1 to 5 star rating")
    recommendation: str = Field(..., description="STRONG_HIRE, HIRE, NEUTRAL, or REJECT")
    note_text: str = Field(..., min_length=1, description="Private evaluation comment")
    recruiter_role: Optional[str] = Field(default="Hiring Team Member", max_length=100)


class EvaluationNoteResponse(BaseModel):
    id: int
    application_id: int
    recruiter_id: int
    recruiter_name: str
    recruiter_role: str
    rating: int
    recommendation: str
    note_text: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    can_edit: bool = False
    can_delete: bool = False


class EvaluationSummaryResponse(BaseModel):
    application_id: int
    average_rating: float
    total_evaluators: int
    hiring_consensus: str  # STRONG_HIRE | HIRE | NEUTRAL | REJECT | NO_REVIEWS
    recommendation_breakdown: Dict[str, int]
    notes: List[EvaluationNoteResponse]
