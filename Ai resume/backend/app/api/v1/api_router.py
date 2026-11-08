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
    subscriptions,
    admin_payments,
    candidate_messages,
    recruiter_inquiries,
    verified_badges,
    companies,
    offer_letters,
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

# Recruiter Subscriptions & Manual Payment Verification routes
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["Subscriptions & Payments"])
api_router.include_router(subscriptions.router, prefix="", tags=["Subscriptions & Payments (Direct)"])
api_router.include_router(admin_payments.router, prefix="", tags=["Super Admin Payment Moderation"])

# Pre-Application Screening Assessments
api_router.include_router(assessments.router, prefix="", tags=["Pre-Application Screening Assessments"])

# Candidate Direct Messages
api_router.include_router(candidate_messages.router, prefix="/candidate/messages", tags=["Candidate Messages"])

# Recruiter Dedicated Routes
api_router.include_router(recruiter_inquiries.router, prefix="/recruiter/inquiries", tags=["Recruiter Inquiries"])

# Public Credential Verification & Candidate Badges
api_router.include_router(verified_badges.public_router, prefix="/public", tags=["Public Verification"])
api_router.include_router(verified_badges.candidate_router, prefix="/candidate", tags=["Candidate Verified Badges"])

# Employer Branding & Public Company Profiles
api_router.include_router(companies.router, prefix="/companies", tags=["Employer Branding & Companies"])

# AI Offer Letters & Employment Contracts
api_router.include_router(offer_letters.router, prefix="/offer-letters", tags=["Offer Letters & Contracts"])

from typing import List
from app.schemas.application import ShortlistedCandidateItem, SmartScheduleInterviewResponse
api_router.add_api_route(
    "/recruiter/shortlisted-candidates",
    applications.get_recruiter_shortlisted_candidates,
    methods=["GET"],
    tags=["Recruiter Operations"],
    response_model=List[ShortlistedCandidateItem],
)
api_router.add_api_route(
    "/recruiter/schedule-interview",
    applications.schedule_smart_interview,
    methods=["POST"],
    tags=["Recruiter Operations"],
    response_model=SmartScheduleInterviewResponse,
)
api_router.add_api_route(
    "/recruiter/send-message",
    applications.send_recruiter_direct_message,
    methods=["POST"],
    tags=["Recruiter Operations"],
)

# AI Mock Interview & Upskilling Roadmaps
from app.api.v1 import interview
api_router.include_router(interview.router, prefix="/interview", tags=["AI Mock Interview & Roadmaps"])

