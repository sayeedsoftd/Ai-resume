from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_subscriber_or_admin
from app.models.user import User
from app.models.job import Job
from app.models.resume import Resume
from app.models.application import JobApplication
from app.models.notification import Notification
from app.models.assessment import JobAssessment, CandidateTestSubmission
from app.models.enums import NotificationType, JobApplicationStatus
from app.schemas.assessment import (
    CandidateAssessmentView,
    CandidateMCQView,
    CandidateWrittenView,
    CandidateTestSubmissionCreate,
    CandidateTestSubmissionResponse,
    JobAssessmentFullResponse,
)
from app.schemas.application import JobApplicationResponse, Stage2SubmissionRequest
from app.services.gemini_service import GeminiService
from app.services.matcher import JobMatchService
from app.utils.logger import logger

router = APIRouter()


@router.get("/jobs/{job_id}/assessment", response_model=CandidateAssessmentView)
@router.get("/assessments/jobs/{job_id}", response_model=CandidateAssessmentView)
def get_job_assessment(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch the Pre-Application Screening Assessment for a specific job requisition.
    Generates standard 25 MCQs + 5 Short Written Questions using Gemini AI on first request,
    caching to the database so all candidates receive the identical standardized test.
    Omits 'correct_option' and 'ideal_answer_rubric' for candidate security.
    """
    # Strict privacy isolation: Super Admin cannot take or view candidate assessment
    if current_user.role.value == "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admins cannot access assessment test views for data privacy reasons.",
        )

    job = db.query(Job).filter(Job.id == job_id, Job.is_active == True).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job requisition not found or currently inactive.",
        )

    # Check for cached assessment
    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job.id).first()

    if not assessment:
        logger.info(f"Generating new Gemini screening test for Job #{job.id}: {job.title}")
        test_data = GeminiService.generate_job_screening_test(
            job_title=job.title,
            job_description=job.description or "",
            required_skills=job.required_skills or [],
        )

        assessment = JobAssessment(
            job_id=job.id,
            mcq_questions=test_data.get("mcq_questions", []),
            written_questions=test_data.get("written_questions", []),
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)

    # Strip answers for candidate security
    safe_mcqs = [
        CandidateMCQView(
            id=q["id"],
            question=q["question"],
            options=q["options"],
        )
        for q in (assessment.mcq_questions or [])
    ]

    safe_written = [
        CandidateWrittenView(
            id=w["id"],
            question=w["question"],
            max_marks=int(w.get("max_marks", 10)),
        )
        for w in (assessment.written_questions or [])
    ]

    return CandidateAssessmentView(
        job_id=job.id,
        job_title=job.title,
        company_name=job.company_name,
        total_mcq_count=len(safe_mcqs),
        total_written_count=len(safe_written),
        time_limit_minutes=45,
        mcq_questions=safe_mcqs,
        written_questions=safe_written,
    )


@router.post("/jobs/{job_id}/assessment/submit", response_model=CandidateTestSubmissionResponse, status_code=status.HTTP_201_CREATED)
@router.post("/assessments/jobs/{job_id}/submit", response_model=CandidateTestSubmissionResponse, status_code=status.HTTP_201_CREATED)
def submit_job_assessment(
    job_id: int,
    payload: CandidateTestSubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit candidate's answers for the pre-application screening test:
    - Automatically grades 25 MCQs deterministically (0-50 pts).
    - Uses Gemini AI Automated Rubric Grading for 5 short written responses (0-50 pts).
    - Aggregates into composite total_test_score (0-100%).
    - Automatically updates or initializes candidate's JobApplication record.
    - Notifies hiring team and candidate.
    """
    # Strict privacy isolation: Super Admin cannot take or view candidate assessment
    if current_user.role.value == "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admins cannot access assessment test views for data privacy reasons.",
        )

    job = db.query(Job).filter(Job.id == job_id, Job.is_active == True).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job requisition not found or inactive.",
        )

    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job.id).first()
    if not assessment:
        # Generate on the fly if somehow missing
        test_data = GeminiService.generate_job_screening_test(
            job_title=job.title,
            job_description=job.description or "",
            required_skills=job.required_skills or [],
        )
        assessment = JobAssessment(
            job_id=job.id,
            mcq_questions=test_data.get("mcq_questions", []),
            written_questions=test_data.get("written_questions", []),
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)

    # Resolve candidate resume
    resume = None
    if payload.resume_id:
        resume = (
            db.query(Resume)
            .filter(Resume.id == payload.resume_id, Resume.user_id == current_user.id)
            .first()
        )
    if not resume:
        resume = (
            db.query(Resume)
            .filter(Resume.user_id == current_user.id, Resume.is_primary == True)
            .order_by(Resume.created_at.desc())
            .first()
        ) or (
            db.query(Resume)
            .filter(Resume.user_id == current_user.id)
            .order_by(Resume.created_at.desc())
            .first()
        )

    # Check for existing application
    application = (
        db.query(JobApplication)
        .filter(JobApplication.job_id == job.id, JobApplication.user_id == current_user.id)
        .first()
    )

    if not application and resume:
        # Auto-create JobApplication on assessment submission
        resume_skills = (resume.parsed_data or {}).get("skills", [])
        resume_text = resume.extracted_text or ""
        resume_exp = float((resume.parsed_data or {}).get("experience_years", 1.0))
        exp_lvl = job.experience_level.value if hasattr(job.experience_level, "value") else str(job.experience_level)

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
            resume_id=resume.id,
            status=JobApplicationStatus.APPLIED,
            match_score=match_res.get("ats_score", 70.0),
        )
        db.add(application)
        db.flush()

    # Evaluate test submission
    evaluation = GeminiService.evaluate_test_submission(
        mcq_questions=assessment.mcq_questions or [],
        written_questions=assessment.written_questions or [],
        mcq_answers=payload.mcq_answers or {},
        written_answers=payload.written_answers or {},
    )

    # Persist CandidateTestSubmission
    submission = CandidateTestSubmission(
        application_id=application.id if application else None,
        candidate_id=current_user.id,
        job_id=job.id,
        assessment_id=assessment.id,
        mcq_answers=payload.mcq_answers or {},
        written_answers=payload.written_answers or {},
        mcq_score=evaluation["mcq_score"],
        written_score=evaluation["written_score"],
        total_test_score=evaluation["total_test_score"],
        written_evaluation_feedback=evaluation["written_evaluation_feedback"],
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    # Update JobApplication linkage and status
    if application:
        application.candidate_test_submission_id = submission.id
        application.test_score = submission.total_test_score
        application.assessment_status = "COMPLETED"

        # Benchmark evaluation based on Recruiter-configured passing score (default: 70.0)
        passing_benchmark = float(job.passing_score if job.passing_score is not None else 70.0)
        is_passed = float(submission.total_test_score or 0.0) >= passing_benchmark
        application.is_stage1_passed = is_passed
        if is_passed:
            application.status = JobApplicationStatus.STAGE1_PASSED
        else:
            application.status = JobApplicationStatus.STAGE1_FAILED

        db.add(application)
        db.commit()
        db.refresh(application)

    # Dispatch notifications
    try:
        # Candidate notification
        db.add(
            Notification(
                user_id=current_user.id,
                title="Screening Test Submitted",
                message=f"You achieved {submission.total_test_score}% on the technical screening for '{job.title}'.",
                type=NotificationType.JOB,
            )
        )
        # Recruiter notification
        db.add(
            Notification(
                user_id=job.posted_by_user_id,
                title="Candidate Assessment Score Available",
                message=f"{current_user.full_name} completed the screening test for '{job.title}' with a score of {submission.total_test_score}%.",
                type=NotificationType.JOB,
            )
        )
        db.commit()
    except Exception as notif_err:
        logger.warning(f"Could not send assessment notification: {notif_err}")

    return CandidateTestSubmissionResponse(
        submission_id=submission.id,
        job_id=job.id,
        candidate_id=current_user.id,
        application_id=application.id if application else None,
        mcq_score=submission.mcq_score,
        written_score=submission.written_score,
        total_test_score=submission.total_test_score,
        mcq_correct_count=evaluation["mcq_correct_count"],
        total_mcqs=evaluation["total_mcqs"],
        written_evaluations=evaluation["written_evaluations"],
        summary_feedback=evaluation.get("summary_feedback", ""),
        assessment_status=application.assessment_status if application else "COMPLETED",
        created_at=submission.created_at,
    )


@router.get("/jobs/{job_id}/assessment/admin", response_model=JobAssessmentFullResponse)
def get_job_assessment_admin(
    job_id: int,
    current_user: User = Depends(require_subscriber_or_admin),
    db: Session = Depends(get_db),
):
    """
    Recruiter & Super Admin: Inspect the full assessment including answer keys and grading rubrics.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    if current_user.role.value == "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admins cannot view individual assessment questions or answer keys for candidate privacy.",
        )
    if job.posted_by_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to inspect this assessment.")

    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job.id).first()
    if not assessment:
        test_data = GeminiService.generate_job_screening_test(
            job_title=job.title,
            job_description=job.description or "",
            required_skills=job.required_skills or [],
        )
        assessment = JobAssessment(
            job_id=job.id,
            mcq_questions=test_data.get("mcq_questions", []),
            written_questions=test_data.get("written_questions", []),
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)

    return JobAssessmentFullResponse(
        id=assessment.id,
        job_id=assessment.job_id,
        mcq_questions=assessment.mcq_questions,
        written_questions=assessment.written_questions,
        created_at=assessment.created_at,
        updated_at=assessment.updated_at,
    )


@router.post("/jobs/{job_id}/assessment/regenerate", response_model=JobAssessmentFullResponse)
def regenerate_job_assessment(
    job_id: int,
    current_user: User = Depends(require_subscriber_or_admin),
    db: Session = Depends(get_db),
):
    """
    Recruiter & Super Admin: Force regenerate a fresh 25 MCQ + 5 Written question test set via Gemini.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    if current_user.role.value == "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admins cannot view individual assessment questions or answer keys for candidate privacy.",
        )
    if job.posted_by_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to inspect this assessment.")

    test_data = GeminiService.generate_job_screening_test(
        job_title=job.title,
        job_description=job.description or "",
        required_skills=job.required_skills or [],
    )

    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job.id).first()
    if assessment:
        assessment.mcq_questions = test_data.get("mcq_questions", [])
        assessment.written_questions = test_data.get("written_questions", [])
    else:
        assessment = JobAssessment(
            job_id=job.id,
            mcq_questions=test_data.get("mcq_questions", []),
            written_questions=test_data.get("written_questions", []),
        )
        db.add(assessment)

    db.commit()
    db.refresh(assessment)

    return JobAssessmentFullResponse(
        id=assessment.id,
        job_id=assessment.job_id,
        mcq_questions=assessment.mcq_questions,
        written_questions=assessment.written_questions,
        created_at=assessment.created_at,
        updated_at=assessment.updated_at,
    )


