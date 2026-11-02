import enum


class UserRole(str, enum.Enum):
    NORMAL_USER = "NORMAL_USER"
    USER = "NORMAL_USER"
    SUBSCRIBER = "SUBSCRIBER"
    RECRUITER = "RECRUITER"
    SUPER_ADMIN = "SUPER_ADMIN"


class PaymentMethod(str, enum.Enum):
    BKASH = "BKASH"
    NAGAD = "NAGAD"
    ROCKET = "ROCKET"
    BANK_TRANSFER = "BANK_TRANSFER"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class SubscriptionStatus(str, enum.Enum):
    NONE = "NONE"
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"


class KYCStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class JobStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"
    INACTIVE = "INACTIVE"
    DELETED = "DELETED"


class JobApplicationStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    SCREENING = "SCREENING"
    STAGE1_PASSED = "STAGE1_PASSED"       # Passed Stage 1 screening benchmark
    STAGE1_FAILED = "STAGE1_FAILED"       # Failed Stage 1 screening benchmark
    SHORTLISTED = "SHORTLISTED"           # Shortlisted without Stage 2
    STAGE2_INVITED = "STAGE2_INVITED"     # Invited to take Recruiter Stage-2 manual test
    STAGE2_SUBMITTED = "STAGE2_SUBMITTED" # Candidate submitted Stage-2 test, under review
    INTERVIEW = "INTERVIEW"               # Formal interview scheduled
    REJECTED = "REJECTED"                 # Rejected
    ACCEPTED = "ACCEPTED"                 # Offer Accepted
    JOB_CLOSED = "JOB_CLOSED"             # Job Closed by Recruiter


class NotificationType(str, enum.Enum):
    SYSTEM = "SYSTEM"
    KYC = "KYC"
    JOB = "JOB"
    JOB_CLOSED = "JOB_CLOSED"
    PAYMENT = "PAYMENT"
    SUBSCRIPTION = "SUBSCRIPTION"
    BROADCAST = "BROADCAST"


class JobType(str, enum.Enum):
    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    REMOTE = "REMOTE"
    CONTRACT = "CONTRACT"
    HYBRID = "HYBRID"


class ExperienceLevel(str, enum.Enum):
    ENTRY = "ENTRY"
    MID = "MID"
    SENIOR = "SENIOR"
    LEAD = "LEAD"
