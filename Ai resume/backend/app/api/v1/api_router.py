from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    profile,
    users,
    kyc,
    resumes,
    jobs,
    applications,
    notifications,
    assessments,
)

api_router = APIRouter()

# Core Authentication & Profile routes
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(profile.router, prefix="/profile", tags=["User Profile"])
api_router.include_router(users.router, prefix="/users", tags=["Users & Profiles"])

# KYC Verification & Admin Moderation routes
api_router.include_router(kyc.router, prefix="/kyc", tags=["KYC Verifications"])
api_router.include_router(kyc.admin_router, prefix="/admin/kyc", tags=["Admin KYC Moderation"])

# Resume & Matching routes
api_router.include_router(resumes.router, prefix="/resumes", tags=["Resumes & AI Parsing"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs & AI Match"])
api_router.include_router(applications.router, prefix="/applications", tags=["Job Applications"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

# Pre-Application Screening Assessments
api_router.include_router(assessments.router, prefix="", tags=["Pre-Application Screening Assessments"])

# AI Mock Interview & Upskilling Roadmaps
from app.api.v1 import interview
api_router.include_router(interview.router, prefix="/interview", tags=["AI Mock Interview & Roadmaps"])