@router.get("/submissions/{submission_id}", response_model=Dict[str, Any])
def get_submission_detail(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve full submission scorecard and written evaluations.
    Accessible to candidate who took the test, the job poster, or super admins.
    """
    sub = db.query(CandidateTestSubmission).filter(CandidateTestSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found.")

    if current_user.role.value == "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admins cannot view individual candidate submissions or answer sheets for candidate privacy.",
        )

    # Authorization check
    is_owner = sub.candidate_id == current_user.id
    job = db.query(Job).filter(Job.id == sub.job_id).first()
    is_poster = job and job.posted_by_user_id == current_user.id

    if not (is_owner or is_poster):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return {
        "id": sub.id,
        "job_id": sub.job_id,
        "job_title": job.title if job else "Role",
        "candidate_id": sub.candidate_id,
        "candidate_name": sub.candidate.full_name if sub.candidate else "Candidate",
        "mcq_score": sub.mcq_score,
        "written_score": sub.written_score,
        "total_test_score": sub.total_test_score,
        "mcq_answers": sub.mcq_answers,
        "written_answers": sub.written_answers,
        "written_evaluation_feedback": sub.written_evaluation_feedback,
        "created_at": sub.created_at,
    }


@router.get("/jobs/{job_id}/manual-questions")
@router.get("/jobs/{job_id}/stage2")
def get_manual_questions_alias(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Alias to retrieve Stage-2 manual assessment questions with marks breakdown."""
    from app.api.v1.endpoints.jobs import get_stage2_assessment
    return get_stage2_assessment(job_id, current_user, db)


@router.post("/jobs/{job_id}/stage2-submit", response_model=JobApplicationResponse)
def submit_job_stage2_assessment(
    job_id: int,
    payload: Stage2SubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit candidate manual assessment answers directly by job_id."""
    app = db.query(JobApplication).filter(JobApplication.job_id == job_id, JobApplication.user_id == current_user.id).first()
    if not app:
        # Create application on the fly if resume is provided or primary resume found
        resume_id = payload.resume_id
        if not resume_id:
            primary_resume = db.query(Resume).filter(Resume.user_id == current_user.id, Resume.is_primary == True).first()
            if not primary_resume:
                primary_resume = db.query(Resume).filter(Resume.user_id == current_user.id).first()
            if not primary_resume:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please upload a resume first.")
            resume_id = primary_resume.id

        app = JobApplication(
            job_id=job_id,
            user_id=current_user.id,
            resume_id=resume_id,
            status=JobApplicationStatus.STAGE2_INVITED,
        )
        db.add(app)
        db.commit()
        db.refresh(app)

    from app.api.v1.endpoints.applications import submit_stage2_assessment
    return submit_stage2_assessment(app.id, payload, current_user, db)


@router.post("/applications/{application_id}/stage2-submit", response_model=JobApplicationResponse)
@router.post("/stage2-submit/{application_id}", response_model=JobApplicationResponse)
def submit_stage2_assessment_alias(
    application_id: int,
    payload: Stage2SubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Alias for candidate Stage-2 assessment submission routed through assessments."""
    from app.api.v1.endpoints.applications import submit_stage2_assessment
    return submit_stage2_assessment(application_id, payload, current_user, db)
