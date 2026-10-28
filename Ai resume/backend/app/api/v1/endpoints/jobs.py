from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import (
    get_db,
    get_current_user,
    require_subscriber_or_admin,
)
from app.models.user import User
from app.models.job import Job
from app.models.resume import Resume
from app.models.application import JobApplication
from app.models.notification import Notification
from app.models.enums import ExperienceLevel, JobType, NotificationType, JobApplicationStatus
from app.schemas.job import (
    JobCreate,
    JobResponse,
    JobUpdate,
    SuperAdminJobMetrics,
    JobMatchResult,
    MatchedJobItem,
)
from app.schemas.application import JobApplicationResponse
from app.services.matcher import JobMatchService
from app.services.job_matcher import JobMatcherService
from app.services.gemini_service import GeminiService

router = APIRouter()


def _sanitize_and_cap_manual_questions(raw_questions: Any) -> Optional[Any]:
    """Ensures Stage-2 manual questions strictly do not exceed 10 MCQs and 5 Written questions."""
    if not raw_questions:
        return None
    if isinstance(raw_questions, list):
        mcqs = [q for q in raw_questions if q.get("type") == "MCQ"]
        written = [q for q in raw_questions if q.get("type") == "WRITTEN"]
        if not mcqs and not written:
            mcqs = [q for q in raw_questions if "options" in q]
            written = [q for q in raw_questions if "options" not in q]
        return mcqs[:10] + written[:5]
    elif isinstance(raw_questions, dict):
        mcqs = raw_questions.get("mcqs", [])[:10]
        written = raw_questions.get("written", [])[:5]
        return {"mcqs": mcqs, "written": written}
    return raw_questions


@router.get("/", response_model=List[JobResponse])
def list_jobs(
    q: Optional[str] = Query(None, description="Search keyword in title or company"),
    location: Optional[str] = None,
    job_type: Optional[JobType] = None,
    experience_level: Optional[ExperienceLevel] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List all active job postings with filtering and search capabilities."""
    query = db.query(Job).filter(Job.is_active == True)

    if q:
        search_filter = f"%{q}%"
        query = query.filter((Job.title.ilike(search_filter)) | (Job.company_name.ilike(search_filter)))
    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))
    if job_type:
        query = query.filter(Job.job_type == job_type)
    if experience_level:
        query = query.filter(Job.experience_level == experience_level)

    return query.order_by(Job.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    job_in: JobCreate,
    current_user: User = Depends(require_subscriber_or_admin),
    db: Session = Depends(get_db),
):
    """
    Restricted to SUBSCRIBER and SUPER_ADMIN:
    Publish a new job requisition with passing score benchmark and optional Stage-2 manual assessment questions.
    """
    job = Job(
        posted_by_user_id=current_user.id,
        title=job_in.title,
        company_name=job_in.company_name,
        description=job_in.description,
        required_skills=job_in.required_skills,
        experience_level=job_in.experience_level,
        location=job_in.location,
        job_type=job_in.job_type,
        salary_range=job_in.salary_range,
        is_active=job_in.is_active if job_in.is_active is not None else True,
        passing_score=job_in.passing_score if job_in.passing_score is not None else 70.0,
        has_manual_stage=bool(job_in.has_manual_stage),
        manual_questions=_sanitize_and_cap_manual_questions(job_in.manual_questions) if job_in.has_manual_stage else None,
        views_count=0,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    job_in: JobUpdate,
    current_user: User = Depends(require_subscriber_or_admin),
    db: Session = Depends(get_db),
):
    """Update job posting details including passing score benchmark and Stage-2 manual test."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    if job.posted_by_user_id != current_user.id and current_user.role.value != "SUPER_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this job.")

    update_data = job_in.model_dump(exclude_unset=True)
    if "manual_questions" in update_data and update_data["manual_questions"]:
        update_data["manual_questions"] = _sanitize_and_cap_manual_questions(update_data["manual_questions"])

    for field, value in update_data.items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)
    return job


