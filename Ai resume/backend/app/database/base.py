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
