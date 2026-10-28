from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import KYCStatus


class KYCSubmitRequest(BaseModel):
    real_name: str = Field(..., min_length=2, max_length=150)
    phone_number: str = Field(..., min_length=5, max_length=50)


class KYCAdminReviewRequest(BaseModel):
    status: KYCStatus = Field(..., description="Target status: APPROVED or REJECTED")
    rejection_reason: Optional[str] = Field(None, description="Explanation if rejected")


# Backward compatibility aliases
KYCBase = KYCSubmitRequest
KYCCreate = KYCSubmitRequest
KYCReview = KYCAdminReviewRequest


class KYCResponse(BaseModel):
    id: int
    user_id: int
    real_name: str
    phone_number: str
    nid_doc_path: str
    selfie_path: str
    status: KYCStatus
    rejection_reason: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
