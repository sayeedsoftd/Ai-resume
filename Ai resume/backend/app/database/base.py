from sqlalchemy.orm import declarative_base

# Base class for all SQLAlchemy declarative models
Base = declarative_base()

# Import models below so Base.metadata contains all tables for Alembic / migrations
from app.models.user import User  # noqa: E402, F401
from app.models.kyc import KYCVerification  # noqa: E402, F401
from app.models.profile import UserProfile  # noqa: E402, F401
from app.models.resume import Resume  # noqa: E402, F401
from app.models.job import Job  # noqa: E402, F401
from app.models.application import JobApplication  # noqa: E402, F401
from app.models.notification import Notification  # noqa: E402, F401
from app.models.assessment import JobAssessment, CandidateTestSubmission  # noqa: E402, F401
from app.models.offer_letter import OfferLetter  # noqa: E402, F401
from app.models.recruiter_note import CandidateEvaluationNote  # noqa: E402, F401
from app.models.chat_message import ChatMessage  # noqa: E402, F401
from app.models.candidate_message import CandidateMessage  # noqa: E402, F401
from app.models.daily_quiz import UserSkillProgress, DailyQuizSession  # noqa: E402, F401
from app.models.career_roadmap import CandidateCareerRoadmap  # noqa: E402, F401
from app.models.project_integrity import ProjectIntegrityAudit  # noqa: E402, F401
from app.models.subscription import SubscriptionPlan, SystemPaymentSettings, PaymentTransaction  # noqa: E402, F401
from app.models.verified_badge import VerifiedBadge  # noqa: E402, F401
