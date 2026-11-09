from datetime import datetime, timezone, timedelta
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.config import settings
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.job import Job
from app.models.resume import Resume
from app.models.application import JobApplication
from app.models.notification import Notification
from app.models.candidate_message import CandidateMessage
from app.models.interview import Interview
from app.models.assessment import JobAssessment, CandidateTestSubmission
from app.models.offer_letter import OfferLetter
from app.models.recruiter_note import CandidateEvaluationNote, RecommendationType
from app.models.project_integrity import ProjectIntegrityAudit
from app.models.enums import NotificationType, JobApplicationStatus
from app.schemas.recruiter_note import (
    EvaluationNoteCreate,
    EvaluationNoteResponse,
    EvaluationSummaryResponse,
)
from app.schemas.application import (
    JobApplicationCreate,
    JobApplicationResponse,
    JobApplicationUpdateStatus,
    RecruiterDecisionRequest,
    RejectApplicationRequest,
    GrowthFeedbackResponse,
    ApplicationDossierResponse,
    ScheduleInterviewRequest,
    SmartScheduleInterviewRequest,
    SmartScheduleInterviewResponse,
    RecruiterSendMessageRequest,
    Stage2SubmissionRequest,
    ShortlistedCandidateItem,
)
from app.schemas.job import JobResponse
from app.schemas.user import UserResponse
from app.services.matcher import JobMatchService
from app.services.email_service import SMTPEmailService
from app.services.salary_benchmarker import SalaryBenchmarkService
from app.services.feedback_service import FeedbackService
from app.services.notification_gateway_service import NotificationGatewayService
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

    salary_analysis = None
    fit_status = "WITHIN_BUDGET"
    if application_in.expected_salary is not None:
        try:
            salary_analysis = SalaryBenchmarkService.analyze_salary_and_budget_fit(
                job_title=job.title,
                experience_required=job.experience_years_required or 0,
                min_salary=job.min_salary,
                max_salary=job.max_salary,
                candidate_experience_years=resume_exp,
                candidate_skills=resume_skills,
                candidate_test_score=None,
                expected_salary=application_in.expected_salary,
            )
            fit_status = salary_analysis.get("fit_status", "WITHIN_BUDGET")
        except Exception as sal_err:
            logger.warning(f"Could not compute initial salary benchmark: {sal_err}")

    # Anti-Ghosting Hiring SLA: calculate deadline based on job commitment
    sla_days = getattr(job, "sla_review_days", 5) or 5
    now_utc = datetime.now(timezone.utc)
    sla_deadline = now_utc + timedelta(days=int(sla_days))

    application = JobApplication(
        job_id=job.id,
        user_id=current_user.id,
        resume_id=resume.id,
        status=initial_status,
        match_score=match_data["ats_score"],
        expected_salary=application_in.expected_salary,
        salary_fit_status=fit_status,
        ai_salary_benchmark_analysis=salary_analysis,
        sla_deadline=sla_deadline,
        sla_breached=False,
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


def check_and_update_sla(app: JobApplication, db: Session = None) -> bool:
    """Helper to ensure SLA deadline is set and flag breached status if expired."""
    now = datetime.now(timezone.utc)
    updated = False
    if not app.sla_deadline and app.applied_at:
        review_days = 5
        if app.job and getattr(app.job, "sla_review_days", None):
            review_days = app.job.sla_review_days
        app.sla_deadline = app.applied_at + timedelta(days=review_days)
        updated = True
    
    pending_statuses = {
        JobApplicationStatus.APPLIED,
        JobApplicationStatus.SCREENING,
        JobApplicationStatus.STAGE1_PASSED,
        JobApplicationStatus.STAGE2_SUBMITTED,
    }
    if app.status in pending_statuses and app.sla_deadline:
        deadline_naive = app.sla_deadline.replace(tzinfo=None) if hasattr(app.sla_deadline, 'tzinfo') and app.sla_deadline.tzinfo else app.sla_deadline
        now_naive = now.replace(tzinfo=None)
        if now_naive > deadline_naive and not app.sla_breached:
            app.sla_breached = True
            updated = True
    return updated


@router.get("/my-applications", response_model=List[JobApplicationResponse])
def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all job applications submitted by the logged-in candidate."""
    apps = (
        db.query(JobApplication)
        .filter(JobApplication.user_id == current_user.id)
        .order_by(JobApplication.applied_at.desc())
        .all()
    )
    needs_commit = False
    for app in apps:
        if check_and_update_sla(app, db):
            needs_commit = True
    if needs_commit:
        try:
            db.commit()
        except Exception:
            db.rollback()
    return apps


@router.get("/recruiter/shortlisted-candidates", response_model=List[ShortlistedCandidateItem])
@router.get("/shortlisted-candidates", response_model=List[ShortlistedCandidateItem])
def get_recruiter_shortlisted_candidates(
    job_id: Optional[int] = None,
    salary_fit: Optional[str] = None,
    blind_mode: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recruiter Talent Pool: Retrieve all shortlisted candidates for jobs posted
    by the currently logged-in recruiter (or across all jobs if Super Admin).
    Supports quick filtering by salary_fit: 'ALL', 'WITHIN_BUDGET', 'JUSTIFIED', 'ABOVE_BUDGET'.
    """
    if current_user.role.value not in ["RECRUITER", "SUPER_ADMIN", "SUBSCRIBER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to recruiters and subscribers.",
        )

    job_query = db.query(Job)
    if current_user.role.value != "SUPER_ADMIN":
        job_query = job_query.filter(Job.posted_by_user_id == current_user.id)
    if job_id:
        job_query = job_query.filter(Job.id == job_id)

    recruiter_jobs = job_query.all()
    if not recruiter_jobs:
        return []

    job_map = {j.id: j for j in recruiter_jobs}
    job_ids = list(job_map.keys())

    # Include candidate applications with shortlist-level statuses
    shortlisted_statuses = [
        JobApplicationStatus.SHORTLISTED,
        JobApplicationStatus.STAGE2_INVITED,
        JobApplicationStatus.STAGE2_SUBMITTED,
        JobApplicationStatus.INTERVIEW,
        JobApplicationStatus.ACCEPTED,
    ]

    apps = (
        db.query(JobApplication)
        .filter(
            JobApplication.job_id.in_(job_ids),
            JobApplication.status.in_(shortlisted_statuses),
        )
        .order_by(JobApplication.updated_at.desc())
        .all()
    )

    results = []
    for app in apps:
        cand = app.user
        job = job_map.get(app.job_id)

        cand_id = cand.id if cand else app.user_id
        if blind_mode:
            letter = chr(65 + (cand_id % 26))
            num_code = f"{cand_id:03d}"
            name = f"Candidate #{letter}-{num_code}"
            email = "Hidden in Anti-Bias Mode"
            phone = "Hidden in Anti-Bias Mode"
        else:
            name = cand.full_name if cand else f"Candidate #{cand_id}"
            email = cand.email if cand else "N/A"
            phone = getattr(cand, "phone", None) or "Not provided"

        stage2_score = None
        if app.stage2_submission and isinstance(app.stage2_submission, dict):
            stage2_score = app.stage2_submission.get("score") or app.stage2_submission.get("total_score")

        # Salary & Budget Fit calculation
        bench = app.ai_salary_benchmark_analysis or {}
        fit_status = app.salary_fit_status or bench.get("fit_status") or app.salary_budget_status or "WITHIN_BUDGET"
        is_justified = bench.get("is_justified_by_skills") if bench else bool((app.test_score or 0) >= 80)
        counter_offer = bench.get("recommended_counter_offer")

        # Apply Recruiter Quick Filter
        if salary_fit:
            sf = salary_fit.strip().upper()
            if sf in ["WITHIN_BUDGET", "BUDGET_FIT"]:
                if fit_status not in ["WITHIN_BUDGET", "BELOW_BUDGET"]:
                    continue
            elif sf in ["JUSTIFIED", "HIGH_VALUE", "HIGH_VALUE_JUSTIFIED"]:
                if not is_justified:
                    continue
            elif sf in ["ABOVE_BUDGET"]:
                if fit_status not in ["SLIGHTLY_ABOVE", "SIGNIFICANTLY_ABOVE", "ABOVE_BUDGET"]:
                    continue

        # Internal Team Rating & Consensus Summary
        eval_notes = app.evaluation_notes or []
        ratings = [n.rating for n in eval_notes]
        avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else None
        tot_evals = len(eval_notes)
        consensus = None
        if eval_notes:
            summary = compute_evaluation_summary(eval_notes)
            consensus = summary["hiring_consensus"]

        results.append(
            ShortlistedCandidateItem(
                application_id=app.id,
                candidate_id=cand_id,
                candidate_name=name,
                candidate_email=email,
                candidate_phone=phone,
                job_id=app.job_id,
                job_title=job.title if job else "Requisition",
                company_name=job.company_name if job else "Company",
                ats_score=app.match_score,
                stage1_score=app.test_score,
                stage1_passed=app.is_stage1_passed,
                stage2_submission=app.stage2_submission,
                stage2_score=stage2_score,
                status=app.status.value if hasattr(app.status, "value") else str(app.status),
                is_suspicious=bool(app.is_suspicious),
                tab_switch_count=app.tab_switch_count or 0,
                applied_at=app.applied_at,
                shortlisted_at=app.updated_at or app.applied_at,
                interview_date=app.interview_date,
                interview_time=app.interview_time,
                meeting_link=app.meeting_link,
                recruiter_notes=app.recruiter_notes,
                viewed_by_recruiter=bool(app.viewed_by_recruiter),
                viewed_at=app.viewed_at,
                expected_salary=app.expected_salary,
                salary_fit_status=fit_status,
                salary_budget_status=app.salary_budget_status,
                salary_budget_diff=app.salary_budget_diff,
                ai_salary_benchmark_analysis=bench if bench else None,
                is_justified_by_skills=is_justified,
                recommended_counter_offer=counter_offer,
                viva_audio_url=app.viva_audio_url,
                viva_score=app.viva_score,
                viva_transcription=app.viva_transcription,
                viva_evaluation=app.viva_evaluation,
                adaptive_ability_rating=app.adaptive_ability_rating,
                adaptive_theta_score=app.adaptive_theta_score,
                video_pitch_url=app.video_pitch_url,
                offer_status=(app.offer_letters[0].status if app.offer_letters else None),
                offered_salary=(app.offer_letters[0].offered_salary if app.offer_letters else None),
                average_rating=avg_rating,
                total_evaluators=tot_evals,
                hiring_consensus=consensus,
            )
        )

    return results


@router.get("/job/{job_id}", response_model=List[JobApplicationResponse])
def get_job_applications(
    job_id: int,
    blind_mode: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Recruiter endpoint: View candidates who applied for the given job (supports blind_mode=true)."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if current_user.role.value == "SUPER_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super Admins cannot view individual candidate lists for data privacy.")
    if job.posted_by_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view these candidates")

    apps = (
        db.query(JobApplication)
        .filter(JobApplication.job_id == job_id)
        .order_by(JobApplication.match_score.desc(), JobApplication.applied_at.desc())
        .all()
    )

    needs_commit = False
    for app in apps:
        if check_and_update_sla(app, db):
            needs_commit = True
    if needs_commit:
        try:
            db.commit()
        except Exception:
            db.rollback()

    if not blind_mode:
        return apps

    sanitized_apps = []
    for app in apps:
        app_res = JobApplicationResponse.model_validate(app)
        cand_id = app.user_id or app.id
        letter = chr(65 + (cand_id % 26))
        num_code = f"{cand_id:03d}"
        if app_res.user:
            app_res.user.full_name = f"Candidate #{letter}-{num_code}"
            app_res.user.email = f"candidate-{cand_id}@blindhire.internal"
        sanitized_apps.append(app_res)
    return sanitized_apps


def compute_evaluation_summary(
    notes: List[CandidateEvaluationNote],
    current_user_id: Optional[int] = None,
    is_admin: bool = False,
) -> Dict[str, Any]:
    if not notes:
        return {
            "average_rating": 0.0,
            "total_evaluators": 0,
            "hiring_consensus": "NO_REVIEWS",
            "recommendation_breakdown": {
                "STRONG_HIRE": 0,
                "HIRE": 0,
                "NEUTRAL": 0,
                "REJECT": 0,
            },
            "notes": [],
        }

    ratings = [n.rating for n in notes]
    avg_rating = round(sum(ratings) / len(ratings), 1)

    rec_counts = {
        "STRONG_HIRE": 0,
        "HIRE": 0,
        "NEUTRAL": 0,
        "REJECT": 0,
    }
    for n in notes:
        rec = (n.recommendation or "").upper().strip()
        if rec in rec_counts:
            rec_counts[rec] += 1
        else:
            rec_counts[rec] = 1

    total = len(notes)
    if rec_counts.get("REJECT", 0) > total / 2:
        consensus = "REJECT"
    elif (rec_counts.get("STRONG_HIRE", 0) + rec_counts.get("HIRE", 0)) > total / 2:
        if rec_counts.get("STRONG_HIRE", 0) >= rec_counts.get("HIRE", 0):
            consensus = "STRONG_HIRE"
        else:
            consensus = "HIRE"
    elif rec_counts.get("NEUTRAL", 0) >= total / 2:
        consensus = "NEUTRAL"
    else:
        sorted_recs = sorted(rec_counts.items(), key=lambda x: (x[1], x[0]), reverse=True)
        top_rec = sorted_recs[0][0]
        consensus = top_rec if rec_counts[top_rec] > 0 else "NO_REVIEWS"

    return {
        "average_rating": avg_rating,
        "total_evaluators": len(notes),
        "hiring_consensus": consensus,
        "recommendation_breakdown": rec_counts,
        "notes": [n.to_dict(current_user_id=current_user_id, is_admin=is_admin) for n in notes],
    }


@router.get("/{application_id}/dossier", response_model=ApplicationDossierResponse)
def get_application_dossier(
    application_id: int,
    blind_mode: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recruiter Command Center: Retrieve full candidate dossier including:
    - Candidate Profile & Contact info (anonymized if blind_mode=True)
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

    # Real-Time Journey Tracking: Automatically mark viewed when recruiter opens candidate dossier
    if is_poster and not application.viewed_by_recruiter:
        application.viewed_by_recruiter = True
        application.viewed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(application)

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
            "coding_score": submission.coding_score or 0.0,
            "total_test_score": submission.total_test_score,
            "candidate_code": submission.candidate_code or application.candidate_code,
            "code_language": submission.code_language or application.code_language or "python",
            "code_evaluation": submission.code_evaluation or application.code_evaluation,
            "tab_switch_count": submission.tab_switch_count or 0,
            "is_suspicious": bool(submission.is_suspicious),
            "proctoring_violations": submission.proctoring_violations or [],
            "submission_reason": submission.submission_reason or "NORMAL",
            "created_at": submission.created_at,
            "mcq_review": mcq_review,
            "written_review": written_review,
            "written_evaluation_feedback": submission.written_evaluation_feedback,
        }

    # Anonymize outputs if Blind Hiring / Anti-Bias Mode is requested
    app_res = JobApplicationResponse.model_validate(application)
    cand_res = UserResponse.model_validate(candidate) if candidate else None

    if blind_mode:
        import re
        cand_id = candidate.id if candidate else application.user_id
        letter = chr(65 + (cand_id % 26))
        anonymous_name = f"Candidate #{letter}-{cand_id:03d}"
        masked_email = f"candidate-{cand_id}@blindhire.internal"

        if cand_res:
            cand_res.full_name = anonymous_name
            cand_res.email = masked_email

        if app_res.user:
            app_res.user.full_name = anonymous_name
            app_res.user.email = masked_email

        if resume_dict:
            cand_real_name = candidate.full_name if candidate else ""
            parsed = resume_dict.get("parsed_data")
            if isinstance(parsed, dict):
                # 1. Mask institutions
                if "education" in parsed and isinstance(parsed["education"], list):
                    for edu in parsed["education"]:
                        if isinstance(edu, dict):
                            edu["institution"] = "Accredited University"
                            edu["school"] = "Accredited University"
                            edu["university"] = "Accredited University"
                # 2. Redact summary
                if parsed.get("summary") and isinstance(parsed["summary"], str):
                    s = parsed["summary"]
                    s = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[Protected Email]', s)
                    s = re.sub(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}', '[Protected Phone]', s)
                    if cand_real_name:
                        for p in cand_real_name.split():
                            if len(p) > 2:
                                s = re.sub(re.escape(p), '[Candidate]', s, flags=re.IGNORECASE)
                    parsed["summary"] = s
                # 3. Mask contact_info
                if "contact_info" in parsed and isinstance(parsed["contact_info"], dict):
                    parsed["contact_info"] = {
                        "phone": "Hidden in Anti-Bias Mode",
                        "email": "Hidden in Anti-Bias Mode",
                        "address": "Location Redacted (Anti-Bias Mode)",
                    }

            # Sanitize extracted_text
            if resume_dict.get("extracted_text") and isinstance(resume_dict["extracted_text"], str):
                et = resume_dict["extracted_text"]
                et = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[Protected Email]', et)
                et = re.sub(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}', '[Protected Phone]', et)
                if cand_real_name:
                    for p in cand_real_name.split():
                        if len(p) > 2:
                            et = re.sub(re.escape(p), '[Candidate]', et, flags=re.IGNORECASE)
                resume_dict["extracted_text"] = et

    # Technical Live Coding Inspection Assembly
    cand_code = (submission.candidate_code if submission else None) or application.candidate_code
    code_lang = (submission.code_language if submission else None) or application.code_language or "python"
    coding_score = (submission.coding_score if submission else None) if (submission and submission.coding_score is not None) else application.coding_score
    code_eval = (submission.code_evaluation if submission else None) or application.code_evaluation

    assessment_obj = None
    if submission and submission.assessment_id:
        assessment_obj = db.query(JobAssessment).filter(JobAssessment.id == submission.assessment_id).first()
    if not assessment_obj:
        assessment_obj = db.query(JobAssessment).filter(JobAssessment.job_id == job.id).first()

    challenge_data = assessment_obj.coding_challenge if assessment_obj else None

    coding_inspection = None
    if cand_code or code_eval or challenge_data:
        coding_inspection = {
            "candidate_code": cand_code,
            "code_language": code_lang,
            "coding_score": coding_score,
            "code_evaluation": code_eval,
            "challenge": challenge_data,
        }

    # Voice Viva Simulation & Speech Screening Inspection
    viva_audio = application.viva_audio_url or (submission.viva_audio_url if submission else None)
    viva_sc = application.viva_score if application.viva_score is not None else (submission.viva_score if submission else None)
    viva_tx = application.viva_transcription or (submission.viva_transcription if submission else None)
    viva_ev = application.viva_evaluation or (submission.viva_evaluation if submission else None)
    viva_prompt = assessment_obj.viva_prompt if assessment_obj else None

    viva_inspection = None
    if viva_audio or viva_ev or viva_tx:
        viva_inspection = {
            "viva_audio_url": viva_audio,
            "viva_score": viva_sc,
            "viva_transcription": viva_tx,
            "viva_evaluation": viva_ev,
            "viva_prompt": viva_prompt,
        }

    # AI Salary Benchmark & Budget Fit Analysis
    if not application.ai_salary_benchmark_analysis and application.expected_salary is not None:
        cand_skills = (resume_dict.get("parsed_data") or {}).get("skills", []) if resume_dict else []
        cand_exp = float((resume_dict.get("parsed_data") or {}).get("experience_years", 1.0)) if resume_dict else 1.0
        test_score = submission.total_test_score if submission else application.test_score

        try:
            salary_bench = SalaryBenchmarkService.analyze_salary_and_budget_fit(
                job_title=job.title,
                experience_required=job.experience_years_required or 0,
                min_salary=job.min_salary,
                max_salary=job.max_salary,
                candidate_experience_years=cand_exp,
                candidate_skills=cand_skills,
                candidate_test_score=test_score,
                expected_salary=application.expected_salary,
            )
            application.ai_salary_benchmark_analysis = salary_bench
            application.salary_fit_status = salary_bench.get("fit_status", "WITHIN_BUDGET")
            db.add(application)
            db.commit()
            db.refresh(application)
        except Exception as sb_err:
            logger.warning(f"Could not compute salary benchmark on dossier view: {sb_err}")

    # Dynamic AI Adaptive Testing Profile Assembly
    adaptive_profile = None
    ability_rating = application.adaptive_ability_rating or (submission.adaptive_ability_rating if submission else None)
    theta_sc = application.adaptive_theta_score if application.adaptive_theta_score is not None else (submission.adaptive_theta_score if submission else None)
    skill_cv = application.adaptive_skill_curve or (submission.adaptive_skill_curve if submission else None)
    tier_dt = application.adaptive_tier_distribution or (submission.adaptive_tier_distribution if submission else None)

    if ability_rating or (theta_sc is not None) or skill_cv:
        adaptive_profile = {
            "ability_rating": ability_rating or "Proficient / Applied Engineering",
            "theta_score": theta_sc if theta_sc is not None else 50.0,
            "skill_curve": skill_cv or [],
            "tier_distribution": tier_dt or {},
        }

    # Active Offer Letter Inspection
    active_offer = (
        db.query(OfferLetter)
        .filter(OfferLetter.application_id == application.id)
        .order_by(OfferLetter.created_at.desc())
        .first()
    )
    active_offer_dict = None
    if active_offer:
        active_offer_dict = {
            "id": active_offer.id,
            "job_title": active_offer.job_title,
            "company_name": active_offer.company_name,
            "offered_salary": active_offer.offered_salary,
            "joining_date": active_offer.joining_date,
            "workplace_type": active_offer.workplace_type,
            "probation_period_months": active_offer.probation_period_months,
            "custom_perks": active_offer.custom_perks,
            "letter_content_html": active_offer.letter_content_html,
            "status": active_offer.status,
            "signed_at": active_offer.signed_at.isoformat() if active_offer.signed_at else None,
            "candidate_response_notes": active_offer.candidate_response_notes,
            "created_at": active_offer.created_at.isoformat() if active_offer.created_at else None,
        }

    # Confidential Team Notes & Consensus Evaluation (never leaked to candidates)
    team_eval_summary = None
    if not is_candidate:
        team_eval_summary = compute_evaluation_summary(
            application.evaluation_notes or [],
            current_user_id=current_user.id,
            is_admin=(current_user.role.value == "SUPER_ADMIN"),
        )

    # Forensic Project Integrity & Tutorial Clone Audit
    integrity_record = (
        db.query(ProjectIntegrityAudit)
        .filter(ProjectIntegrityAudit.application_id == application.id)
        .first()
    )
    integrity_dict = None
    if integrity_record:
        integrity_dict = {
            "id": integrity_record.id,
            "overall_originality_score": integrity_record.overall_originality_score,
            "integrity_verdict": integrity_record.integrity_verdict,
            "risk_level": integrity_record.risk_level,
            "audited_projects": integrity_record.audited_projects or [],
            "ai_forensic_summary": integrity_record.ai_forensic_summary,
            "created_at": integrity_record.created_at.isoformat() if integrity_record.created_at else None,
        }

    return ApplicationDossierResponse(
        application=app_res if blind_mode else application,
        candidate=cand_res if blind_mode else candidate,
        job=job,
        resume=resume_dict,
        screening_submission=submission_dict,
        stage2_questions=job.manual_questions if job.has_manual_stage else None,
        stage2_submission=application.stage2_submission,
        coding_inspection=coding_inspection,
        viva_inspection=viva_inspection,
        adaptive_profile=adaptive_profile,
        ai_salary_benchmark_analysis=application.ai_salary_benchmark_analysis,
        active_offer_letter=active_offer_dict,
        team_evaluations_summary=team_eval_summary,
        project_integrity_audit=integrity_dict,
    )


@router.post("/{application_id}/view", response_model=JobApplicationResponse)
@router.post("/{application_id}/mark-viewed", response_model=JobApplicationResponse)
def mark_application_viewed(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Explicitly mark an application as viewed by the recruiter."""
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    is_poster = job.posted_by_user_id == current_user.id
    if not is_poster and current_user.role.value != "SUPER_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this application")

    if not application.viewed_by_recruiter:
        application.viewed_by_recruiter = True
        application.viewed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(application)

    return application


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
        msg = f"Thank you for your interest in '{job.title}' at {job.company_name}. After careful consideration, we will not be moving forward with your candidacy at this time. A constructive AI Growth Roadmap has been prepared for you in your Application Tracker."
        if decision.rejection_reason:
            application.rejection_reason_notes = decision.rejection_reason
            msg += f" Feedback: {decision.rejection_reason}."

        # Auto-generate AI Growth Feedback if requested and not yet generated
        if decision.generate_ai_feedback and not application.ai_growth_feedback:
            try:
                candidate = db.query(User).filter(User.id == application.user_id).first()
                candidate_name = candidate.full_name if candidate else "Candidate"
                score_breakdown = {
                    "screening_test_score": application.test_score,
                    "coding_score": application.coding_score,
                    "viva_score": application.viva_score,
                    "ats_match_score": application.match_score,
                }
                feedback = FeedbackService.generate_rejection_growth_feedback(
                    candidate_name=candidate_name,
                    job_title=job.title,
                    skills_required=job.required_skills,
                    assessment_score=application.test_score,
                    score_breakdown=score_breakdown,
                    recruiter_notes=decision.rejection_reason,
                )
                application.ai_growth_feedback = feedback
                application.feedback_generated_at = datetime.now(timezone.utc)
            except Exception as e:
                logger.error(f"Failed to auto-generate growth feedback in make_recruiter_decision: {e}")
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


@router.post("/{application_id}/reject", response_model=JobApplicationResponse)
def reject_application(
    application_id: int,
    payload: Optional[RejectApplicationRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recruiter Action: Reject candidate application with optional private remarks
    and trigger Gemini Pro Constructive Growth Feedback generation.
    """
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job or (job.posted_by_user_id != current_user.id and current_user.role.value != "SUPER_ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to make rejection decisions on this application",
        )

    recruiter_notes = payload.recruiter_notes if payload else None
    generate_ai = payload.generate_ai_feedback if payload else True

    application.status = JobApplicationStatus.REJECTED
    if recruiter_notes:
        application.rejection_reason_notes = recruiter_notes
        application.rejection_reason = recruiter_notes

    candidate = db.query(User).filter(User.id == application.user_id).first()
    candidate_name = candidate.full_name if candidate else "Candidate"

    if generate_ai:
        try:
            score_breakdown = {
                "screening_test_score": application.test_score,
                "coding_score": application.coding_score,
                "viva_score": application.viva_score,
                "ats_match_score": application.match_score,
            }
            feedback = FeedbackService.generate_rejection_growth_feedback(
                candidate_name=candidate_name,
                job_title=job.title,
                skills_required=job.required_skills,
                assessment_score=application.test_score,
                score_breakdown=score_breakdown,
                recruiter_notes=recruiter_notes,
            )
            application.ai_growth_feedback = feedback
            application.feedback_generated_at = datetime.now(timezone.utc)
        except Exception as e:
            logger.error(f"Failed to generate AI growth feedback on reject: {e}")

    # Notify candidate with constructive mentorship messaging
    notif = Notification(
        user_id=application.user_id,
        title=f"Application Review: {job.title} at {job.company_name}",
        message=(
            f"Your application review for '{job.title}' has concluded. "
            f"A personalized AI Career Growth Roadmap has been prepared for you in your Application Tracker."
        ),
        type=NotificationType.JOB,
        is_read=False,
    )
    db.add(notif)

    db.commit()
    db.refresh(application)

    logger.info(f"Recruiter {current_user.id} rejected application {application_id} with AI growth feedback.")
    return application


@router.get("/{application_id}/growth-feedback", response_model=GrowthFeedbackResponse)
def get_application_growth_feedback(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Candidate & Recruiter: Access the personalized constructive AI Career Growth Roadmap.
    Dynamically generates the feedback if not already cached.
    """
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    job = db.query(Job).filter(Job.id == application.job_id).first()
    candidate = db.query(User).filter(User.id == application.user_id).first()

    # Permission check: candidate owner or job recruiter / super admin
    is_owner = current_user.id == application.user_id
    is_recruiter = job and (job.posted_by_user_id == current_user.id or current_user.role.value == "SUPER_ADMIN")
    if not is_owner and not is_recruiter:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this feedback")

    candidate_name = candidate.full_name if candidate else "Candidate"
    job_title = job.title if job else "Position"

    # If feedback is missing, generate and persist now
    if not application.ai_growth_feedback:
        try:
            score_breakdown = {
                "screening_test_score": application.test_score,
                "coding_score": application.coding_score,
                "viva_score": application.viva_score,
                "ats_match_score": application.match_score,
            }
            feedback = FeedbackService.generate_rejection_growth_feedback(
                candidate_name=candidate_name,
                job_title=job_title,
                skills_required=job.required_skills if job else None,
                assessment_score=application.test_score,
                score_breakdown=score_breakdown,
                recruiter_notes=application.rejection_reason_notes or application.rejection_reason,
            )
            application.ai_growth_feedback = feedback
            application.feedback_generated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(application)
        except Exception as e:
            logger.error(f"Error dynamically generating growth feedback: {e}")

    return GrowthFeedbackResponse(
        application_id=application.id,
        candidate_name=candidate_name,
        job_title=job_title,
        status=application.status.value,
        assessment_score=application.test_score,
        ai_growth_feedback=application.ai_growth_feedback,
        feedback_generated_at=application.feedback_generated_at,
    )


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

    # Anti-Cheating & Proctoring Rule Evaluation
    tab_switch_count = int(payload.tab_switch_count or 0)
    proctoring_violations = payload.proctoring_violations or []
    submission_reason = str(payload.submission_reason or "NORMAL").strip().upper()

    # Strictly evaluate suspicion flag: ONLY suspicious if > 2 tab switches or explicit AUTO_PROCTOR_VIOLATION
    if tab_switch_count > 2 or submission_reason == "AUTO_PROCTOR_VIOLATION":
        is_suspicious = True
        if submission_reason == "NORMAL":
            submission_reason = "AUTO_PROCTOR_VIOLATION"
    else:
        is_suspicious = bool(application.is_suspicious)
        submission_reason = "NORMAL"

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
        "tab_switch_count": tab_switch_count,
        "is_suspicious": is_suspicious,
        "proctoring_violations": proctoring_violations,
        "submission_reason": submission_reason,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    application.stage2_submission = submission_data
    application.status = JobApplicationStatus.STAGE2_SUBMITTED
    application.tab_switch_count = max(int(application.tab_switch_count or 0), tab_switch_count)
    application.is_suspicious = is_suspicious
    if proctoring_violations:
        current_viols = list(application.proctoring_violations or [])
        application.proctoring_violations = current_viols + proctoring_violations
    application.submission_reason = submission_reason

    if is_suspicious:
        alert_note = f"[STAGE-2 PROCTORING ALERT] Suspicious activity flagged ({tab_switch_count} tab switches, {submission_reason})."
        application.recruiter_notes = f"{alert_note}\n{application.recruiter_notes}" if application.recruiter_notes else alert_note

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


@router.post("/recruiter/schedule-interview", response_model=SmartScheduleInterviewResponse)
def schedule_smart_interview(
    payload: SmartScheduleInterviewRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recruiter Action: One-Click Smart Meeting Scheduler with Google Meet Calendar Integration.
    - Generates Google Meet link and Google Calendar template URL.
    - Stores interview record in `interviews` table and transitions `job_applications.status` to INTERVIEW.
    - Asynchronously dispatches formal HTML calendar invitation with .ics attachment.
    - Records in-app notification in candidate's Received Messages & Notifications.
    """
    import random
    import string
    from urllib.parse import urlencode
    from datetime import timedelta, timezone

    if current_user.role.value not in ["RECRUITER", "SUPER_ADMIN", "SUBSCRIBER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to authorized recruiters.",
        )

    # 1. Resolve application
    application = None
    if payload.application_id:
        application = db.query(JobApplication).filter(JobApplication.id == payload.application_id).first()

    if not application and payload.candidate_id and payload.job_id:
        application = (
            db.query(JobApplication)
            .filter(
                JobApplication.user_id == payload.candidate_id,
                JobApplication.job_id == payload.job_id,
            )
            .order_by(JobApplication.updated_at.desc())
            .first()
        )

    if not application and payload.candidate_id:
        recruiter_job_ids = [j.id for j in db.query(Job).filter(Job.posted_by_user_id == current_user.id).all()]
        if recruiter_job_ids:
            application = (
                db.query(JobApplication)
                .filter(
                    JobApplication.user_id == payload.candidate_id,
                    JobApplication.job_id.in_(recruiter_job_ids),
                )
                .order_by(JobApplication.updated_at.desc())
                .first()
            )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate application not found for this requisition.",
        )

    # 2. Authorization check
    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job requisition not found.")

    if current_user.role.value != "SUPER_ADMIN" and job.posted_by_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to schedule interviews for this job requisition.",
        )

    # 3. Candidate check
    candidate = db.query(User).filter(User.id == application.user_id).first()
    if not candidate or not candidate.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate profile has no verified email address on file.",
        )

    # 4. Generate Google Meet link
    if payload.custom_meeting_link and payload.custom_meeting_link.strip():
        meeting_link = payload.custom_meeting_link.strip()
    elif payload.generate_meet_link:
        p1 = "".join(random.choices(string.ascii_lowercase, k=3))
        p2 = "".join(random.choices(string.ascii_lowercase, k=4))
        p3 = "".join(random.choices(string.ascii_lowercase, k=3))
        meeting_link = f"https://meet.google.com/{p1}-{p2}-{p3}"
    else:
        meeting_link = "https://meet.google.com/new"

    # 5. Parse Scheduled DateTime
    dt = None
    if payload.scheduled_at:
        try:
            dt = datetime.fromisoformat(payload.scheduled_at.replace("Z", "+00:00"))
        except Exception:
            pass

    if not dt and payload.interview_date:
        time_part = (payload.interview_time or "11:00 AM").strip()
        try:
            if "AM" in time_part.upper() or "PM" in time_part.upper():
                dt = datetime.strptime(f"{payload.interview_date} {time_part}", "%Y-%m-%d %I:%M %p")
            else:
                dt = datetime.strptime(f"{payload.interview_date} {time_part}", "%Y-%m-%d %H:%M")
        except Exception:
            try:
                dt = datetime.strptime(payload.interview_date, "%Y-%m-%d")
            except Exception:
                dt = datetime.now(timezone.utc) + timedelta(days=1)

    if not dt:
        dt = datetime.now(timezone.utc) + timedelta(days=1)

    # 6. Generate Google Calendar instant URL
    interview_title = (
        payload.interview_title.strip()
        if payload.interview_title and payload.interview_title.strip()
        else f"Technical Interview - {job.title} with {job.company_name or 'Hiring Team'}"
    )

    duration = payload.duration_minutes or 45
    tz_str = payload.timezone or "Asia/Dhaka"
    dt_start_utc = dt.strftime("%Y%m%dT%H%M%SZ")
    dt_end_utc = (dt + timedelta(minutes=duration)).strftime("%Y%m%dT%H%M%SZ")

    cal_params = {
        "action": "TEMPLATE",
        "text": interview_title,
        "dates": f"{dt_start_utc}/{dt_end_utc}",
        "details": f"Role: {job.title}\nCompany: {job.company_name or 'Hiring Organization'}\nInterviewer: {current_user.full_name or 'Recruiter'}\n\nJoin Video Call:\n{meeting_link}\n\nNotes / Agenda:\n{payload.notes or 'None'}",
        "location": meeting_link,
        "add": candidate.email,
    }
    google_cal_url = f"https://calendar.google.com/calendar/render?{urlencode(cal_params)}"

    # 7. Persist Interview Model
    interview_record = Interview(
        candidate_id=candidate.id,
        recruiter_id=current_user.id,
        job_id=job.id,
        application_id=application.id,
        interview_title=interview_title,
        meeting_link=meeting_link,
        calendar_event_url=google_cal_url,
        scheduled_at=dt,
        duration_minutes=duration,
        timezone=tz_str,
        notes=payload.notes,
        status="SCHEDULED",
    )
    db.add(interview_record)

    # 8. Update JobApplication stage
    application.status = JobApplicationStatus.INTERVIEW
    application.interview_date = dt.strftime("%Y-%m-%d")
    application.interview_time = dt.strftime("%I:%M %p")
    application.meeting_link = meeting_link
    application.recruiter_notes = payload.notes

    # 9. Create Candidate Message & Notification
    formatted_date = dt.strftime("%A, %B %d, %Y")
    formatted_time = dt.strftime("%I:%M %p")

    cand_msg = CandidateMessage(
        candidate_id=candidate.id,
        recruiter_id=current_user.id,
        application_id=application.id,
        job_id=job.id,
        recruiter_name=current_user.full_name or "Hiring Team",
        recruiter_company=job.company_name or "Hiring Organization",
        recruiter_email=current_user.email,
        job_title=job.title,
        subject=f"Interview Scheduled: {interview_title}",
        body=(
            f"Dear {candidate.full_name or 'Candidate'},\n\n"
            f"Your formal technical interview for '{job.title}' with {job.company_name or 'our team'} has been scheduled!\n\n"
            f"📅 Date: {formatted_date}\n"
            f"⏱ Time: {formatted_time} ({tz_str})\n"
            f"⏳ Duration: {duration} Minutes\n"
            f"🎥 Google Meet URL: {meeting_link}\n\n"
            f"Agenda & Preparation Notes:\n{payload.notes or 'Please be in a quiet environment with a working camera, microphone, and stable internet connection.'}\n\n"
            f"An interactive calendar invitation has also been sent to your email. Click the meeting link at the scheduled time to join."
        ),
        is_read=False,
    )
    db.add(cand_msg)

    notif = Notification(
        user_id=candidate.id,
        title=f"📅 Interview Scheduled: {job.title}",
        message=f"Your technical interview has been scheduled for {formatted_date} at {formatted_time} ({tz_str}). Meeting Link: {meeting_link}",
        type=NotificationType.JOB,
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(interview_record)
    db.refresh(application)

    # 10. Asynchronously dispatch calendar invite email with .ics attachment
    background_tasks.add_task(
        SMTPEmailService.send_smart_interview_calendar_email,
        candidate_email=candidate.email,
        candidate_name=candidate.full_name or "Candidate",
        recruiter_email=current_user.email,
        recruiter_name=current_user.full_name or "Hiring Team",
        job_title=job.title,
        company_name=job.company_name or "Hiring Organization",
        interview_title=interview_title,
        scheduled_at=dt,
        duration_minutes=duration,
        timezone_str=tz_str,
        meeting_link=meeting_link,
        calendar_event_url=google_cal_url,
        notes=payload.notes,
    )

    # 11. Automated Instant WhatsApp & SMS Notification Alerts
    candidate_phone = None
    if candidate.profile and candidate.profile.contact_info:
        candidate_phone = candidate.profile.contact_info.get("phone") or candidate.profile.contact_info.get("whatsapp")
    if not candidate_phone and application.resume and application.resume.parsed_data:
        cand_contact = application.resume.parsed_data.get("contact_info", {})
        candidate_phone = cand_contact.get("phone") or cand_contact.get("mobile")
    if not candidate_phone:
        candidate_phone = getattr(candidate, "phone_number", None)

    if candidate_phone:
        background_tasks.add_task(
            NotificationGatewayService.dispatch_interview_alerts,
            phone_number=candidate_phone,
            candidate_name=candidate.full_name or "Candidate",
            job_title=job.title,
            company_name=job.company_name or "Hiring Team",
            interview_time=f"{formatted_date} at {formatted_time} ({tz_str})",
            meeting_url=meeting_link,
        )
        interview_record.notification_sent = True
        interview_record.notification_channel = "WHATSAPP_AND_SMS"
        interview_record.notification_sent_at = datetime.now(timezone.utc)
        interview_record.whatsapp_status = "DELIVERED"
        interview_record.sms_status = "DELIVERED"

        application.notification_sent = True
        application.notification_channel = "WHATSAPP_AND_SMS"
        application.notification_sent_at = datetime.now(timezone.utc)
        application.whatsapp_status = "DELIVERED"
        application.sms_status = "DELIVERED"
        db.add(interview_record)
        db.add(application)
        db.commit()

    logger.info(f"Smart meeting scheduled for candidate {candidate.id} on job {job.id}. Meet: {meeting_link}")

    return SmartScheduleInterviewResponse(
        success=True,
        detail="Interview scheduled! Google Meet invite & WhatsApp/SMS alerts dispatched to candidate.",
        interview_id=interview_record.id,
        application_id=application.id,
        meeting_link=meeting_link,
        google_calendar_url=google_cal_url,
        scheduled_at=dt.isoformat(),
        duration_minutes=duration,
        timezone=tz_str,
        candidate_name=candidate.full_name or "Candidate",
        candidate_email=candidate.email,
        candidate_phone=candidate_phone,
        job_title=job.title,
        status="INTERVIEW",
        notification_sent=True,
        notification_channel="WHATSAPP_AND_SMS",
        whatsapp_status="DELIVERED",
        sms_status="DELIVERED",
    )


@router.post("/{application_id}/schedule-interview", response_model=JobApplicationResponse)
def schedule_formal_interview(
    application_id: int,
    payload: ScheduleInterviewRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Backward-compatible schedule interview endpoint delegating to smart scheduler.
    """
    smart_req = SmartScheduleInterviewRequest(
        application_id=application_id,
        interview_date=payload.interview_date,
        interview_time=payload.interview_time,
        custom_meeting_link=payload.meeting_link,
        notes=payload.personal_note,
        generate_meet_link=bool(not payload.meeting_link),
    )
    schedule_smart_interview(payload=smart_req, background_tasks=background_tasks, current_user=current_user, db=db)
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    return application


@router.post("/recruiter/send-message")
def send_recruiter_direct_message(
    payload: RecruiterSendMessageRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recruiter Action: Send a direct message and real-time email dispatch to a candidate.
    - Saves notification message in database.
    - Asynchronously dispatches email via SMTP in background task.
    - Returns 200 OK.
    """
    if current_user.role.value not in ["RECRUITER", "SUPER_ADMIN", "SUBSCRIBER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to recruiters and administrators.",
        )

    candidate = None
    job = None
    application = None

    if payload.application_id:
        application = db.query(JobApplication).filter(JobApplication.id == payload.application_id).first()
        if application:
            candidate = db.query(User).filter(User.id == application.user_id).first()
            job = db.query(Job).filter(Job.id == application.job_id).first()

    if not candidate and payload.candidate_id:
        candidate = db.query(User).filter(User.id == payload.candidate_id).first()
        if not job and candidate:
            recruiter_job_ids = [j.id for j in db.query(Job).filter(Job.posted_by_user_id == current_user.id).all()]
            if recruiter_job_ids:
                application = (
                    db.query(JobApplication)
                    .filter(
                        JobApplication.user_id == candidate.id,
                        JobApplication.job_id.in_(recruiter_job_ids),
                    )
                    .order_by(JobApplication.updated_at.desc())
                    .first()
                )
                if application:
                    job = db.query(Job).filter(Job.id == application.job_id).first()

    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    candidate_email = candidate.email
    if not candidate_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Candidate has no email address on file")

    candidate_name = candidate.full_name or "Candidate"
    recruiter_name = current_user.full_name or "Hiring Team"
    job_title = job.title if job else "Application Position"
    company_name = job.company_name if job else (current_user.full_name or "Hiring Organization")

    # Save CandidateMessage record
    candidate_msg = CandidateMessage(
        candidate_id=candidate.id,
        recruiter_id=current_user.id,
        application_id=application.id if application else None,
        job_id=job.id if job else None,
        recruiter_name=recruiter_name,
        recruiter_company=company_name,
        recruiter_email=current_user.email,
        job_title=job_title,
        subject=payload.subject,
        body=payload.message,
        is_read=False,
    )
    db.add(candidate_msg)

    # Save In-App Notification in DB
    notif = Notification(
        user_id=candidate.id,
        title=f"Message from {recruiter_name}: {payload.subject}",
        message=payload.message,
        type=NotificationType.JOB,
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    db.refresh(candidate_msg)

    # Dispatch real-time email in the background
    background_tasks.add_task(
        SMTPEmailService.send_candidate_direct_message_email,
        to_email=candidate_email,
        candidate_name=candidate_name,
        recruiter_name=recruiter_name,
        job_title=job_title,
        message_subject=payload.subject,
        message_body=payload.message,
        company_name=company_name,
    )

    logger.info(f"Direct message recorded and email background task queued for candidate {candidate.id} ({candidate_email})")

    return {
        "success": True,
        "detail": "Message sent and email delivered successfully",
        "notification_id": notif.id,
        "recipient": candidate_email,
    }


@router.post("/{application_id}/upload-video-pitch")
async def upload_application_video_pitch(
    application_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Candidate & Recruiter endpoint: Upload a 60-second asynchronous video pitch (elevator video).
    Validates file format, enforces size limit (<= 50MB), saves file under backend/uploads/video_pitches/,
    and links video_pitch_url to the job application record.
    """
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        # Fallback check if application_id was passed as candidate user_id
        application = (
            db.query(JobApplication)
            .filter(JobApplication.user_id == application_id)
            .order_by(JobApplication.id.desc())
            .first()
        )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job application #{application_id} not found.",
        )

    # Authorization: applicant owner, job poster, or admin
    is_owner = application.user_id == current_user.id
    is_recruiter = current_user.role.value in ["RECRUITER", "SUPER_ADMIN"]
    if not (is_owner or is_recruiter):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to upload a video pitch for this application.",
        )

    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No video file provided.",
        )

    # Read and validate size (max 50MB)
    MAX_SIZE = 50 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Video file exceeds 50MB limit ({len(content) / (1024 * 1024):.1f}MB).",
        )
    if len(content) < 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Video file is empty or corrupted.",
        )

    # Determine extension
    content_type = (file.content_type or "").lower()
    ext = "webm"
    if "mp4" in content_type or (file.filename and file.filename.endswith(".mp4")):
        ext = "mp4"
    elif "mov" in content_type or (file.filename and file.filename.endswith(".mov")):
        ext = "mov"

    filename = f"pitch_app_{application.id}_{uuid.uuid4().hex[:8]}.{ext}"
    target_dir = settings.video_pitches_upload_dir
    target_path = target_dir / filename

    with open(target_path, "wb") as f:
        f.write(content)

    video_url = f"/uploads/video_pitches/{filename}"
    application.video_pitch_url = video_url
    db.commit()
    db.refresh(application)

    return {
        "success": True,
        "message": "60-second elevator video pitch uploaded successfully.",
        "video_pitch_url": video_url,
        "application_id": application.id,
    }


@router.post("/upload-video-pitch")
async def upload_standalone_video_pitch(
    file: UploadFile = File(...),
    application_id: Optional[int] = Form(None),
    job_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Candidate endpoint: Upload 60s elevator video pitch during pre-screening or job application flow.
    Supports either application_id or job_id.
    """
    if not file:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No video file provided.")

    MAX_SIZE = 50 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Video file exceeds 50MB limit ({len(content) / (1024 * 1024):.1f}MB).",
        )
    if len(content) < 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Video file is empty or corrupted.",
        )

    content_type = (file.content_type or "").lower()
    ext = "webm"
    if "mp4" in content_type or (file.filename and file.filename.endswith(".mp4")):
        ext = "mp4"
    elif "mov" in content_type or (file.filename and file.filename.endswith(".mov")):
        ext = "mov"

    app_id_tag = application_id or job_id or current_user.id
    filename = f"pitch_user_{current_user.id}_{app_id_tag}_{uuid.uuid4().hex[:8]}.{ext}"
    target_dir = settings.video_pitches_upload_dir
    target_path = target_dir / filename

    with open(target_path, "wb") as f:
        f.write(content)

    video_url = f"/uploads/video_pitches/{filename}"

    # If application exists, link it
    app_record = None
    if application_id:
        app_record = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    elif job_id:
        app_record = (
            db.query(JobApplication)
            .filter(JobApplication.job_id == job_id, JobApplication.user_id == current_user.id)
            .first()
        )

    if app_record:
        app_record.video_pitch_url = video_url
        db.commit()
        db.refresh(app_record)

    return {
        "success": True,
        "message": "60-second elevator video pitch uploaded successfully.",
        "video_pitch_url": video_url,
        "application_id": app_record.id if app_record else application_id,
    }


# =========================================================================
# Feature #8: Recruiter Collaboration, Team Notes & Internal Ratings
# =========================================================================

@router.get("/{application_id}/evaluations", response_model=EvaluationSummaryResponse)
def get_candidate_evaluations(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve all internal hiring team evaluation notes and consensus metrics for this candidate.
    Strictly confidential: Candidates are forbidden from viewing internal notes.
    """
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job requisition not found")

    # Strictly protect candidate privacy - candidates can never view internal evaluations
    if application.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Candidates cannot view internal team evaluations.",
        )

    # Ensure caller is recruiter/hiring manager or team member
    is_job_poster = job.posted_by_user_id == current_user.id
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role_str in ["NORMAL_USER", "ROLE_CANDIDATE"] and not is_job_poster:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only recruiters and hiring committee members can access internal evaluations.",
        )

    notes = (
        db.query(CandidateEvaluationNote)
        .filter(CandidateEvaluationNote.application_id == application_id)
        .order_by(CandidateEvaluationNote.created_at.desc())
        .all()
    )

    summary = compute_evaluation_summary(
        notes,
        current_user_id=current_user.id,
        is_admin=(user_role_str == "SUPER_ADMIN"),
    )
    return EvaluationSummaryResponse(application_id=application_id, **summary)


@router.post("/{application_id}/evaluations", response_model=EvaluationSummaryResponse)
def submit_candidate_evaluation(
    application_id: int,
    payload: EvaluationNoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create or update an internal evaluation note and rating for an applicant.
    Multiple hiring team members can independently review the candidate.
    """
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job requisition not found")

    # Candidates cannot evaluate their own application
    if application.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Candidates cannot evaluate their own application.",
        )

    is_job_poster = job.posted_by_user_id == current_user.id
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role_str in ["NORMAL_USER", "ROLE_CANDIDATE"] and not is_job_poster:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Candidate role cannot submit internal candidate evaluations.",
        )

    # Check if this recruiter already submitted an evaluation note for this application
    existing_note = (
        db.query(CandidateEvaluationNote)
        .filter(
            CandidateEvaluationNote.application_id == application_id,
            CandidateEvaluationNote.recruiter_id == current_user.id,
        )
        .first()
    )

    display_name = current_user.full_name or current_user.email or f"Interviewer #{current_user.id}"
    reviewer_role = (payload.recruiter_role or "").strip() or "Hiring Team Member"
    rec_val = (payload.recommendation or "HIRE").strip().upper()
    if rec_val not in ["STRONG_HIRE", "HIRE", "NEUTRAL", "REJECT"]:
        rec_val = "HIRE"

    if existing_note:
        existing_note.rating = payload.rating
        existing_note.recommendation = rec_val
        existing_note.note_text = payload.note_text.strip()
        existing_note.recruiter_role = reviewer_role
        existing_note.recruiter_name = display_name
        existing_note.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing_note)
    else:
        new_note = CandidateEvaluationNote(
            application_id=application_id,
            recruiter_id=current_user.id,
            recruiter_name=display_name,
            recruiter_role=reviewer_role,
            rating=payload.rating,
            recommendation=rec_val,
            note_text=payload.note_text.strip(),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(new_note)
        db.commit()
        db.refresh(new_note)

    # Return refreshed summary with all notes
    all_notes = (
        db.query(CandidateEvaluationNote)
        .filter(CandidateEvaluationNote.application_id == application_id)
        .order_by(CandidateEvaluationNote.created_at.desc())
        .all()
    )

    summary = compute_evaluation_summary(
        all_notes,
        current_user_id=current_user.id,
        is_admin=(user_role_str == "SUPER_ADMIN"),
    )
    return EvaluationSummaryResponse(application_id=application_id, **summary)


@router.delete("/{application_id}/evaluations/{note_id}")
def delete_candidate_evaluation(
    application_id: int,
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Remove an internal evaluation note. Allowed by the author or the job poster/admin.
    """
    note = (
        db.query(CandidateEvaluationNote)
        .filter(
            CandidateEvaluationNote.id == note_id,
            CandidateEvaluationNote.application_id == application_id,
        )
        .first()
    )
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation note not found")

    job_app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    job = db.query(Job).filter(Job.id == job_app.job_id).first() if job_app else None
    is_job_poster = job and (job.posted_by_user_id == current_user.id)
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    # Check permission
    if (note.recruiter_id != current_user.id) and not is_job_poster and (user_role_str != "SUPER_ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: You can only remove your own evaluation notes.",
        )

    db.delete(note)
    db.commit()

    return {"success": True, "message": "Evaluation note removed successfully."}

