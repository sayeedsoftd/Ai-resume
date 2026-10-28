import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.session import engine
from sqlalchemy import inspect, text

def sync_database_schema():
    inspector = inspect(engine)
    jobs_cols = [c['name'] for c in inspector.get_columns('jobs')]
    apps_cols = [c['name'] for c in inspector.get_columns('job_applications')]
    print("Initial jobs columns:", jobs_cols)
    print("Initial job_applications columns:", apps_cols)

    with engine.begin() as conn:
        # Sync jobs table
        if 'passing_score' not in jobs_cols:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN passing_score FLOAT NOT NULL DEFAULT 70.0"))
            print("Added passing_score to jobs")
        if 'has_manual_stage' not in jobs_cols:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN has_manual_stage BOOLEAN NOT NULL DEFAULT FALSE"))
            print("Added has_manual_stage to jobs")
        if 'manual_questions' not in jobs_cols:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN manual_questions JSON NULL"))
            print("Added manual_questions to jobs")
        if 'views_count' not in jobs_cols:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN views_count INT NOT NULL DEFAULT 0"))
            print("Added views_count to jobs")

        # Sync job_applications table
        try:
            conn.execute(text("ALTER TABLE job_applications MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'APPLIED'"))
            print("Modified job_applications.status to VARCHAR(50)")
        except Exception as e:
            print("Status modify note:", e)

        if 'is_stage1_passed' not in apps_cols:
            conn.execute(text("ALTER TABLE job_applications ADD COLUMN is_stage1_passed BOOLEAN NULL"))
            print("Added is_stage1_passed to job_applications")
        if 'stage2_submission' not in apps_cols:
            conn.execute(text("ALTER TABLE job_applications ADD COLUMN stage2_submission JSON NULL"))
            print("Added stage2_submission to job_applications")
        if 'interview_time' not in apps_cols:
            conn.execute(text("ALTER TABLE job_applications ADD COLUMN interview_time VARCHAR(50) NULL"))
            print("Added interview_time to job_applications")

    inspector = inspect(engine)
    print("Final jobs columns:", [c['name'] for c in inspector.get_columns('jobs')])
    print("Final job_applications columns:", [c['name'] for c in inspector.get_columns('job_applications')])

if __name__ == '__main__':
    sync_database_schema()
