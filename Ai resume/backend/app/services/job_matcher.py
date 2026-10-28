from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.job import Job
from app.models.resume import Resume
from app.services.matcher import JobMatchService
from app.utils.logger import logger


class JobMatcherService:
    """
    Background and synchronous job matching coordinator.
    Scans active database job postings against parsed resume skills and content.
    """

    @classmethod
    def calculate_match(cls, resume_skills: List[str], required_skills: List[str]) -> Dict[str, Any]:
        """Synchronous quick match between skill lists."""
        return JobMatchService.calculate_ats_match(
            resume_skills=resume_skills,
            resume_text=" ".join(resume_skills),
            resume_experience_years=2.0,
            required_skills=required_skills,
        )

    @classmethod
    def compute_all_job_matches(cls, resume_id: int, db: Session) -> List[Dict[str, Any]]:
        """
        Runs comprehensive ATS match across all active jobs in the database for the given resume.
        Stores the computed rankings in resume.parsed_data['job_matches'].
        """
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            logger.error(f"Cannot compute matches: Resume {resume_id} not found.")
            return []

        parsed = resume.parsed_data or {}
        resume_skills = parsed.get("skills", [])
        resume_text = resume.extracted_text or ""
        resume_exp = float(parsed.get("experience_years", 1.0))

        active_jobs = db.query(Job).filter(Job.is_active == True).all()
        matched_results = []

        for job in active_jobs:
            req_skills = job.required_skills or []
            exp_lvl = (
                job.experience_level.value
                if hasattr(job.experience_level, "value")
                else str(job.experience_level)
            )

            result = JobMatchService.calculate_ats_match(
                resume_skills=resume_skills,
                resume_text=resume_text,
                resume_experience_years=resume_exp,
                required_skills=req_skills,
                jd_text=job.description,
                expected_experience_level=exp_lvl,
            )

            matched_results.append({
                "job_id": job.id,
                "title": job.title,
                "company_name": job.company_name,
                "location": job.location,
                "job_type": job.job_type.value if hasattr(job.job_type, "value") else str(job.job_type),
                "salary_range": job.salary_range,
                "match_score": result["ats_score"],
                "match_level": result["match_level"],
                "shortlist_status": result.get("shortlist_status", "Filtered / Under Review"),
                "is_shortlisted": result.get("is_shortlisted", False),
                "score_breakdown": result.get("score_breakdown"),
                "matched_skills": result["matched_skills"],
                "missing_skills": result["missing_skills"],
                "suggestions": result["suggestions"],
                "learning_recommendations": result["learning_recommendations"],
            })

        # Sort jobs descending by compatibility match score
        matched_results.sort(key=lambda x: x["match_score"], reverse=True)

        # Persist updated match cache in resume.parsed_data
        parsed["job_matches"] = matched_results
        resume.parsed_data = parsed
        db.add(resume)
        db.commit()
        db.refresh(resume)

        logger.info(f"Successfully computed matches for resume {resume_id} against {len(active_jobs)} active jobs.")
        return matched_results


def background_match_resume_task(resume_id: int):
    """
    FastAPI BackgroundTasks worker that executes without blocking the HTTP upload response.
    """
    db: Session = SessionLocal()
    try:
        JobMatcherService.compute_all_job_matches(resume_id, db)
    except Exception as e:
        logger.error(f"Error in background job match worker for resume {resume_id}: {e}")
    finally:
        db.close()