@router.get("/matched", response_model=List[MatchedJobItem])
def get_matched_jobs_for_candidate(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Computes and returns active job openings sorted descending by match score
    against the candidate's primary resume.
    """
    primary_resume = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id, Resume.is_primary == True)
        .order_by(Resume.created_at.desc())
        .first()
    )
    if not primary_resume:
        # Fallback to most recent resume if none marked primary
        primary_resume = (
            db.query(Resume)
            .filter(Resume.user_id == current_user.id)
            .order_by(Resume.created_at.desc())
            .first()
        )

    if not primary_resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume found. Please upload a resume to view matched job openings.",
        )

    # Compute or retrieve fresh match matrix
    matches = JobMatcherService.compute_all_job_matches(primary_resume.id, db)
    return matches


@router.get("/{job_id}", response_model=JobResponse)
def get_job_by_id(job_id: int, db: Session = Depends(get_db)):
    """Retrieve full details of a specific job posting and increment total views."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    
    # Increment oversight view count
    job.views_count = (job.views_count or 0) + 1
    db.commit()
    db.refresh(job)
    return job


@router.get("/{job_id}/stage2-assessment")
def get_stage2_assessment(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Candidate & Recruiter Endpoint: Retrieve Stage-2 manual assessment questions for a job.
    If requested by candidate, strips correct answers and rubric solutions to prevent cheating.
    Provides complete marks breakdown: 2 marks per MCQ, 10 marks per Written question.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    if not job.has_manual_stage and not job.manual_questions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This job does not have a Stage-2 manual assessment.")

    # Strict privacy isolation: Super Admin cannot take or view candidate assessment questions
    if current_user.role.value == "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admins cannot view assessment questions for privacy."
        )

    is_recruiter = job.posted_by_user_id == current_user.id

    raw_questions = job.manual_questions or {}
    if isinstance(raw_questions, list):
        mcqs = [q for q in raw_questions if q.get("type") == "MCQ"]
        written = [q for q in raw_questions if q.get("type") == "WRITTEN"]
        if not mcqs and not written:
            mcqs = [q for q in raw_questions if "options" in q]
            written = [q for q in raw_questions if "options" not in q]
    else:
        mcqs = raw_questions.get("mcqs", [])
        written = raw_questions.get("written", [])

    # Cap strictly to 10 MCQs and 5 Written
    mcqs = mcqs[:10]
    written = written[:5]

    mcq_marks_per_question = 2
    written_marks_per_question = 10
    total_mcq_marks = len(mcqs) * mcq_marks_per_question
    total_written_marks = len(written) * written_marks_per_question
    total_maximum_marks = total_mcq_marks + total_written_marks

    if not is_recruiter:
        # Strip answer keys for candidate view and attach question marks
        safe_mcqs = [
            {
                "id": q.get("id", i + 1),
                "question": q.get("question", ""),
                "options": q.get("options", []),
                "marks": mcq_marks_per_question,
            }
            for i, q in enumerate(mcqs)
        ]
        safe_written = [
            {
                "id": w.get("id", i + 1),
                "question": w.get("question", ""),
                "instructions": w.get("instructions", ""),
                "marks": written_marks_per_question,
            }
            for i, w in enumerate(written)
        ]
        return {
            "job_id": job.id,
            "job_title": job.title,
            "company_name": job.company_name,
            "has_manual_stage": True,
            "passing_score": job.passing_score or 70.0,
            "mcq_marks_per_question": mcq_marks_per_question,
            "written_marks_per_question": written_marks_per_question,
            "total_mcq_marks": total_mcq_marks,
            "total_written_marks": total_written_marks,
            "total_maximum_marks": total_maximum_marks,
            "mcqs": safe_mcqs,
            "written": safe_written,
        }

    return {
        "job_id": job.id,
        "job_title": job.title,
        "company_name": job.company_name,
        "has_manual_stage": True,
        "passing_score": job.passing_score or 70.0,
        "mcq_marks_per_question": mcq_marks_per_question,
        "written_marks_per_question": written_marks_per_question,
        "total_mcq_marks": total_mcq_marks,
        "total_written_marks": total_written_marks,
        "total_maximum_marks": total_maximum_marks,
        "mcqs": mcqs,
        "written": written,
    }


@router.post("/{job_id}/apply", response_model=JobApplicationResponse, status_code=status.HTTP_201_CREATED)
def one_click_apply_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    One-click apply using user's primary resume.
    Automatically computes compatibility score and records application.
    """
    job = db.query(Job).filter(Job.id == job_id, Job.is_active == True).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found or inactive.")

    primary_resume = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id, Resume.is_primary == True)
        .order_by(Resume.created_at.desc())
        .first()
    )
    if not primary_resume:
        primary_resume = (
            db.query(Resume)
            .filter(Resume.user_id == current_user.id)
            .order_by(Resume.created_at.desc())
            .first()
        )

    if not primary_resume:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a resume first before applying to jobs.",
        )

    existing = (
        db.query(JobApplication)
        .filter(JobApplication.job_id == job_id, JobApplication.user_id == current_user.id)
        .first()
    )
    if existing:
        return existing

    resume_skills = (primary_resume.parsed_data or {}).get("skills", [])
    resume_text = primary_resume.extracted_text or ""
    resume_exp = float((primary_resume.parsed_data or {}).get("experience_years", 1.0))
    exp_lvl = (
        job.experience_level.value
        if hasattr(job.experience_level, "value")
        else str(job.experience_level)
    )

    match_res = JobMatchService.calculate_ats_match(
        resume_skills=resume_skills,
        resume_text=resume_text,
        resume_experience_years=resume_exp,
        required_skills=job.required_skills or [],
        jd_text=job.description,
        expected_experience_level=exp_lvl,
    )

    application = JobApplication(
        job_id=job.id,
        user_id=current_user.id,
        resume_id=primary_resume.id,
        status=JobApplicationStatus.APPLIED,
        match_score=match_res.get("ats_score", 70.0),
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    # In-app notification to candidate
    db.add(
        Notification(
            user_id=current_user.id,
            title="Application Submitted",
            message=f"You successfully applied for '{job.title}' at {job.company_name}.",
            type=NotificationType.JOB,
        )
    )
    db.commit()
    return application


@router.post("/{job_id}/match/{resume_id}", response_model=JobMatchResult)
def match_job_with_resume(
    job_id: int,
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run interactive 4-stage ATS matching comparison between a specific job and resume."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")

    parsed = resume.parsed_data or {}
    resume_text = resume.extracted_text or ""
    exp_lvl = (
        job.experience_level.value
        if hasattr(job.experience_level, "value")
        else str(job.experience_level)
    )
    exp_map = {"ENTRY": 1.0, "MID": 3.0, "SENIOR": 5.0, "LEAD": 8.0}
    min_exp_years = exp_map.get(exp_lvl.upper(), 2.0)

    ai_eval = GeminiService.evaluate_4stage_ats_pipeline(
        candidate_profile=parsed,
        resume_text=resume_text,
        job_title=job.title,
        job_description=job.description or "",
        required_skills=job.required_skills or [],
        experience_level=exp_lvl,
        min_experience_years=min_exp_years,
    )

    return JobMatchResult(
        job=job,
        match_score=float(ai_eval.get("ats_score", 70.0)),
        match_level=str(ai_eval.get("match_level", "Moderate Match")),
        shortlist_status=str(ai_eval.get("shortlist_status", "Filtered / Under Review")),
        is_shortlisted=bool(ai_eval.get("is_shortlisted", False)),
        score_breakdown=ai_eval.get("score_breakdown"),
        matched_skills=ai_eval.get("matched_skills", []),
        missing_skills=ai_eval.get("missing_skills", []),
        summary_feedback=ai_eval.get("summary_feedback", f"Rated {ai_eval.get('match_level', 'Moderate Match')} compatibility."),
        suggestions=ai_eval.get("suggestions", []),
        learning_recommendations=ai_eval.get("learning_recommendations", []),
    )


@router.post("/{job_id}/roadmap")
def get_career_roadmap_for_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate an AI-powered skill gap upskilling roadmap with courses,
    learning milestones, and projects targeting this specific job requisition.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    primary_resume = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id, Resume.is_primary == True)
        .first()
    ) or (
        db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.created_at.desc()).first()
    )

    current_skills = (primary_resume.parsed_data or {}).get("skills", []) if primary_resume else []
    required = job.required_skills or []
    missing = [s for s in required if s.lower() not in [c.lower() for c in current_skills]]

    roadmap = GeminiService.generate_skill_roadmap(
        current_skills=current_skills,
        target_role=job.title,
        missing_skills=missing,
    )
    return roadmap


@router.get("/recruiter/my-posted-jobs", response_model=List[dict])
def get_my_posted_jobs(
    current_user: User = Depends(require_subscriber_or_admin),
    db: Session = Depends(get_db),
):
    """
    Recruiter panel: List all jobs posted by the current subscriber/admin,
    including total applicant count, passing benchmark, and manual Stage-2 details.
    """
    jobs = (
        db.query(Job)
        .filter(Job.posted_by_user_id == current_user.id)
        .order_by(Job.created_at.desc())
        .all()
    )

    results = []
    for j in jobs:
        app_count = db.query(JobApplication).filter(JobApplication.job_id == j.id).count()
        results.append({
            "id": j.id,
            "title": j.title,
            "company_name": j.company_name,
            "location": j.location,
            "job_type": j.job_type.value if hasattr(j.job_type, "value") else str(j.job_type),
            "experience_level": j.experience_level.value if hasattr(j.experience_level, "value") else str(j.experience_level),
            "salary_range": j.salary_range,
            "required_skills": j.required_skills or [],
            "description": j.description,
            "is_active": j.is_active,
            "created_at": j.created_at,
            "applicant_count": app_count,
            "passing_score": j.passing_score if j.passing_score is not None else 70.0,
            "has_manual_stage": bool(j.has_manual_stage),
            "manual_questions": j.manual_questions or {},
            "views_count": j.views_count or 0,
        })
    return results


@router.patch("/{job_id}/toggle-status")
def toggle_job_status(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle job active/inactive status (for poster or Super Admin)."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    
    if job.posted_by_user_id != current_user.id and current_user.role.value != "SUPER_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this job.")

    job.is_active = not job.is_active
    db.commit()
    db.refresh(job)
    return {
        "id": job.id,
        "is_active": job.is_active,
        "message": f"Job is now {'active' if job.is_active else 'inactive'}."
    }


@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recruiter endpoint: Safely delete a single targeted job specified by job_id.
    - Verifies requesting recruiter ownership.
    - Notifies only the applicants who applied to this specific job_id.
    - Safely removes only this specific job and its dependent records without affecting any other jobs.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    if job.posted_by_user_id != current_user.id and current_user.role.value != "SUPER_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this job.")

    job_title = job.title
    company_name = job.company_name

    # 1. Fetch only applicants for this specific job_id
    applicants = db.query(JobApplication).filter(JobApplication.job_id == job_id).all()

    # 2. Dispatch in-app notification to each applicant of this job
    for applicant in applicants:
        notification = Notification(
            user_id=applicant.user_id,
            title="Job Closed",
            message=f"The job posting '{job_title}' at '{company_name}' that you applied for has been closed and removed by the recruiter.",
            type=NotificationType.JOB,
        )
        db.add(notification)

    # 3. Clean up dependent records strictly for this specific job_id
    from app.models.assessment import JobAssessment, CandidateTestSubmission

    # Break circular FK reference in job_applications for this job
    db.query(JobApplication).filter(JobApplication.job_id == job_id).update(
        {"candidate_test_submission_id": None},
        synchronize_session=False,
    )
    db.flush()

    # Delete test submissions, assessments, and applications strictly for this job_id
    db.query(CandidateTestSubmission).filter(CandidateTestSubmission.job_id == job_id).delete(
        synchronize_session=False
    )
    db.query(JobAssessment).filter(JobAssessment.job_id == job_id).delete(
        synchronize_session=False
    )
    db.query(JobApplication).filter(JobApplication.job_id == job_id).delete(
        synchronize_session=False
    )

    # 4. Remove this specific job record only
    db.delete(job)
    db.commit()

    return {
        "id": job_id,
        "success": True,
        "message": f"Job requisition '{job_title}' was successfully deleted. {len(applicants)} applicants were notified.",
        "notified_applicants_count": len(applicants),
    }


@router.get("/admin/all", response_model=List[SuperAdminJobMetrics])
def get_all_jobs_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Super Admin Oversight View (Strict Data Anonymization & Isolation).
    Returns aggregated high-level metrics only:
    - Job Title, Recruiter Name, Total Views, Total Applicants Count, and Average Candidate Score.
    Strictly isolated from individual candidate lists, personal CVs, and test submissions.
    """
    if current_user.role.value != "SUPER_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only.")

    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    results = []
    for j in jobs:
        apps = db.query(JobApplication).filter(JobApplication.job_id == j.id).all()
        app_count = len(apps)
        scores = [a.test_score for a in apps if a.test_score is not None]
        avg_score = round(sum(scores) / len(scores), 1) if scores else None

        recruiter_name = j.poster.full_name if j.poster else "Recruiter"

        results.append(SuperAdminJobMetrics(
            job_id=j.id,
            title=j.title,
            company_name=j.company_name,
            recruiter_name=recruiter_name,
            location=j.location,
            job_type=j.job_type.value if hasattr(j.job_type, "value") else str(j.job_type),
            is_active=j.is_active,
            total_views=j.views_count or 0,
            total_applicants_count=app_count,
            average_candidate_score=avg_score,
            passing_score=float(j.passing_score or 70.0),
            has_manual_stage=bool(j.has_manual_stage),
            created_at=j.created_at,
        ))
    return results
