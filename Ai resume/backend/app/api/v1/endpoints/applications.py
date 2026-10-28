from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.job import Job
from app.models.resume import Resume
from app.models.application import JobApplication
from app.models.notification import Notification
from app.models.assessment import JobAssessment, CandidateTestSubmission
from app.models.enums import NotificationType, JobApplicationStatus
from app.schemas.application import (
    JobApplicationCreate,
    JobApplicationResponse,
    JobApplicationUpdateStatus,
    RecruiterDecisionRequest,
    ApplicationDossierResponse,
    ScheduleInterviewRequest,
    Stage2SubmissionRequest,
)
from app.schemas.job import JobResponse
from app.schemas.user import UserResponse
from app.services.matcher import JobMatchService
from app.services.email_service import SMTPEmailService
from app.utils.logger import logger

router = APIRouter()


@router.post("/", response_model=JobApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_to_job(
    application_in: JobApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit an application to a job using an uploaded resume."""
    job = db.query(Job).filter(Job.id == application_in.job_id, Job.is_active == True).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found or inactive")

    resume = (
        db.query(Resume)
        .filter(Resume.id == application_in.resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    existing = (
        db.query(JobApplication)
        .filter(JobApplication.job_id == job.id, JobApplication.user_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already applied for this position")

    # Automatically compute 4-stage deterministic ATS match score for recruiter insight
    resume_skills = (resume.parsed_data or {}).get("skills", [])
    resume_text = resume.extracted_text or ""
    resume_exp = float((resume.parsed_data or {}).get("experience_years", 1.0))
    exp_lvl = (
        job.experience_level.value
        if hasattr(job.experience_level, "value")
        else str(job.experience_level)
    )

    match_data = JobMatchService.calculate_ats_match(
        resume_skills=resume_skills,
        resume_text=resume_text,
        resume_experience_years=resume_exp,
        required_skills=job.required_skills or [],
        jd_text=job.description,
        expected_experience_level=exp_lvl,
    )

    initial_status = JobApplicationStatus.SCREENING if match_data.get("is_shortlisted") else JobApplicationStatus.APPLIED
    shortlist_label = match_data.get("shortlist_status", "Under Review")

    application = JobApplication(
        job_id=job.id,
        user_id=current_user.id,
        resume_id=resume.id,
        status=initial_status,
        match_score=match_data["ats_score"],
    )
    db.add(application)

    # Notify Job Poster
    notif = Notification(
        user_id=job.posted_by_user_id,
        title=f"New Application Received ({shortlist_label})",
        message=f"{current_user.full_name} applied to '{job.title}' with ATS Score {match_data['ats_score']}% [{shortlist_label}].",
        type=NotificationType.JOB,
    )
    db.add(notif)

    db.commit()
    db.refresh(application)
    return application


@router.get("/my-applications", response_model=List[JobApplicationResponse])
def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all job applications submitted by the logged-in candidate."""
    return (
        db.query(JobApplication)
        .filter(JobApplication.user_id == current_user.id)
        .order_by(JobApplication.applied_at.desc())
        .all()
    )


@router.get("/job/{job_id}", response_model=List[JobApplicationResponse])
def get_job_applications(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Recruiter endpoint: View candidates who applied for the given job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if current_user.role.value == "SUPER_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super Admins cannot view individual candidate lists for data privacy.")
    if job.posted_by_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view these candidates")

    return (
        db.query(JobApplication)
        .filter(JobApplication.job_id == job_id)
        .order_by(JobApplication.match_score.desc(), JobApplication.applied_at.desc())
        .all()
    )


@router.get("/{application_id}/dossier", response_model=ApplicationDossierResponse)
def get_application_dossier(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recruiter Command Center: Retrieve full candidate dossier including:
    - Candidate Profile & Contact info
    - Uploaded Resume metadata, extracted text, and ATS 4-factor scoring breakdown
    - Complete 25 MCQs answer sheet (question, options, candidate selection, correct answer, explanation)
    - 5 Short Written Questions with candidate answers and Gemini AI rubric marks/feedback
    """
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated job circular not found")

    # Authorization: poster or candidate. Super admin strictly blocked for privacy.
    if current_user.role.value == "SUPER_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super Admins cannot inspect individual candidate dossiers or assessments for data privacy.")
    is_poster = job.posted_by_user_id == current_user.id
    is_candidate = application.user_id == current_user.id
    if not (is_poster or is_candidate):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this applicant dossier")

    candidate = db.query(User).filter(User.id == application.user_id).first()
    resume = db.query(Resume).filter(Resume.id == application.resume_id).first()

    resume_dict = None
    if resume:
        resume_dict = {
            "id": resume.id,
            "version": resume.version,
            "file_path": resume.file_path,
            "extracted_text": resume.extracted_text,
            "parsed_data": resume.parsed_data or {},
            "created_at": resume.created_at,
        }

    # Retrieve test submission and assemble detailed answer sheet
    submission = None
    if application.candidate_test_submission_id:
        submission = (
            db.query(CandidateTestSubmission)
            .filter(CandidateTestSubmission.id == application.candidate_test_submission_id)
            .first()
        )
    if not submission:
        # Fallback query if not yet explicitly linked on application
        submission = (
            db.query(CandidateTestSubmission)
            .filter(
                CandidateTestSubmission.candidate_id == application.user_id,
                CandidateTestSubmission.job_id == application.job_id,
            )
            .order_by(CandidateTestSubmission.created_at.desc())
            .first()
        )

    submission_dict = None
    if submission:
        assessment = (
            db.query(JobAssessment).filter(JobAssessment.id == submission.assessment_id).first()
        ) or (
            db.query(JobAssessment).filter(JobAssessment.job_id == job.id).first()
        )

        mcq_review = []
        if assessment and assessment.mcq_questions:
            for q in assessment.mcq_questions:
                qid_str = str(q.get("id"))
                cand_opt = submission.mcq_answers.get(qid_str, "")
                corr_opt = q.get("correct_option", "")
                is_correct = bool(cand_opt and cand_opt.strip().upper() == corr_opt.strip().upper())
                mcq_review.append({
                    "id": q.get("id"),
                    "question": q.get("question"),
                    "options": q.get("options", []),
                    "candidate_option": cand_opt,
                    "correct_option": corr_opt,
                    "is_correct": is_correct,
                    "explanation": q.get("explanation", ""),
                })

        written_review = []
        eval_list = (submission.written_evaluation_feedback or {}).get("evaluations", [])
        eval_map = {str(e.get("question_id")): e for e in eval_list}

        if assessment and assessment.written_questions:
            for wq in assessment.written_questions:
                wid_str = str(wq.get("id"))
                cand_text = submission.written_answers.get(wid_str, "")
                ai_eval = eval_map.get(wid_str, {})
                written_review.append({
                    "id": wq.get("id"),
                    "question": wq.get("question"),
                    "ideal_answer_rubric": wq.get("ideal_answer_rubric", ""),
                    "max_marks": wq.get("max_marks", 10),
                    "candidate_answer": cand_text,
                    "marks_awarded": ai_eval.get("marks_awarded", 0.0),
                    "feedback": ai_eval.get("feedback", ""),
                    "strengths": ai_eval.get("strengths", ""),
                    "areas_for_improvement": ai_eval.get("areas_for_improvement", ""),
                })

        submission_dict = {
            "id": submission.id,
            "mcq_score": submission.mcq_score,
            "written_score": submission.written_score,
            "total_test_score": submission.total_test_score,
            "created_at": submission.created_at,
            "mcq_review": mcq_review,
            "written_review": written_review,
            "written_evaluation_feedback": submission.written_evaluation_feedback,
        }

    return ApplicationDossierResponse(
        application=application,
        candidate=candidate,
        job=job,
        resume=resume_dict,
        screening_submission=submission_dict,
        stage2_questions=job.manual_questions if job.has_manual_stage else None,
        stage2_submission=application.stage2_submission,
    )


@router.patch("/{application_id}/decision", response_model=JobApplicationResponse)
def make_recruiter_decision(
    application_id: int,
    decision: RecruiterDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recruiter Action: Make a shortlisting/rejection/interview scheduling decision.
    - Updates application status, appointment details, and recruiter notes.
    - Automatically creates a notification record in the notifications table targeted to the candidate.
    """
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job or (job.posted_by_user_id != current_user.id and current_user.role.value != "SUPER_ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to make decisions on this application")

    # If shortlisted and job requires Stage-2 manual test, transition to STAGE2_INVITED
    final_status = decision.status
    if decision.status == JobApplicationStatus.SHORTLISTED:
        if job.has_manual_stage:
            final_status = JobApplicationStatus.STAGE2_INVITED

    application.status = final_status
    if decision.interview_date is not None:
        application.interview_date = decision.interview_date
    if decision.interview_time is not None:
        application.interview_time = decision.interview_time
    if decision.meeting_link is not None:
        application.meeting_link = decision.meeting_link
    if decision.recruiter_note is not None:
        application.recruiter_notes = decision.recruiter_note
    if decision.rejection_reason is not None:
        application.rejection_reason = decision.rejection_reason

    # Formulate Notification Message
    if final_status == JobApplicationStatus.STAGE2_INVITED:
        notif_title = f"Invitation: Stage-2 Custom Assessment for {job.title}"
        msg = f"Congratulations! You have been shortlisted for '{job.title}' at {job.company_name} and invited to complete the Stage-2 Custom Assessment. Open your application tracker to begin."
    elif final_status in [JobApplicationStatus.SHORTLISTED, JobApplicationStatus.INTERVIEW, JobApplicationStatus.ACCEPTED]:
        notif_title = f"Congratulations! Shortlisted for {job.title}"
        msg = f"Congratulations! Your application for '{job.title}' at {job.company_name} has been Shortlisted."
        if decision.interview_date:
            msg += f" Interview Scheduled: {decision.interview_date}."
        if decision.interview_time:
            msg += f" Time: {decision.interview_time}."
        if decision.meeting_link:
            msg += f" Meeting Link / Venue: {decision.meeting_link}."
        if decision.recruiter_note:
            msg += f" Recruiter Note: {decision.recruiter_note}."
    elif final_status == JobApplicationStatus.REJECTED:
        notif_title = f"Update on your application for {job.title}"
        msg = f"Thank you for your interest in '{job.title}' at {job.company_name}. After careful consideration, we will not be moving forward with your candidacy at this time."
        if decision.rejection_reason:
            msg += f" Feedback: {decision.rejection_reason}."
    else:
        notif_title = f"Application Status: {final_status.value}"
        msg = f"Your application for '{job.title}' at {job.company_name} is now in status: {final_status.value}."

    # Dispatch notification to Candidate
    notif = Notification(
        user_id=application.user_id,
        title=notif_title,
        message=msg,
        type=NotificationType.JOB,
        is_read=False,
    )
    db.add(notif)

    db.commit()
    db.refresh(application)

    logger.info(f"Recruiter {current_user.id} updated application {application.id} status to {decision.status} for candidate {application.user_id}")
    return application


@router.patch("/{application_id}/status", response_model=JobApplicationResponse)
def update_application_status(
    application_id: int,
    status_update: JobApplicationUpdateStatus,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Legacy endpoint to update status of candidate application."""
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job or (job.posted_by_user_id != current_user.id and current_user.role.value != "SUPER_ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update status")

    application.status = status_update.status

    # Notify Candidate
    notif = Notification(
        user_id=application.user_id,
        title="Application Status Updated",
        message=f"Your application for '{job.title}' is now in status: {status_update.status.value}",
        type=NotificationType.JOB,
        is_read=False,
    )
    db.add(notif)

    db.commit()
    db.refresh(application)
    return application


@router.post("/{application_id}/stage2-submit", response_model=JobApplicationResponse)
def submit_stage2_assessment(
    application_id: int,
    payload: Stage2SubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Candidate Action: Submit answers for Recruiter's custom Stage-2 Assessment.
    Transitions status to STAGE2_SUBMITTED ("Under Review / Waiting for Final Decision").
    Dispatches in-app notification to recruiter and candidate.
    """
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if application.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only submit your own Stage-2 assessment")

    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated job not found")

    # Evaluate MCQ marks instantly based on recruiter's correct options
    raw_questions = job.manual_questions or {}
    if isinstance(raw_questions, list):
        job_mcqs = [q for q in raw_questions if q.get("type") == "MCQ"]
        job_written = [q for q in raw_questions if q.get("type") == "WRITTEN"]
        if not job_mcqs and not job_written:
            job_mcqs = [q for q in raw_questions if "options" in q]
            job_written = [q for q in raw_questions if "options" not in q]
    else:
        job_mcqs = raw_questions.get("mcqs", [])
        job_written = raw_questions.get("written", [])

    job_mcqs = job_mcqs[:10]
    job_written = job_written[:5]

    mcq_marks_per_question = 2
    written_marks_per_question = 10

    mcqs_correct = 0
    candidate_mcq_answers = payload.mcq_answers or {}
    for idx, q in enumerate(job_mcqs):
        q_id = str(q.get("id", idx + 1))
        correct = str(q.get("correct_option", "A")).strip().upper()
        cand_ans = str(
            candidate_mcq_answers.get(q_id, candidate_mcq_answers.get(str(idx), ""))
        ).strip().upper()
        if cand_ans and cand_ans == correct:
            mcqs_correct += 1

    total_mcqs = len(job_mcqs)
    total_written = len(job_written)
    mcq_marks_earned = mcqs_correct * mcq_marks_per_question
    total_mcq_marks = total_mcqs * mcq_marks_per_question
    total_written_marks = total_written * written_marks_per_question
    max_total_marks = total_mcq_marks + total_written_marks
    mcq_pct = round((mcq_marks_earned / total_mcq_marks * 100), 1) if total_mcq_marks > 0 else 0

    # Store submission data safely with marks breakdown
    submission_data = {
        "mcq_answers": payload.mcq_answers,
        "written_answers": payload.written_answers,
        "mcqs_correct": mcqs_correct,
        "total_mcqs": total_mcqs,
        "mcq_marks_earned": mcq_marks_earned,
        "total_mcq_marks": total_mcq_marks,
        "total_written_marks": total_written_marks,
        "max_total_marks": max_total_marks,
        "current_total_marks": mcq_marks_earned,
        "mcq_score_percentage": mcq_pct,
        "passing_score": job.passing_score or 70.0,
        "status": "SUBMITTED",
        "submitted_at": datetime.utcnow().isoformat(),
    }
    application.stage2_submission = submission_data
    application.status = JobApplicationStatus.STAGE2_SUBMITTED

    # Notify Recruiter
    recruiter_notif = Notification(
        user_id=job.posted_by_user_id,
        title=f"Stage-2 Assessment Submitted: {current_user.full_name}",
        message=f"{current_user.full_name} has submitted the Stage-2 custom assessment for '{job.title}'. Ready for final evaluation.",
        type=NotificationType.JOB,
        is_read=False,
    )
    db.add(recruiter_notif)

    # Notify Candidate
    candidate_notif = Notification(
        user_id=current_user.id,
        title="Stage-2 Assessment Received",
        message=f"Your Stage-2 assessment responses for '{job.title}' have been submitted. Your application is now Under Review / Waiting for Final Decision.",
        type=NotificationType.JOB,
        is_read=False,
    )
    db.add(candidate_notif)

    db.commit()
    db.refresh(application)

    # Security check: Ensure recruiter's correct answers are never revealed in candidate response
    if application.job and application.job.manual_questions:
        raw_mq = application.job.manual_questions
        if isinstance(raw_mq, list):
            application.job.manual_questions = [
                {k: v for k, v in q.items() if k != "correct_option"}
                for q in raw_mq
            ]
        elif isinstance(raw_mq, dict):
            application.job.manual_questions = {
                "mcqs": [{k: v for k, v in q.items() if k != "correct_option"} for q in raw_mq.get("mcqs", [])],
                "written": raw_mq.get("written", []),
            }

    logger.info(f"Candidate {current_user.id} submitted Stage-2 assessment for application {application.id}")
    return application


@router.post("/{application_id}/schedule-interview", response_model=JobApplicationResponse)
def schedule_formal_interview(
    application_id: int,
    payload: ScheduleInterviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recruiter Action: Schedule a formal interview with candidate.
    - Saves date, time, meeting link, and notes.
    - Dispatches formal email invitation to candidate.
    - Transitions application status to INTERVIEW.
    """
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job or job.posted_by_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to schedule interview for this job")

    candidate = db.query(User).filter(User.id == application.user_id).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    # Update application
    application.status = JobApplicationStatus.INTERVIEW
    application.interview_date = payload.interview_date
    application.interview_time = payload.interview_time
    application.meeting_link = payload.meeting_link
    if payload.personal_note:
        application.recruiter_notes = payload.personal_note

    # Send formal email invitation via SMTPEmailService
    email_success = SMTPEmailService.send_interview_invitation(
        candidate_email=candidate.email,
        candidate_name=candidate.full_name or "Candidate",
        job_title=job.title,
        company_name=job.company_name or "Hiring Team",
        interview_date=payload.interview_date,
        interview_time=payload.interview_time,
        meeting_link=payload.meeting_link,
        recruiter_note=payload.personal_note,
    )

    # In-app notification
    notif = Notification(
        user_id=candidate.id,
        title=f"Formal Interview Scheduled: {job.title}",
        message=f"You have been invited for an interview for '{job.title}' at {job.company_name or 'the company'} on {payload.interview_date} at {payload.interview_time}. Meeting Link: {payload.meeting_link}",
        type=NotificationType.JOB,
        is_read=False,
    )
    db.add(notif)

    db.commit()
    db.refresh(application)

    logger.info(f"Scheduled formal interview for application {application.id}. Email dispatched: {email_success}")
    return application
