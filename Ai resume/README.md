# AI Resume Analyzer and Job Match System

Enterprise-grade full-stack platform designed to analyze applicant resumes using automated text extraction and heuristic ATS metrics, verify candidate identities with KYC pipelines and badges, and match candidates with job postings through a high-precision skill compatibility engine.

---

## 🏛️ System Architecture

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Axios, React Router v6.
- **Backend**: FastAPI (Python 3.10+), Pydantic v2 Settings, SQLAlchemy 2.0 ORM, PyMySQL, JWT Authentication (`python-jose`, `passlib[bcrypt]`), PDF Extraction (`pdfminer.six`, `pypdf2`).
- **Database**: MySQL 8.0+ with connection pooling, declarative schemas, and Alembic migrations.

---

## 📂 Project Structure

```plaintext
Ai resume/
├── .gitignore
├── README.md
├── backend/
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   ├── alembic.ini
│   ├── schema.sql                   # Raw MySQL DDL schema
│   ├── requirements.txt
│   ├── main.py                      # FastAPI application entrypoint
│   ├── .env.example
│   ├── .env
│   ├── uploads/                     # Upload storage
│   │   ├── resumes/
│   │   ├── kyc/
│   │   └── avatars/
│   └── app/
│       ├── core/
│       │   ├── config.py            # Pydantic BaseSettings & MySQL URL assembly
│       │   └── security.py          # Bcrypt hashing & JWT access tokens
│       ├── database/
│       │   ├── base.py              # Declarative Base & metadata registration
│       │   └── session.py           # Engine & connection pool configuration
│       ├── models/
│       │   ├── enums.py             # UserRole, KYCStatus, JobApplicationStatus, etc.
│       │   ├── user.py              # User entity with verified badge
│       │   ├── kyc.py               # KYC verification with NID & selfie paths
│       │   ├── profile.py           # User profile with JSON attributes
│       │   ├── resume.py            # Resume document & parsed JSON
│       │   ├── job.py               # Job requisition with required skills JSON
│       │   ├── application.py       # Candidate job application & AI match score
│       │   └── notification.py      # User and broadcast notifications
│       ├── schemas/                 # Pydantic v2 validation models
│       │   ├── user.py
│       │   ├── kyc.py
│       │   ├── profile.py
│       │   ├── resume.py
│       │   ├── job.py
│       │   ├── application.py
│       │   ├── notification.py
│       │   └── token.py
│       ├── api/v1/
│       │   ├── api_router.py        # Central router aggregator
│       │   ├── deps.py              # Auth & database session dependencies
│       │   └── endpoints/
│       │       ├── auth.py          # /register, /login, /me
│       │       ├── users.py         # Profile management
│       │       ├── kyc.py           # Document submissions & moderation
│       │       ├── resumes.py       # File upload, text extraction, ATS score
│       │       ├── jobs.py          # Job board & live AI matching
│       │       ├── applications.py  # Application tracking & recruiter status updates
│       │       └── notifications.py # Notification inbox & broadcasts
│       ├── services/
│       │   ├── resume_parser.py     # Document text parsing & ATS heuristic scoring
│       │   └── job_matcher.py       # Candidate vs. Job requisition matcher
│       └── utils/
│           ├── constants.py         # Tech skills catalog
│           ├── file_helpers.py      # Secure UUID file upload handlers
│           └── logger.py            # Unified logging
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    ├── .env.example
    ├── .env
    └── src/
        ├── App.jsx                  # Application routing & route protection
        ├── main.jsx                 # React root bootstrap
        ├── styles/
        │   └── index.css            # Tailwind directives
        ├── context/
        │   └── AuthContext.jsx      # Global authentication state
        ├── hooks/
        │   └── useAuth.js           # Auth consumption hook
        ├── services/
        │   ├── api.js               # Axios instance with JWT interceptors
        │   ├── authService.js
        │   ├── resumeService.js
        │   ├── jobService.js
        │   └── kycService.js
        ├── components/
        │   ├── ui/                  # Button, Card, Input, Badge, Modal
        │   ├── layout/              # Navbar, Sidebar, Footer, AppLayout
        │   └── dashboard/           # StatCard, MatchScoreCard, RecentActivity
        └── pages/
            ├── Home.jsx             # Landing page
            ├── Login.jsx            # Sign in
            ├── Register.jsx         # Sign up
            ├── Dashboard.jsx        # Candidate command center
            ├── ResumeUpload.jsx     # ATS parsing & score breakdown
            ├── Jobs.jsx             # Job listings & job creation
            ├── JobDetail.jsx        # Live AI match testing & application
            ├── Profile.jsx          # Profile management
            ├── KYCVerification.jsx  # NID & Selfie submission
            ├── AdminDashboard.jsx   # Admin KYC review & badge issuing
            └── NotFound.jsx         # 404 page
```

---

## 🗄️ Database Schema Specification

