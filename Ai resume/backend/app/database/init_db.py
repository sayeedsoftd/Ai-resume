from sqlalchemy import text, inspect
from sqlalchemy.orm import Session
from app.database.base import Base
from app.database.session import engine, SessionLocal
from app.models.subscription import SubscriptionPlan, SystemPaymentSettings
from app.core.config import settings
from app.utils.logger import logger


def init_db_and_seed():
    """
    Non-destructive database initializer:
    1. Verifies/creates new tables without dropping existing tables.
    2. Ensures new columns exist on existing tables.
    3. Seeds initial demo payment settings and subscription plans if empty.
    4. Ensures upload directories exist.
    """
    try:
        # 1. Non-destructive table creation
        Base.metadata.create_all(bind=engine)

        # 2. Non-destructive column sync
        with engine.connect() as conn:
            insp = inspect(conn)

            # Check users table columns
            user_cols = [c["name"] for c in insp.get_columns("users")]
            if "subscription_status" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN subscription_status VARCHAR(50) NOT NULL DEFAULT 'NONE'"))
            if "subscription_expires_at" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN subscription_expires_at DATETIME NULL"))
            
            # Widen role column to allow RECRUITER safely
            conn.execute(text("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'NORMAL_USER'"))

            # Check jobs table columns
            job_cols = [c["name"] for c in insp.get_columns("jobs")]
            if "is_frozen" not in job_cols:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN is_frozen BOOLEAN NOT NULL DEFAULT FALSE"))
            if "is_deleted" not in job_cols:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE"))
            if "sla_review_days" not in job_cols:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN sla_review_days INT NOT NULL DEFAULT 5"))
            if "sla_guarantee_enabled" not in job_cols:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN sla_guarantee_enabled BOOLEAN NOT NULL DEFAULT TRUE"))

            # Check job_applications table columns (Anti-Cheating / Proctoring / Growth Feedback / SLA)
            app_cols = [c["name"] for c in insp.get_columns("job_applications")]
            if "tab_switch_count" not in app_cols:
                conn.execute(text("ALTER TABLE job_applications ADD COLUMN tab_switch_count INT NOT NULL DEFAULT 0"))
            if "is_suspicious" not in app_cols:
                conn.execute(text("ALTER TABLE job_applications ADD COLUMN is_suspicious BOOLEAN NOT NULL DEFAULT FALSE"))
            if "proctoring_violations" not in app_cols:
                conn.execute(text("ALTER TABLE job_applications ADD COLUMN proctoring_violations JSON NULL"))
            if "submission_reason" not in app_cols:
                conn.execute(text("ALTER TABLE job_applications ADD COLUMN submission_reason VARCHAR(50) NOT NULL DEFAULT 'NORMAL'"))
            if "rejection_reason_notes" not in app_cols:
                conn.execute(text("ALTER TABLE job_applications ADD COLUMN rejection_reason_notes TEXT NULL"))
            if "ai_growth_feedback" not in app_cols:
                conn.execute(text("ALTER TABLE job_applications ADD COLUMN ai_growth_feedback JSON NULL"))
            if "feedback_generated_at" not in app_cols:
                conn.execute(text("ALTER TABLE job_applications ADD COLUMN feedback_generated_at DATETIME NULL"))
            if "sla_deadline" not in app_cols:
                conn.execute(text("ALTER TABLE job_applications ADD COLUMN sla_deadline DATETIME NULL"))
            if "sla_breached" not in app_cols:
                conn.execute(text("ALTER TABLE job_applications ADD COLUMN sla_breached BOOLEAN NOT NULL DEFAULT FALSE"))
            if "notification_sent" not in app_cols:
                conn.execute(text("ALTER TABLE job_applications ADD COLUMN notification_sent BOOLEAN NOT NULL DEFAULT FALSE"))
            if "notification_channel" not in app_cols:
                conn.execute(text("ALTER TABLE job_applications ADD COLUMN notification_channel VARCHAR(50) NULL DEFAULT 'WHATSAPP_AND_SMS'"))
            if "notification_sent_at" not in app_cols:
                conn.execute(text("ALTER TABLE job_applications ADD COLUMN notification_sent_at DATETIME NULL"))
            if "whatsapp_status" not in app_cols:
                conn.execute(text("ALTER TABLE job_applications ADD COLUMN whatsapp_status VARCHAR(50) NULL DEFAULT 'SENT'"))
            if "sms_status" not in app_cols:
                conn.execute(text("ALTER TABLE job_applications ADD COLUMN sms_status VARCHAR(50) NULL DEFAULT 'SENT'"))

            # Check interviews table columns
            if "interviews" in insp.get_table_names():
                interview_cols = [c["name"] for c in insp.get_columns("interviews")]
                if "notification_sent" not in interview_cols:
                    conn.execute(text("ALTER TABLE interviews ADD COLUMN notification_sent BOOLEAN NOT NULL DEFAULT FALSE"))
                if "notification_channel" not in interview_cols:
                    conn.execute(text("ALTER TABLE interviews ADD COLUMN notification_channel VARCHAR(50) NULL DEFAULT 'WHATSAPP_AND_SMS'"))
                if "notification_sent_at" not in interview_cols:
                    conn.execute(text("ALTER TABLE interviews ADD COLUMN notification_sent_at DATETIME NULL"))
                if "whatsapp_status" not in interview_cols:
                    conn.execute(text("ALTER TABLE interviews ADD COLUMN whatsapp_status VARCHAR(50) NULL DEFAULT 'SENT'"))
                if "sms_status" not in interview_cols:
                    conn.execute(text("ALTER TABLE interviews ADD COLUMN sms_status VARCHAR(50) NULL DEFAULT 'SENT'"))
                if "whatsapp_message_id" not in interview_cols:
                    conn.execute(text("ALTER TABLE interviews ADD COLUMN whatsapp_message_id VARCHAR(100) NULL"))
                if "sms_message_id" not in interview_cols:
                    conn.execute(text("ALTER TABLE interviews ADD COLUMN sms_message_id VARCHAR(100) NULL"))

            # Check candidate_test_submissions table columns
            sub_cols = [c["name"] for c in insp.get_columns("candidate_test_submissions")]
            if "tab_switch_count" not in sub_cols:
                conn.execute(text("ALTER TABLE candidate_test_submissions ADD COLUMN tab_switch_count INT NOT NULL DEFAULT 0"))
            if "is_suspicious" not in sub_cols:
                conn.execute(text("ALTER TABLE candidate_test_submissions ADD COLUMN is_suspicious BOOLEAN NOT NULL DEFAULT FALSE"))
            if "proctoring_violations" not in sub_cols:
                conn.execute(text("ALTER TABLE candidate_test_submissions ADD COLUMN proctoring_violations JSON NULL"))
            if "submission_reason" not in sub_cols:
                conn.execute(text("ALTER TABLE candidate_test_submissions ADD COLUMN submission_reason VARCHAR(50) NOT NULL DEFAULT 'NORMAL'"))

            # Check user_profiles table columns
            profile_cols = [c["name"] for c in insp.get_columns("user_profiles")]
            if "projects" not in profile_cols:
                conn.execute(text("ALTER TABLE user_profiles ADD COLUMN projects JSON NULL"))
            if "github_username" not in profile_cols:
                conn.execute(text("ALTER TABLE user_profiles ADD COLUMN github_username VARCHAR(150) NULL"))
            if "github_data" not in profile_cols:
                conn.execute(text("ALTER TABLE user_profiles ADD COLUMN github_data JSON NULL"))

            # Widen notifications type column
            conn.execute(text("ALTER TABLE notifications MODIFY COLUMN type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM'"))

            conn.commit()

        # 3. Seed default payment credentials and plans if empty
        db: Session = SessionLocal()
        try:
            if db.query(SystemPaymentSettings).count() == 0:
                demo_settings = SystemPaymentSettings(
                    bkash_number="01700000000",
                    nagad_number="01800000000",
                    rocket_number="01900000000",
                    bank_name="City Bank Limited",
                    bank_account_name="ResumeAI Solutions Ltd.",
                    bank_account_number="1102938475001",
                    bank_routing="085273149",
                )
                db.add(demo_settings)
                db.commit()
                logger.info("Seeded initial SystemPaymentSettings.")

            if db.query(SubscriptionPlan).count() == 0:
                default_plans = [
                    SubscriptionPlan(
                        name="Basic Recruiter Monthly",
                        description="Standard monthly plan: 30 days active recruiter status with custom AI candidate assessments.",
                        duration_days=30,
                        price_bdt=1500.0,
                        is_active=True,
                    ),
                    SubscriptionPlan(
                        name="Quarterly Growth Plan",
                        description="3 months full recruiter access with prioritized candidate matching and interview scheduler.",
                        duration_days=90,
                        price_bdt=3800.0,
                        is_active=True,
                    ),
                    SubscriptionPlan(
                        name="Annual Enterprise Recruiter",
                        description="365 days unlimited recruiter requisitions, stage-2 tests, and candidate dossiers.",
                        duration_days=365,
                        price_bdt=12000.0,
                        is_active=True,
                    ),
                ]
                db.add_all(default_plans)
                db.commit()
                logger.info("Seeded initial SubscriptionPlans.")
        finally:
            db.close()

        # 4. Ensure upload directories exist
        settings.resume_upload_dir
        settings.kyc_upload_dir
        settings.avatar_upload_dir
        settings.photos_upload_dir
        settings.kyc_docs_upload_dir

        logger.info("Database verification and seeding completed successfully.")
    except Exception as e:
        logger.warning(f"Database initialization notice: {e}")
