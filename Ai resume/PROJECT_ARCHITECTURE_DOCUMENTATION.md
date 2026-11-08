# AI Resume Analyzer, ATS Matcher & Recruiter Assessment Platform
## Complete System Architecture & Production Technical Documentation

---

### Table of Contents
1. [Executive Overview & System Architecture](#1-executive-overview--system-architecture)
   - [High-Level Architectural Topology](#11-high-level-architectural-topology)
   - [Core Pillars & Architectural Highlights](#12-core-pillars--architectural-highlights)
   - [Security & Role-Based Access Control (RBAC)](#13-security--role-based-access-control-rbac)
2. [Database Schema & Entity-Relationship Architecture](#2-database-schema--entity-relationship-architecture)
   - [Entity-Relationship Diagram](#21-entity-relationship-diagram)
   - [Detailed Model Specifications](#22-detailed-model-specifications)
   - [Foreign Key Constraints & Cascade Rules](#23-foreign-key-constraints--cascade-rules)
3. [Backend Directory Structure & API Reference](#3-backend-directory-structure--api-reference)
   - [Directory Structure Map](#31-directory-structure-map)
   - [Core API Endpoints Reference](#32-core-api-endpoints-reference)
     - [`auth.py` (Authentication & RBAC)](#authpy-authentication--rbac)
     - [`jobs.py` (Requisitions, Matching & Cascading Wipe)](#jobspy-requisitions-matching--cascading-wipe)
     - [`applications.py` (Application Lifecycle & Interviewing)](#applicationspy-application-lifecycle--interviewing)
     - [`assessments.py` (AI Tests & Stage-2 Rubric Evaluation)](#assessmentspy-ai-tests--stage-2-rubric-evaluation)
     - [`subscriptions.py` & `admin_payments.py` (Monetization & KYC Verification)](#subscriptionspy--admin_paymentspy-monetization--kyc-verification)
     - [`kyc.py` (Candidate Identity Verification)](#kycpy-candidate-identity-verification)
     - [`resumes.py` (Resume Parsing, ATS Gauging & Builder)](#resumespy-resume-parsing-ats-gauging--builder)
4. [Frontend Directory Structure & Component Flow](#4-frontend-directory-structure--component-flow)
   - [Frontend Architecture Map](#41-frontend-architecture-map)
   - [Routing Topology & Route Guards (`App.jsx`)](#42-routing-topology--route-guards-appjsx)
   - [Candidate Interfaces & ATS Optimizer](#43-candidate-interfaces--ats-optimizer)
   - [Recruiter Console & Candidate Review Dossier](#44-recruiter-console--candidate-review-dossier)
   - [Super Admin Command Center](#45-super-admin-command-center)
   - [Global State, Notification Polling & Toast Singletons](#46-global-state-notification-polling--toast-singletons)
5. [End-to-End Workflows & Business Logic](#5-end-to-end-workflows--business-logic)
   - [Candidate Lifecycle (Apply -> Screen -> Interview)](#51-candidate-lifecycle)
   - [Recruiter Monetization & KYC Lifecycle](#52-recruiter-monetization--kyc-lifecycle)
   - [Subscription Auto-Freeze & Permanent Deletion Workflow](#53-subscription-auto-freeze--permanent-deletion-workflow)

---

## 1. Executive Overview & System Architecture

The **AI Resume Analyzer, ATS Matcher & Recruiter Assessment Platform** is a full-stack, enterprise-grade talent acquisition and automated candidate assessment platform. It bridges the gap between candidates seeking ATS-optimized resumes and recruiters requiring pre-screened, objectively evaluated applicants.

```
+----------------------------------------------------------------------------------------------------+
|                                      PRESENTATION TIER (CLIENT)                                    |
|                                                                                                    |
|    React 18  *  Vite SPA  *  Tailwind CSS  *  Lucide Icons  *  React Router v6  *  Axios           |
|  +---------------------------+  +---------------------------+  +--------------------------------+  |
|  |     Candidate Portal      |  |     Recruiter Console     |  |     Super Admin Center         |  |
|  | - ATS Resume Optimizer    |  | - Job Builder (10 MCQ/5 W)|  | - KPI Command Center           |  |
|  | - One-Click Match & Apply |  | - Candidate Dossier Drawer|  | - Manual Payment & KYC Review  |  |
|  | - 2-Stage Pre-Screen Exam |  | - Interview Scheduler     |  | - Gateway Settings & Plans     |  |
|  +---------------------------+  +---------------------------+  +--------------------------------+  |
+-------------------------------------------------+--------------------------------------------------+
                                                  | HTTPS / REST JSON / Multipart Form-Data
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                    APPLICATION TIER (FASTAPI REST)                                 |
|                                                                                                    |
|   FastAPI  *  Pydantic v2  *  SQLAlchemy 2.0 ORM  *  Python 3.13  *  JWT / Argon2 / Passlib        |
|  +-----------------------+  +------------------------+  +---------------------+  +---------------+ |
|  |   Auth & Security     |  | Jobs & Applications    |  | Screening Engine    |  | Subscriptions | |
|  | - JWT OAuth2 Bearer   |  | - Requisition CRUD     |  | - 25 MCQ Generation |  | - MFS & Bank  | |
|  | - Role Middleware     |  | - Cascading Deletion   |  | - 5 Written Rubric  |  | - KYC PDF     | |
|  | - Identity KYC Engine |  | - Candidate Dossiers   |  | - Gemini Evaluation|  | - Auto-Freeze | |
|  +-----------------------+  +------------------------+  +---------------------+  +---------------+ |
+-----------------------+-------------------------+-------------------------+------------------------+
                        |                         |                         |
                        v                         v                         v
+--------------------------------+ +--------------------------------+ +------------------------------+
|        PERSISTENCE TIER        | |         AI INFERENCE           | |      LOCAL ASSET STORAGE     |
|   MySQL 8.0 / PostgreSQL 15    | |    Google Gemini 1.5 Pro /     | |   backend/uploads/           |
| - Connection Pooling (QueuePool| |    Flash Models via API        | | - resumes/ (PDF/DOCX)        |
| - Foreign Key Cascade Controls | | - JSON Schema Extraction       | | - kyc/ (Candidate Photos)    |
| - Transactional Isolation      | | - Semantic Keyword Match       | | - kyc_docs/ (Trade Licenses) |
| - Snapshot Auditing            | | - Automated Rubric Scoring     | | - avatars/ (Profile Photos)  |
+--------------------------------+ +--------------------------------+ +------------------------------+
```

### 1.1 High-Level Architectural Topology

The system adheres strictly to a decoupled **Client-Server Architecture**:
- **Presentation Layer**: Built on **React 18** using **Vite**, compiled with **Tailwind CSS** for responsive styling and dark/light mode toggles. State management uses custom React Context singletons (`AuthContext`, `NotificationContext`, `ThemeContext`).
- **Application Server Layer**: Powered by **FastAPI** (Python asynchronous ASGI), leveraging **Pydantic v2** for strict schema validation, dependency injection for session lifecycles, and **Passlib (Argon2/Bcrypt)** for password hashing.
- **AI Intelligence Layer**: Integrates directly with **Google Gemini (Generative AI SDK)** for non-deterministic intelligence:
  - Document parsing and unstructured entity extraction (skills, experience, education, certifications).
  - 4-Stage ATS Compatibility scoring against raw job requisitions.
  - Dynamic generation of 25 technical MCQs and 5 written scenario questions tailored specifically to requisition keywords.
  - Automated rubric-based grading of candidate written submissions.
- **Persistence Layer**: Relational database engine (**MySQL 8.0+** or **PostgreSQL**) managed via **SQLAlchemy 2.0 ORM** with declarative base mappings, connection pooling, and transactional rollbacks.

### 1.2 Core Pillars & Architectural Highlights

1. **4-Stage ATS Scoring Engine**:
   Evaluates a candidate's primary resume against a target job requisition using four distinct vectors:
   - *Vector 1 (Hard Skill Overlap - 40%)*: Strict mathematical set intersection and synonym mapping.
   - *Vector 2 (Experience & Seniority Fit - 25%)*: Total years of verified experience versus requisition benchmarks.
   - *Vector 3 (Contextual Semantic Relevance - 25%)*: Gemini LLM embeddings assessing contextual experience similarity.
   - *Vector 4 (Formatting & Keyword Density - 10%)*: Section structure, action verb usage, and contact detail completeness.
2. **Automated AI Pre-Screening Pipeline**:
   - Jobs can require an entry screening exam consisting of **25 technical MCQs** and **5 written questions** generated on demand by AI and cached in `JobAssessment`.
   - MCQ questions are automatically scored; written questions are evaluated against ideal AI-generated rubrics, producing detailed feedback and an aggregate score (0–100%).
3. **Stage-2 Recruiter-Controlled Custom Assessment**:
   - Recruiters can inject custom assessments into their requisitions: up to **10 custom MCQs** (2 marks each) and **5 written scenario questions** (10 marks each, 70 total possible marks).
   - Answer keys are stripped server-side before delivering to candidate clients.
4. **Recruiter Subscription & KYC Monetization Engine**:
   - Recruiter accounts require an active subscription plan (e.g., Monthly, Quarterly, Enterprise).
   - Recruiter checkout supports local and international manual payment options: **bKash, Nagad, Rocket, and Bank Transfer**.
   - Mandatory upload of company verification documentation (**Trade License / Registration PDF**).
   - Super Admin moderation center allows one-click inspection of the uploaded PDF and transaction verification before granting the `RECRUITER` role.
   - Subscription lifecycle automatically freezes job requisitions upon expiry (`is_frozen = True`) and unfreezes them upon approved renewal.
5. **Permanent Job Deletion with Cascading Wipe**:
   - Clean deletion architecture ensuring that deleting a requisition from the Recruiter Console deletes all candidate submissions, test responses, cached questions, and job notifications, removing the job permanently from candidate boards, recruiter listings, and admin reports.

### 1.3 Security & Role-Based Access Control (RBAC)

The application enforces strict **Role-Based Access Control (RBAC)** implemented as FastAPI endpoint dependencies:

| Role Enum | Intended User Class | Privileges & Access Scope |
| :--- | :--- | :--- |
| `NORMAL_USER` | Registered Job Seeker | Browse jobs, upload/manage resumes, view ATS match scores, submit applications, take candidate tests, submit KYC. |
| `CANDIDATE` | Verified Job Seeker | Possesses verified KYC identity badge; all standard candidate privileges. |
| `RECRUITER` | Verified Business / Employer | Publish job requisitions, configure Stage-2 tests, review applicant dossiers, make hire/reject decisions, schedule interviews. |
| `SUBSCRIBER` | Paid Recruiter | Fully active subscription status with full access to recruiter posting pipelines. |
| `SUPER_ADMIN` | Platform Administrator | Global oversight: review KYC verifications, approve/reject manual payments, configure payment gateways, manage subscription plans, review system KPIs. |

---

## 2. Database Schema & Entity-Relationship Architecture

The relational schema is configured with foreign key relations, explicit cascade rules, indexes, and snapshot fields to ensure data integrity and auditability.

### 2.1 Entity-Relationship Diagram

```
+--------------------+              +--------------------+
|       users        | 1          * |  user_profiles     |
|--------------------|<-------------|--------------------|
| id (PK)            |              | id (PK)            |
| email (UNIQUE)     | 1          * | user_id (FK)       |
| role (ENUM)        |<---+         +--------------------+
| subscription_status|    |
| sub_expires_at     |    | 1     * +--------------------+
+--------------------+    +---------|  kyc_verifications |
     | 1        | 1                 |--------------------|
     |          |                   | id (PK)            |
     | *        | *                 | user_id (FK)       |
+---------+ +--------------------+  +--------------------+
| resumes | |payment_transactions|
|---------| |--------------------| 1     1 +--------------------+
| id (PK) | | id (PK)            |---------| subscription_plans |
| user_id | | user_id (FK)       |         |--------------------|
+---------+ | plan_id (FK)       |         | id (PK)            |
     | 1    | transaction_id     |         | price_bdt, etc.    |
     |      +--------------------+         +--------------------+
     |
     |      +---------------------+
     | 1  * |        jobs         |
     +----->|---------------------|
            | id (PK)             |
            | posted_by_user_id(FK)
            | is_active, is_frozen|
            | is_deleted          |
            +---------------------+
                 | 1          | 1
                 |            |
                 | 1          | *
            +---------------+ +------------------+
            |job_assessments| | job_applications |
            |---------------| |------------------|
            | id (PK)       | | id (PK)          |
            | job_id (FK,UQ)| | job_id (FK)      |
            | mcq_questions | | user_id (FK)     |
            +---------------+ | resume_id (FK)   |
                 | 1          | match_score      |
                 |            | status (ENUM)    |
                 | *          +------------------+
            +---------------------------+  | 1
            | candidate_test_submissions|  |
            |---------------------------|  |
            | id (PK)                   |  |
            | job_id (FK)               |<-+
            | candidate_id (FK)         |
            | application_id (FK)       |
            | total_test_score          |
            +---------------------------+
```

### 2.2 Detailed Model Specifications

#### 1. `User` (`app/models/user.py`)
Central identity table storing credential hashes, RBAC level, and subscription state.
- **`id`** (`Integer`, PK, autoincrement): Unique user identifier.
- **`email`** (`String(255)`, indexed, unique, non-null): User login email.
- **`hashed_password`** (`String(255)`, non-null): Password hash generated using Argon2/Bcrypt.
- **`full_name`** (`String(100)`, non-null): Display name.
- **`role`** (`SQLEnum(UserRole)`, default=`NORMAL_USER`): Roles: `NORMAL_USER`, `CANDIDATE`, `RECRUITER`, `SUBSCRIBER`, `SUPER_ADMIN`.
- **`is_verified_badge`** (`Boolean`, default=`False`): Verified badge awarded upon approved candidate KYC.
- **`subscription_status`** (`String(50)`, default=`'NONE'`): Recruiter status (`NONE`, `PENDING`, `ACTIVE`, `EXPIRED`, `REJECTED`).
- **`subscription_expires_at`** (`DateTime`, nullable): Expiry timestamp for recruiter privileges.
- **`created_at`** / **`updated_at`** (`DateTime`, UTC).
- **Relationships**: `profile` (1:1), `kyc` (1:N), `resumes` (1:N), `jobs` (1:N), `applications` (1:N), `notifications` (1:N), `payment_transactions` (1:N).

#### 2. `Job` (`app/models/job.py`)
Job requisitions created by Recruiters or Super Admins.
- **`id`** (`Integer`, PK, autoincrement): Unique requisition identifier.
- **`posted_by_user_id`** (`Integer`, FK -> `users.id`, ondelete=`CASCADE`, indexed): Owner recruiter.
- **`title`** (`String(200)`, indexed, non-null): Requisition title.
- **`company_name`** (`String(200)`, indexed, non-null): Hiring organization.
- **`description`** (`Text`, non-null): Comprehensive role description and responsibilities.
- **`required_skills`** (`JSON`, non-null): Stored array of normalized skill tags (e.g., `["Python", "FastAPI", "React", "Docker"]`).
- **`experience_level`** (`SQLEnum(ExperienceLevel)`, default=`MID`): `ENTRY`, `JUNIOR`, `MID`, `SENIOR`, `LEAD`, `EXECUTIVE`.
- **`location`** (`String(200)`, non-null): Physical location or 'Remote'.
- **`job_type`** (`SQLEnum(JobType)`, default=`FULL_TIME`): `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERNSHIP`, `REMOTE`.
- **`salary_range`** (`String(100)`, nullable): Compensation range.
- **`is_active`** (`Boolean`, default=`True`, indexed): Recruiter active/paused toggle.
- **`is_frozen`** (`Boolean`, default=`False`, indexed): System-controlled subscription auto-freeze flag.
- **`is_deleted`** (`Boolean`, default=`False`, indexed): Soft deletion and query-exclusion flag.
- **`passing_score`** (`Float`, default=`70.0`): Benchmark percentage required for automated candidate qualification.
- **`has_manual_stage`** (`Boolean`, default=`False`): Toggles Stage-2 recruiter manual questions.
- **`manual_questions`** (`JSON`, nullable): Recruiter-defined questions (capped at 10 MCQs and 5 Written).
- **`views_count`** (`Integer`, default=`0`): Impression metric.
- **`created_at`** / **`updated_at`** (`DateTime`, UTC).
- **Relationships**: `poster` (`User`), `applications` (`JobApplication`), `assessment` (`JobAssessment`), `test_submissions` (`CandidateTestSubmission`).

#### 3. `JobApplication` (`app/models/application.py`)
Links a candidate's resume to a job requisition and tracks progress through stages.
- **`id`** (`Integer`, PK, autoincrement): Unique application record.
- **`job_id`** (`Integer`, FK -> `jobs.id`, ondelete=`CASCADE`, indexed).
- **`user_id`** (`Integer`, FK -> `users.id`, ondelete=`CASCADE`, indexed).
- **`resume_id`** (`Integer`, FK -> `resumes.id`, ondelete=`CASCADE`, indexed).
- **`status`** (`SQLEnum(JobApplicationStatus)`, default=`APPLIED`):
  `APPLIED` -> `SCREENING` -> `STAGE1_PASSED` / `STAGE1_FAILED` -> `SHORTLISTED` -> `STAGE2_INVITED` -> `STAGE2_SUBMITTED` -> `INTERVIEW` -> `ACCEPTED` / `REJECTED` / `JOB_CLOSED`.
- **`match_score`** (`Float`, nullable): ATS compatibility percentage calculated on submission.
- **`candidate_test_submission_id`** (`Integer`, FK -> `candidate_test_submissions.id`, ondelete=`SET NULL`, nullable): Link to test results.
- **`test_score`** (`Float`, nullable): Aggregate percentage from the test submission.
- **`assessment_status`** (`String(50)`, default=`'PENDING'`): Status (`PENDING`, `COMPLETED`, `EXEMPTED`).
- **`is_stage1_passed`** (`Boolean`, nullable): Flag indicating whether candidate met the `passing_score` threshold.
- **`stage2_submission`** (`JSON`, nullable): Answers submitted for the Stage-2 manual assessment.
- **`interview_date`** (`String(50)`, nullable): Scheduled interview date.
- **`interview_time`** (`String(50)`, nullable): Scheduled interview time.
- **`meeting_link`** (`String(500)`, nullable): Video conference URL (Google Meet / Zoom).
- **`recruiter_notes`** (`Text`, nullable): Internal comments from the hiring team.
- **`rejection_reason`** (`Text`, nullable): Explanation provided if rejected.
- **`applied_at`** / **`updated_at`** (`DateTime`, UTC).

#### 4. `JobAssessment` & `CandidateTestSubmission` (`app/models/assessment.py`)
- **`JobAssessment`**:
  - `id` (PK), `job_id` (FK -> `jobs.id`, ondelete=`CASCADE`, UNIQUE, indexed).
  - `mcq_questions` (`JSON`): 25 technical MCQs with structure: `[{id, question, options: [A, B, C, D], correct_option, explanation}]`.
  - `written_questions` (`JSON`): 5 technical scenario questions with structure: `[{id, question, ideal_answer_rubric, max_marks}]`.
- **`CandidateTestSubmission`**:
  - `id` (PK), `job_id` (FK -> `jobs.id`), `candidate_id` (FK -> `users.id`), `application_id` (FK -> `job_applications.id`), `assessment_id` (FK -> `job_assessments.id`).
  - `mcq_answers` (`JSON`): Candidate selections `{"1": "A", "2": "C", ...}`.
  - `written_answers` (`JSON`): Candidate written responses `{"1": "Text...", ...}`.
  - `mcq_score` (`Float`, 0 to 50 scale).
  - `written_score` (`Float`, 0 to 50 scale).
  - `total_test_score` (`Float`, composite 0 to 100 percentage).
  - `written_evaluation_feedback` (`JSON`): AI rubric marks breakdown and feedback per question.

#### 5. `SubscriptionPlan`, `SystemPaymentSettings` & `PaymentTransaction` (`app/models/subscription.py`)
Monetization and verification data structures.
- **`SubscriptionPlan`**:
  - `id` (PK), `name` (`String(100)`), `description` (`Text`), `duration_days` (`Integer`), `price_bdt` (`Float`), `is_active` (`Boolean`), timestamps.
- **`SystemPaymentSettings`**:
  - `id` (PK), `bkash_number`, `nagad_number`, `rocket_number`, `bank_name`, `bank_account_name`, `bank_account_number`, `bank_routing`, `updated_at`.
- **`PaymentTransaction`**:
  - `id` (PK), `user_id` (FK -> `users.id`, ondelete=`CASCADE`, indexed).
  - `plan_id` (FK -> `subscription_plans.id`, ondelete=`SET NULL`, nullable).
  - **Snapshot Fields**: `plan_name_snapshot` (`String(100)`), `duration_days_snapshot` (`Integer`), `price_snapshot` (`Float`). Prevents downstream plan modifications from altering past transaction terms.
  - `payment_method` (`SQLEnum(PaymentMethod)`: `BKASH`, `NAGAD`, `ROCKET`, `BANK_TRANSFER`).
  - `sender_account` (`String(100)`), `transaction_id` (`String(100)`, indexed, unique), `paid_amount` (`Float`).
  - `kyc_document_url` (`String(500)`): File path to uploaded trade license or corporate verification PDF.
  - `status` (`SQLEnum(PaymentStatus)`: `PENDING`, `APPROVED`, `REJECTED`).
  - `rejection_reason` (`Text`, nullable), `approved_at` (`DateTime`), `expires_at` (`DateTime`), timestamps.

#### 6. `Notification` (`app/models/notification.py`)
In-app messaging and notification dispatch.
- **`id`** (PK), **`user_id`** (FK -> `users.id`, ondelete=`CASCADE`, nullable for system broadcasts).
- **`title`** (`String(200)`), **`message`** (`Text`), **`type`** (`SQLEnum(NotificationType)` / `VARCHAR(50)`: `SYSTEM`, `APPLICATION`, `JOB`, `KYC`, `INTERVIEW`, `BROADCAST`), **`is_read`** (`Boolean`, default=`False`), **`created_at`** (`DateTime`).

### 2.3 Foreign Key Constraints & Cascade Rules

```
Parent Model       Child Model                  Constraint Rule   Trigger Event Behavior
--------------------------------------------------------------------------------------------------------
users              user_profiles                CASCADE           Deleting user wipes profile
users              resumes                      CASCADE           Deleting user wipes uploaded CVs
users              kyc_verifications            CASCADE           Deleting user wipes verification docs
users              payment_transactions         CASCADE           Deleting user wipes payment audit
users              jobs                         CASCADE           Deleting recruiter deletes all postings
jobs               job_applications             CASCADE           Deleting job deletes applications
jobs               job_assessments              CASCADE           Deleting job wipes AI questions cache
jobs               candidate_test_submissions   CASCADE           Deleting job wipes test submissions
job_applications   candidate_test_submissions   SET NULL          De-links test submission cleanly
subscription_plans payment_transactions         SET NULL          Retiring a plan preserves history
```

---

## 3. Backend Directory Structure & API Reference

### 3.1 Directory Structure Map

```
backend/
├── alembic/                      # Database migration scripts & configurations
├── app/
│   ├── api/
│   │   ├── deps.py               # Dependency injection: get_db, auth guards, RBAC
│   │   └── v1/
│   │       ├── api_router.py     # Aggregated v1 routing manifest
│   │       ├── interview.py      # AI Mock interview & dynamic roadmap endpoints
│   │       └── endpoints/
│   │           ├── admin_payments.py # Super admin verification, settings & plans
│   │           ├── applications.py   # Application workflow & recruiter decisions
│   │           ├── assessments.py    # AI test generation & rubric evaluation
│   │           ├── auth.py           # Registration, login, Google OAuth, token
│   │           ├── jobs.py           # Requisitions CRUD, match, cascading delete
│   │           ├── kyc.py            # Candidate KYC document uploads & review
│   │           ├── notifications.py  # User notifications & admin broadcasting
│   │           ├── profile.py        # Candidate personal & contact metadata
│   │           ├── resumes.py        # PDF extraction, ATS analysis & builder
│   │           ├── subscriptions.py  # Recruiter plan selection & payment submission
│   │           └── users.py          # User management & admin platform KPI analytics
│   ├── core/
│   │   ├── config.py             # Pydantic BaseSettings, directory paths, environment
│   │   └── security.py           # JWT encoding/decoding, Argon2/Bcrypt password hashing
│   ├── database/
│   │   ├── base.py               # SQLAlchemy declarative base import registry
│   │   ├── init_db.py            # Non-destructive DDL migrations & demo seeders
│   │   └── session.py            # Engine connection pooling & SessionLocal provider
│   ├── models/                   # SQLAlchemy ORM entity classes
│   ├── schemas/                  # Pydantic validation request & response schemas
│   ├── services/
│   │   ├── email_service.py      # Automated HTML transactional interview invitations
│   │   ├── gemini_service.py     # Google Gemini API wrapper: ATS, questions, rubrics
│   │   ├── job_matcher.py        # 4-Stage scoring matrix calculation service
│   │   ├── kyc_upload_service.py # Secure storage handler for KYC verification files
│   │   ├── resume_parser.py      # PyMuPDF / pdfplumber extraction & normalization
│   │   └── subscription_service.py # Subscription expiry check & job freeze sync
│   └── utils/
│       └── logger.py             # Formatted console & file logging utilities
├── uploads/                      # Local file storage mounts
│   ├── avatars/                  # User profile pictures
│   ├── kyc/                      # Candidate ID cards & verification selfies
│   ├── kyc_docs/                 # Recruiter corporate trade licenses (PDF)
│   ├── photos/                   # Builder resume candidate photos
│   └── resumes/                  # Raw candidate uploaded resumes (PDF/DOCX)
├── main.py                       # Application entrypoint & CORS middleware
└── requirements.txt              # Production Python package dependencies
```

### 3.2 Core API Endpoints Reference

#### `auth.py` (Authentication & RBAC)

##### `POST /api/v1/auth/register`
- **Purpose**: Registers a new user account with default role `NORMAL_USER`.
- **Request Payload**:
  ```json
  {
    "email": "candidate@example.com",
    "password": "StrongPassword123!",
    "full_name": "Jane Doe",
    "role": "NORMAL_USER"
  }
  ```
- **Processing Logic**: Verifies email uniqueness. Hashes password using `get_password_hash()`. Inserts record into `users` table and creates an empty `user_profiles` row.
- **Return Value**: `UserResponse` with `id`, `email`, `full_name`, `role`, and `created_at`.

##### `POST /api/v1/auth/login`
- **Purpose**: Authenticates credentials and returns a signed JWT access token.
- **Request Payload**: `LoginRequest` (`email`, `password`).
- **Processing Logic**: Validates user existence and verifies password hash using `verify_password()`.
- **Return Value**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "user": { "id": 1, "email": "admin@example.com", "role": "SUPER_ADMIN" }
  }
  ```

---

#### `jobs.py` (Requisitions, Matching & Cascading Wipe)

##### `GET /api/v1/jobs/` & `GET /api/v1/jobs/public`
- **Purpose**: Public candidate job board with search and faceted filters.
- **Query Params**: `q` (title/company search), `location`, `job_type`, `experience_level`, `skip`, `limit`.
- **Processing Logic**: Filters `Job.is_active == True`, `Job.is_frozen == False`, and `Job.is_deleted == False`.
- **Return Value**: Array of `JobResponse` objects.

##### `POST /api/v1/jobs/`
- **Purpose**: Creates a new job requisition with benchmark passing scores and optional Stage-2 questions.
- **Guard**: `require_subscriber_or_admin` (Active subscription required).
- **Request Payload**:
  ```json
  {
    "title": "Senior Backend Architect",
    "company_name": "CloudScale Ltd",
    "description": "Designing high-concurrency microservices...",
    "required_skills": ["Python", "FastAPI", "PostgreSQL", "Kafka"],
    "experience_level": "SENIOR",
    "location": "Remote",
    "job_type": "FULL_TIME",
    "salary_range": "$120,000 - $150,000",
    "passing_score": 75.0,
    "has_manual_stage": true,
    "manual_questions": {
      "mcqs": [{"id": 1, "question": "What is an event loop?", "options": ["A", "B", "C", "D"], "correct_option": "B"}],
      "written": [{"id": 1, "question": "Explain database connection pooling.", "instructions": "Detail queue behaviors."}]
    }
  }
  ```
- **Processing Logic**: Calls `can_user_post_job()` to confirm active subscription status. Validates manual questions limit (max 10 MCQs, max 5 written). Inserts new `Job` record.
- **Return Value**: Created `JobResponse`.

##### `DELETE /api/v1/jobs/{job_id}`
- **Purpose**: Permanent cascading wipe of a job requisition from the entire system.
- **Guard**: Recruiter owner or Super Admin.
- **Processing Logic**:
  1. Validates ownership: `job.posted_by_user_id == current_user.id` or `SUPER_ADMIN`.
  2. Breaks circular FK references: updates `job_applications` setting `candidate_test_submission_id = None`.
  3. Deletes dependent `CandidateTestSubmission` rows for `job_id`.
  4. Deletes `JobAssessment` row (cached AI questions).
  5. Deletes all `JobApplication` rows for `job_id`.
  6. Deletes notifications referencing this job requisition.
  7. Deletes the `Job` record itself completely via `db.delete(job); db.commit()`.
- **Return Value**:
  ```json
  {
    "detail": "Job permanently deleted from entire system",
    "job_id": 12,
    "success": true,
    "message": "Job requisition '...' was permanently deleted from entire system."
  }
  ```

---

#### `applications.py` (Application Lifecycle & Interviewing)

##### `POST /api/v1/applications/apply/{job_id}`
- **Purpose**: One-click application using candidate's primary parsed resume.
- **Processing Logic**: Verifies job is active and unfrozen. Extracts candidate's primary resume. Calculates 4-stage ATS score using `JobMatchService.calculate_comprehensive_match()`. Inserts `JobApplication` with status `APPLIED` and computed `match_score`.
- **Return Value**: `JobApplicationResponse`.

##### `POST /api/v1/applications/{application_id}/decision`
- **Purpose**: Recruiter hiring decision (Shortlist, Invite to Stage 2, or Reject).
- **Request Payload**: `{"decision": "SHORTLISTED", "notes": "Strong candidate background", "rejection_reason": null}`.
- **Processing Logic**: Updates application status, sets recruiter notes, and dispatches an in-app `Notification` to the candidate.
- **Return Value**: Updated `JobApplicationResponse`.

##### `POST /api/v1/applications/{application_id}/schedule-interview`
- **Purpose**: Formal interview scheduling with calendar details and automatic email delivery.
- **Request Payload**:
  ```json
  {
    "interview_date": "2026-11-15",
    "interview_time": "14:00 GMT+6",
    "meeting_link": "https://meet.google.com/abc-defg-hij",
    "recruiter_notes": "Technical architectural interview."
  }
  ```
- **Processing Logic**: Sets application status to `INTERVIEW`. Saves meeting details. Uses `EmailService.send_interview_invitation()` to dispatch a formatted HTML email to the candidate's email address and creates a notification record.
- **Return Value**: Confirmation with meeting details.

---

#### `assessments.py` (AI Tests & Stage-2 Rubric Evaluation)

##### `GET /api/v1/jobs/{job_id}/assessment`
- **Purpose**: Retrieves or dynamically generates the 25 MCQ + 5 Written pre-screening assessment.
- **Processing Logic**: Checks if a `JobAssessment` already exists for this `job_id`. If not, calls `GeminiService.generate_screening_assessment()` to create 25 MCQs and 5 Written technical questions based on the job's title, description, and required skills, saving the result to `job_assessments`. Strips answer keys and evaluation rubrics before sending to candidate clients.
- **Return Value**:
  ```json
  {
    "assessment_id": 4,
    "job_id": 12,
    "mcq_questions": [{"id": 1, "question": "...", "options": ["..."]}],
    "written_questions": [{"id": 1, "question": "...", "max_marks": 10}]
  }
  ```

##### `POST /api/v1/jobs/{job_id}/assessment/submit`
- **Purpose**: Submits candidate answers for automated scoring and rubric evaluation.
- **Request Payload**:
  ```json
  {
    "mcq_answers": {"1": "B", "2": "C", ...},
    "written_answers": {"1": "My technical answer regarding ACID...", ...}
  }
  ```
- **Processing Logic**:
  1. Scores MCQs by checking against `JobAssessment.mcq_questions` correct answers (scaled to 50%).
  2. Sends written answers and grading rubrics to `GeminiService.evaluate_written_responses()` for AI evaluation (scaled to 50%).
  3. Combines scores into `total_test_score` (0–100%).
  4. Compares `total_test_score` to the job's `passing_score`. Sets `is_stage1_passed` to `True` (status `STAGE1_PASSED`) or `False` (status `STAGE1_FAILED`).
  5. Inserts `CandidateTestSubmission` and updates `JobApplication`.
- **Return Value**:
  ```json
  {
    "submission_id": 8,
    "total_score": 84.5,
    "is_passed": true,
    "passing_score": 75.0,
    "mcq_score": 42.0,
    "written_score": 42.5,
    "feedback": "Strong command of backend architectural principles."
  }
  ```

---

#### `subscriptions.py` & `admin_payments.py` (Monetization & KYC Verification)

##### `GET /api/v1/subscriptions/plans`
- **Purpose**: Lists all active subscription plans for checkout.
- **Return Value**: Array of `SubscriptionPlanResponse` (`id`, `name`, `price_bdt`, `duration_days`, `description`).

##### `POST /api/v1/subscriptions/submit-payment`
- **Purpose**: Recruiter manual payment submission with corporate verification document upload.
- **Payload (`multipart/form-data`)**:
  - `plan_id` (`int`)
  - `payment_method` (`str`: `BKASH` | `NAGAD` | `ROCKET` | `BANK_TRANSFER`)
  - `sender_account` (`str`)
  - `transaction_id` (`str`)
  - `paid_amount` (`float`)
  - `kyc_document` (`UploadFile` - PDF trade license / company verification)
- **Processing Logic**:
  1. Validates file extension (PDF/image) and stores file in `uploads/kyc_docs/`.
  2. Creates immutable snapshots of the selected plan: `plan_name_snapshot`, `duration_days_snapshot`, `price_snapshot`.
  3. Creates `PaymentTransaction` with status `PENDING`.
  4. Sets `user.subscription_status = 'PENDING'`.
- **Return Value**: `PaymentTransactionResponse`.

##### `PATCH /api/v1/admin/payments/{id}/approve`
- **Purpose**: Super Admin approves recruiter transaction and upgrades user role.
- **Guard**: `require_super_admin`.
- **Processing Logic**:
  1. Marks `PaymentTransaction` status as `APPROVED`, setting `approved_at = now()`.
  2. Calculates `expires_at = now() + timedelta(days=duration_days_snapshot)`.
  3. Upgrades user: `user.role = UserRole.RECRUITER`, `user.subscription_status = 'ACTIVE'`, and `user.subscription_expires_at = expires_at`.
  4. Unfreezes any existing frozen jobs for this recruiter: updates `Job.is_frozen = False`.
  5. Dispatches an approval notification to the recruiter.
- **Return Value**: Updated `PaymentTransactionResponse`.

##### `PUT /api/v1/admin/settings/payment`
- **Purpose**: Updates system MFS and bank coordinates.
- **Request Payload**:
  ```json
  {
    "bkash_number": "01711000000",
    "nagad_number": "01811000000",
    "rocket_number": "01911000000",
    "bank_name": "Standard Chartered Bank",
    "bank_account_name": "AI Resume Corp Ltd",
    "bank_account_number": "01928384701",
    "bank_routing": "012345678"
  }
  ```
- **Return Value**: Updated `PaymentSettingsResponse`.

---

## 4. Frontend Directory Structure & Component Flow

### 4.1 Frontend Architecture Map

```
frontend/src/
├── assets/                  # Brand vectors, icons, and illustrations
├── components/
│   ├── assessment/
│   │   ├── ScreeningTestModal.jsx    # Candidate 25 MCQ + 5 Written exam interface
│   │   ├── Stage2AssessmentModal.jsx # Candidate Stage-2 manual exam interface
│   │   └── SubmissionReviewModal.jsx # Recruiter review of candidate test answers
│   ├── dashboard/
│   │   ├── MatchScoreCard.jsx        # ATS score circular visualization
│   │   ├── RecentActivity.jsx        # Candidate application timeline feed
│   │   └── StatCard.jsx              # Summary metric cards
│   ├── jobs/
│   │   ├── CreateJobModal.jsx        # Requisition publishing modal
│   │   └── JobPostModal.jsx          # Requisition editor & benchmark setter
│   ├── layout/
│   │   ├── AppLayout.jsx             # Shell wrapper: Navbar, dynamic Sidebar, Footer
│   │   ├── Footer.jsx                # Global navigation footer
│   │   ├── Navbar.jsx                # Responsive header, auth state, notification pill
│   │   └── Sidebar.jsx               # Role-aware sidebar navigation
│   ├── recruiter/
│   │   └── ApplicantDossierModal.jsx # Comprehensive candidate inspection modal
│   └── ui/                           # Reusable design system primitives
│       ├── Badge.jsx, Button.jsx, Card.jsx, ErrorBoundary.jsx, Input.jsx, Modal.jsx
├── context/
│   ├── AuthContext.jsx               # JWT token storage & user role management
│   ├── NotificationContext.jsx       # Global notification polling & toasts
│   └── ThemeContext.jsx              # Dark / light theme toggle and persistence
├── pages/
│   ├── admin/
│   │   ├── PaymentSettings.jsx       # Gateway coordinates management
│   │   ├── PaymentVerification.jsx   # KYC document inspection & approval table
│   │   └── PlansManagement.jsx       # Plan pricing and duration editor
│   ├── dashboard/
│   │   ├── ApplicationTracker.jsx    # Candidate application progress stepper
│   │   └── JobMatchFinder.jsx        # AI-recommended jobs sorted by match score
│   ├── recruiter/
│   │   └── RecruiterPanel.jsx        # Recruiter command center & requisition table
│   ├── resume-builder/
│   │   ├── ResumeAtsOptimizer.jsx    # Real-time keyword density & bullet suggestions
│   │   ├── ResumeBuilder.jsx         # Multi-step resume generator
│   │   ├── ResumeFormWizard.jsx      # Interactive section-by-section input wizard
│   │   ├── ResumeTemplateClassic.jsx # Traditional serif resume layout
│   │   └── ResumeTemplateModern.jsx  # Modern design layout
│   ├── subscription/
│   │   └── PricingCheckout.jsx       # Plan cards, payment form & KYC PDF upload
│   ├── AdminDashboard.jsx            # Unified Super Admin command center
│   ├── Dashboard.jsx                 # Candidate dashboard container
│   ├── Home.jsx                      # Landing page with dual candidate/recruiter CTA
│   ├── JobDetail.jsx                 # Detailed job view & one-click application
│   ├── Jobs.jsx                      # Searchable candidate job board
│   ├── KYCVerification.jsx           # Candidate identity submission page
│   ├── Profile.jsx                   # User profile manager
│   └── ResumeUpload.jsx              # Drag-and-drop resume parser & ATS scorer
├── services/
│   ├── api.js                        # Axios instance with request/response interceptors
│   ├── authService.js                # Auth API integration
│   ├── jobService.js                 # Jobs, applications & assessments API
│   ├── kycService.js                 # KYC API integration
│   ├── notificationService.js        # Notification polling & broadcast API
│   ├── resumeService.js              # Resume upload & parsing API
│   └── subscriptionService.js        # Plans, checkout & gateway API
├── App.jsx                           # Route declarations & route guards
└── main.jsx                          # Root React DOM bootstrap
```

### 4.2 Routing Topology & Route Guards (`App.jsx`)

The routing layer uses **React Router v6** with a centralized layout hierarchy and access guards:

```jsx
// Route Guard Implementation Architecture
function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, token, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (requireAdmin && user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
```

#### Complete Route Manifest:
- **Public Routes**:
  - `/`: Landing page (`Home.jsx`) with dual-path hero section for Job Seekers and Employers.
  - `/jobs`: Public job board (`Jobs.jsx`) with live keyword search and location filters.
  - `/jobs/:id`: Job details view (`JobDetail.jsx`) with one-click application modal.
  - `/pricing`: Recruiter subscription plans and checkout (`PricingCheckout.jsx`).
  - `/login` / `/register`: Authentication portal (`AuthPage.jsx`).
- **Protected Candidate Routes (`requireAdmin=false`)**:
  - `/dashboard`: Candidate dashboard (`Dashboard.jsx`), supporting tabs: `matches`, `applications`, `overview`.
  - `/resumes`: Resume upload and ATS score review (`ResumeUpload.jsx`).
  - `/resume-builder`: Step-by-step AI resume builder (`ResumeBuilder.jsx`).
  - `/kyc`: Candidate identity verification portal (`KYCVerification.jsx`).
  - `/profile`: User account settings (`Profile.jsx`).
- **Protected Recruiter Routes**:
  - `/recruiter`: Comprehensive recruiter console (`RecruiterPanel.jsx`). Visible to users with `RECRUITER` or `SUPER_ADMIN` roles.
- **Protected Super Admin Routes (`requireAdmin=true`)**:
  - `/admin`: Super Admin Command Center (`AdminDashboard.jsx`), with sub-tabs for `overview`, `kyc`, `payments`, `payment-settings`, `plans`, and `jobs`.

### 4.3 Candidate Interfaces & ATS Optimizer

1. **Resume Parser & ATS Diagnostic Dashboard (`ResumeUpload.jsx`)**:
   - Accepts `.pdf` and `.docx` resume uploads.
   - Displays an animated SVG score gauge showing the 0–100 ATS match score.
   - Breaks down analysis into: Hard Skills match, Soft Skills presence, Seniority/Experience calibration, and actionable suggestions to improve keyword density.
2. **AI Pre-Screening Exam Modal (`ScreeningTestModal.jsx`)**:
   - Triggers when applying to a job with automated screening enabled.
   - Presents a timed interface with 25 technical MCQs (radio selection) and 5 written scenario questions (text area).
   - Shows a countdown timer with automatic submission on expiration.
   - Displays real-time test evaluation and score breakdown immediately upon completion.
3. **Application Tracker (`ApplicationTracker.jsx`)**:
   - Visual stepper showing application stages: `Applied` -> `Screening` -> `Shortlisted` -> `Stage 2 Test` -> `Interview Scheduled`.
   - Displays active interview invitation banners with direct links to Google Meet / Zoom when scheduled.

### 4.4 Recruiter Console & Candidate Review Dossier

1. **Requisition Management (`RecruiterPanel.jsx`)**:
   - **Requisition Form Builder**: Configures title, company, description, required skills, passing benchmark percentage, and optional Stage-2 custom questions.
   - **Stage-2 Custom Builder**: Add up to 10 custom MCQs (with editable options and designated correct keys) and up to 5 written technical prompts.
   - **Job Card Actions**:
     - *Pause / Activate Switch*: Toggles listing visibility without deleting records.
     - *Applicants Button*: Displays total candidate count and opens the review drawer.
     - *Permanent Delete (Red Trash Button)*: Opens a confirmation modal and executes a full cascading wipe on confirmation.
2. **Applicant Dossier Drawer (`ApplicantDossierModal.jsx`)**:
   - Opens a side-by-side inspection view displaying:
     - Candidate contact details, KYC badge status, and match score percentage.
     - Expandable resume summary with matched and missing skills.
     - Test breakdown: MCQ score (out of 50), Written score (out of 50), and AI rubric feedback per answer.
   - Decision controls: "Shortlist Candidate", "Invite to Stage-2", "Reject", and "Schedule Formal Interview".

### 4.5 Super Admin Command Center

**Unified Component**: `AdminDashboard.jsx` & `admin/` Sub-components.
- **KPI Metrics Bar**: Live counts of Total Users, Active Subscribers, Pending KYC requests, Active Jobs, Total Applications, and Resumes.
- **Payment Verification Center (`PaymentVerification.jsx`)**:
  - Tabbed tables: `Pending Verification`, `Approved History`, `Rejected History`.
  - Columns: Recruiter Name, Plan, Amount, Payment Method, Sender Account, Transaction ID, Submission Date.
  - "View Document" button opens the uploaded company trade license PDF in an embedded modal.
  - Approval immediately upgrades the recruiter's account and unfreezes any frozen listings.
- **Payment Gateway Settings (`PaymentSettings.jsx`)**:
  - Form to update platform payment coordinates (bKash, Nagad, Rocket numbers, Bank account details).
- **Subscription Plans Management (`PlansManagement.jsx`)**:
  - Manage available tiers: edit prices, update descriptions, and adjust plan durations.

### 4.6 Global State, Notification Polling & Toast Singletons

- **`AuthContext.jsx`**:
  Stores the JWT in `localStorage` under key `token`. Automatically sets the `Authorization: Bearer <token>` header across all Axios instances. Restores user profiles on app reload.
- **`NotificationContext.jsx`**:
  - Executes background polling every 30 seconds to fetch unread notifications from `/api/v1/notifications/`.
  - Uses an internal `useRef(new Set())` cache to prevent the same notification ID from triggering multiple toasts across re-renders.
  - Exposes `triggerToast({ title, message, type })` for user feedback across all components.

---

## 5. End-to-End Workflows & Business Logic

### 5.1 Candidate Lifecycle

```
[Candidate]                                [Backend]                               [Database / AI]
     |                                         |                                          |
     |---- 1. Upload Resume PDF -------------->|                                          |
     |                                         |---- 2. PyMuPDF Extraction -------------->|
     |                                         |---- 3. Gemini Entity Parsing ----------->|
     |                                         |<--- Return Skills & Experience ----------|
     |<--- 4. Render ATS Score & Feedback -----|                                          |
     |                                         |                                          |
     |---- 5. View Job & Click Apply --------->|                                          |
     |                                         |---- 6. Check Job Assessment Cache ------>|
     |                                         |     (Generate 25 MCQ / 5 W via Gemini)   |
     |<--- 7. Serve Screening Exam ------------|                                          |
     |                                         |                                          |
     |---- 8. Submit Exam Answers ------------>|                                          |
     |                                         |---- 9. Score MCQs + Evaluate Written --->|
     |                                         |     (Compute Total % vs Passing Score)   |
     |<--- 10. Display Immediate Results ------|                                          |
     |    (Status: STAGE1_PASSED)              |---- 11. Create JobApplication ---------->|
     |                                         |                                          |
     |<=== 12. Email / In-App Notification <---| <--- Recruiter Schedules Interview ------|
```

### 5.2 Recruiter Monetization & KYC Lifecycle

```
[Recruiter User]                           [Backend]                           [Super Admin Center]
     |                                         |                                          |
     |---- 1. Select Plan at /pricing -------->|                                          |
     |---- 2. Submit TrxID + KYC PDF --------->|                                          |
     |                                         |---- 3. Store PDF in uploads/kyc_docs/    |
     |                                         |---- 4. Save PaymentTransaction (PENDING) |
     |                                         |                                          |
     |<--- 5. Status: Awaiting Verification ---|====== 6. Notification: Pending Payment ==>|
     |                                         |                                          |
     |                                         |<----- 7. Admin Inspects KYC PDF ---------|
     |                                         |<----- 8. Admin Clicks Approve -----------|
     |                                         |                                          |
     |                                         |---- 9. User Role -> RECRUITER            |
     |                                         |---- 10. Sub Status -> ACTIVE             |
     |                                         |---- 11. Unfreeze Existing Jobs           |
     |<=== 12. Account Upgraded Notification ==|                                          |
     |                                         |                                          |
     |---- 13. Publish Job Requisitions ------>| (Posting Unlocked)                       |
```

### 5.3 Subscription Auto-Freeze & Permanent Deletion Workflow

#### 1. Auto-Freeze on Subscription Expiry
- **Trigger**: Every request to recruiter endpoints triggers `check_and_sync_subscription()`.
- **Logic**:
  - Compares `current_time` against `user.subscription_expires_at`.
  - If expired:
    1. Updates `user.subscription_status = 'EXPIRED'`.
    2. Updates all active jobs posted by this user: `Job.is_frozen = True`.
    3. Blocks new requisition publishing until a renewal transaction is approved.
  - Frozen jobs are excluded from the public candidate board (`/api/v1/jobs/public`) and candidate search matches until renewed.

#### 2. Permanent Requisition Deletion Workflow
- **Trigger**: Recruiter clicks the red trash icon on a job card in the Recruiter Dashboard (`/recruiter`).
- **Confirmation Step**: A modal warns that all associated applications, candidate submissions, and test results will be permanently removed.
- **Execution (`DELETE /api/v1/jobs/{job_id}`)**:
  1. Validates ownership (`job.posted_by_user_id == current_user.id`).
  2. Breaks circular references: sets `job_applications.candidate_test_submission_id = NULL`.
  3. Deletes `CandidateTestSubmission` rows for `job_id`.
  4. Deletes `JobAssessment` cached question sets for `job_id`.
  5. Deletes all `JobApplication` rows for `job_id`.
  6. Deletes related `Notification` rows.
  7. Deletes the `Job` record itself from the database (`db.delete(job); db.commit()`).
  8. Frontend immediately removes the job from `postedJobs` state without requiring a page reload and displays a confirmation toast.

---

### Verification and System Health Commands

To start and verify the application locally:

```bash
# 1. Start Backend API Server
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# 2. Check Backend Health
curl http://127.0.0.1:8000/health
# Response: {"status":"healthy","service":"AI Resume Analyzer & Job Match System","environment":"development"}

# 3. Start Frontend Client Server
cd frontend
npm run dev
# URL: http://localhost:5173

# 4. Run Production Build Verification
cd frontend
npm run build
# Compiles clean production chunks into frontend/dist/
```

---
*Documentation generated for production readiness.*