### 1. `users`
- `id` (INT, PK, AUTO_INCREMENT)
- `email` (VARCHAR(255), UNIQUE, INDEX, NOT NULL)
- `hashed_password` (VARCHAR(255), NOT NULL)
- `full_name` (VARCHAR(150), NOT NULL)
- `role` (ENUM: `NORMAL_USER`, `SUBSCRIBER`, `SUPER_ADMIN`, DEFAULT: `NORMAL_USER`)
- `is_verified_badge` (BOOLEAN, DEFAULT: FALSE)
- `created_at`, `updated_at` (DATETIME)

### 2. `kyc_verifications`
- `id` (INT, PK, AUTO_INCREMENT)
- `user_id` (INT, FK -> `users.id` ON DELETE CASCADE)
- `real_name` (VARCHAR(150), NOT NULL)
- `phone_number` (VARCHAR(50), NOT NULL)
- `nid_doc_path` (VARCHAR(500), NOT NULL)
- `selfie_path` (VARCHAR(500), NOT NULL)
- `status` (ENUM: `PENDING`, `APPROVED`, `REJECTED`, DEFAULT: `PENDING`)
- `rejection_reason` (TEXT, NULLABLE)
- `reviewed_by` (INT, FK -> `users.id` ON DELETE SET NULL, NULLABLE)
- `reviewed_at` (DATETIME, NULLABLE)
- `created_at`, `updated_at` (DATETIME)

### 3. `user_profiles`
- `id` (INT, PK, AUTO_INCREMENT)
- `user_id` (INT, UNIQUE, FK -> `users.id` ON DELETE CASCADE)
- `headline` (VARCHAR(255), NULLABLE)
- `bio` (TEXT, NULLABLE)
- `photo_url` (VARCHAR(500), NULLABLE)
- `contact_info` (JSON: phone, linkedin, github, portfolio)
- `experience` (JSON: job titles, companies, dates)
- `education` (JSON: degrees, schools, years)
- `certifications` (JSON)
- `skills` (JSON: array of skill strings)
- `created_at`, `updated_at` (DATETIME)

### 4. `resumes`
- `id` (INT, PK, AUTO_INCREMENT)
- `user_id` (INT, FK -> `users.id` ON DELETE CASCADE)
- `file_path` (VARCHAR(500), NOT NULL)
- `extracted_text` (LONGTEXT, NULLABLE)
- `parsed_data` (JSON: contact, skills, experience estimate, ATS score)
- `version` (INT, DEFAULT: 1)
- `is_primary` (BOOLEAN, DEFAULT: TRUE)
- `created_at`, `updated_at` (DATETIME)

### 5. `jobs`
- `posted_by_user_id` (INT, FK -> `users.id` ON DELETE CASCADE)
- `title` (VARCHAR(200), NOT NULL, INDEX)
- `company_name` (VARCHAR(200), NOT NULL, INDEX)
- `description` (TEXT, NOT NULL)
- `required_skills` (JSON, NOT NULL)
- `experience_level` (ENUM: `ENTRY`, `MID`, `SENIOR`, `LEAD`)
- `location` (VARCHAR(200), NOT NULL)
- `job_type` (ENUM: `FULL_TIME`, `PART_TIME`, `REMOTE`, `CONTRACT`, `HYBRID`)
- `salary_range` (VARCHAR(100), NULLABLE)
- `is_active` (BOOLEAN, DEFAULT: TRUE, INDEX)
- `created_at`, `updated_at` (DATETIME)

### 6. `job_applications`
- `id` (INT, PK, AUTO_INCREMENT)
- `job_id` (INT, FK -> `jobs.id` ON DELETE CASCADE)
- `user_id` (INT, FK -> `users.id` ON DELETE CASCADE)
- `resume_id` (INT, FK -> `resumes.id` ON DELETE RESTRICT)
- `status` (ENUM: `APPLIED`, `SCREENING`, `INTERVIEW`, `REJECTED`, `ACCEPTED`)
- `match_score` (FLOAT, NULLABLE)
- `applied_at`, `updated_at` (DATETIME)
- *Constraint*: `UNIQUE(job_id, user_id)`

### 7. `notifications`
- `id` (INT, PK, AUTO_INCREMENT)
- `user_id` (INT, NULLABLE, FK -> `users.id` ON DELETE CASCADE — NULL for broadcasts)
- `title` (VARCHAR(255), NOT NULL)
- `message` (TEXT, NOT NULL)
- `type` (ENUM: `SYSTEM`, `KYC`, `JOB`, `BROADCAST`)
- `is_read` (BOOLEAN, DEFAULT: FALSE)
- `created_at` (DATETIME)

---

## 🚀 Quickstart Guide

### 1. Database Setup
Create the MySQL database or execute the raw schema directly:
```bash
mysql -u root -p < backend/schema.sql
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Copy .env.example to .env and adjust your MySQL password:
# MYSQL_PASSWORD="your_password"

# Run migrations (Optional if using schema.sql)
alembic upgrade head

# Start FastAPI application
python main.py
# Or: uvicorn main:app --reload --port 8000
```
- API Documentation (Swagger): `http://localhost:8000/api/v1/docs`
- Redoc: `http://localhost:8000/api/v1/redoc`

### 3. Frontend Setup
```bash
cd frontend

# Install Node modules
npm install

# Start Vite development server
npm run dev
```
- Application UI: `http://localhost:5173`
