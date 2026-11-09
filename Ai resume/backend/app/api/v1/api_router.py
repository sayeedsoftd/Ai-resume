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
    career_mentor,
    daily_quiz,
    github_sync,
    project_audit,
    chat,
    candidate_inquiries,
    talent_search,
)

api_router = APIRouter()

# Core Authentication & Profile routes
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(profile.router, prefix="/profile", tags=["User Profile"])
api_router.include_router(profile.router, prefix="/candidates", tags=["Candidate Profile Alias"])
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

# Candidate Inquiries & Official Interview Invites
api_router.include_router(candidate_inquiries.router, prefix="/candidates/inquiries", tags=["Candidate Inquiries"])
api_router.include_router(candidate_inquiries.router, prefix="/candidate/inquiries", tags=["Candidate Inquiries (Alias)"])

# Public Credential Verification & Candidate Badges
api_router.include_router(verified_badges.public_router, prefix="/public", tags=["Public Verification"])
api_router.include_router(verified_badges.candidate_router, prefix="/candidate", tags=["Candidate Verified Badges"])

# Employer Branding & Public Company Profiles
api_router.include_router(companies.router, prefix="/companies", tags=["Employer Branding & Companies"])

# AI Offer Letters & Employment Contracts
api_router.include_router(offer_letters.router, prefix="/offer-letters", tags=["Offer Letters & Contracts"])

# AI Career Trajectory & Learning Roadmap Mentor
api_router.include_router(career_mentor.router, prefix="/candidates", tags=["Candidate Career Mentor"])

# Continuous Daily Skill Upgrading & Gap Quizzes
api_router.include_router(daily_quiz.router, prefix="/daily-quiz", tags=["Daily Skill Quiz & Streaks"])

# 1-Click GitHub Profile Auto-Sync & Profile Auto-Fill
api_router.include_router(github_sync.router, prefix="/candidates", tags=["Candidate GitHub Sync"])
api_router.include_router(github_sync.router, prefix="/profile", tags=["Profile GitHub Sync"])

# AI Fake Project & Plagiarism Detector (Tutorial Clone & Originality Auditor)
api_router.include_router(project_audit.router, prefix="", tags=["Project Integrity & Plagiarism Audit"])
api_router.include_router(project_audit.router, prefix="/project-audit", tags=["Project Integrity & Plagiarism Audit (Direct)"])

# In-App Recruiter-Candidate Direct Live Chat & Real-Time Messaging Hub
api_router.include_router(chat.router, prefix="/chat", tags=["Direct Live Chat & Messaging"])

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

# Reverse Headhunting & Talent Search Engine
api_router.include_router(talent_search.router, prefix="/recruiters/talent-search", tags=["Reverse Headhunting & Talent Search"])
api_router.include_router(talent_search.router, prefix="/recruiter/talent-search", tags=["Reverse Headhunting & Talent Search (Alias)"])
api_router.include_router(talent_search.router, prefix="/talent-search", tags=["Talent Search Engine (Direct)"])

# AI Mock Interview & Upskilling Roadmaps
from app.api.v1 import interview
api_router.include_router(interview.router, prefix="/interview", tags=["AI Mock Interview & Roadmaps"])

