import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_subscriber_or_admin
from app.models.user import User
from app.models.job import Job
from app.models.resume import Resume
from app.models.application import JobApplication
from app.models.notification import Notification
from app.models.assessment import JobAssessment, CandidateTestSubmission, AdaptiveExamSession
from app.models.enums import NotificationType, JobApplicationStatus
from app.schemas.assessment import (
    CandidateAssessmentView,
    CandidateMCQView,
    CandidateWrittenView,
    CodingChallengeView,
    RunCodeRequest,
    RunCodeResponse,
    SubmitVivaAudioResponse,
    AdaptiveStartRequest,
    AdaptiveStartResponse,
    AdaptiveNextRequest,
    AdaptiveNextResponse,
    AdaptiveQuestionView,
    CandidateTestSubmissionCreate,
    CandidateTestSubmissionResponse,
    JobAssessmentFullResponse,
)
from app.schemas.application import JobApplicationResponse, Stage2SubmissionRequest
from app.services.gemini_service import GeminiService
from app.services.matcher import JobMatchService
from app.services.badge_service import BadgeService
from app.services.code_sandbox import CodeSandboxService
from app.services.code_evaluator import evaluate_candidate_code_with_gemini
from app.services.salary_benchmarker import SalaryBenchmarkService
from app.services.voice_screening_service import VoiceScreeningService
from app.services.adaptive_exam_service import AdaptiveExamService, TIER_MULTIPLIERS
from app.utils.logger import logger

router = APIRouter()


def get_coding_challenge_for_job(job_title: str, required_skills: Optional[List[str]] = None) -> Dict[str, Any]:
    """Generates an algorithmic live coding challenge tailored to the technical position."""
    skills_label = ", ".join(required_skills[:3]) if required_skills else "Algorithms & Data Structures"
    return {
        "title": "Optimal Subarray Target Sum & Deduplication",
        "description": (
            f"As part of the technical screening for **{job_title}** ({skills_label}), "
            "write an optimized solution function `solution(nums, target)` that returns the 0-based indices "
            "of the two distinct elements from `nums` whose sum equals `target`.\n\n"
            "### Constraints & Specifications:\n"
            "- Exactly one valid pair exists in each test dataset.\n"
            "- You cannot reuse the same array index twice.\n"
            "- Return indices in ascending order, e.g. `[0, 1]`.\n"
            "- Target Time Complexity: **O(N)** | Space Complexity: **O(N)**."
        ),
        "input_format": "nums: List[int], target: int",
        "output_format": "List[int] containing the pair indices",
        "example_test_cases": [
            {
                "input": "nums = [2, 7, 11, 15], target = 9",
                "output": "[0, 1]",
                "expected": [0, 1],
                "args": [[2, 7, 11, 15], 9],
                "explanation": "Because nums[0] + nums[1] == 2 + 7 == 9, we return [0, 1]."
            },
            {
                "input": "nums = [3, 2, 4], target = 6",
                "output": "[1, 2]",
                "expected": [1, 2],
                "args": [[3, 2, 4], 6],
                "explanation": "Because nums[1] + nums[2] == 2 + 4 == 6, we return [1, 2]."
            }
        ],
        "hidden_test_cases": [
            {
                "input": "nums = [3, 3], target = 6",
                "expected": [0, 1],
                "args": [[3, 3], 6]
            },
            {
                "input": "nums = [1, 5, 8, 12, 19], target = 20",
                "expected": [0, 4],
                "args": [[1, 5, 8, 12, 19], 20]
            }
        ],
        "starter_code": {
            "python": "def solution(nums, target):\n    # Write your solution here\n    # e.g. return [0, 1]\n    pass\n",
            "javascript": "function solution(nums, target) {\n    // Write your solution here\n    // e.g. return [0, 1];\n    return [];\n}\n"
        }
    }


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

    # Ensure coding challenge is attached to assessment
    challenge_data = assessment.coding_challenge or get_coding_challenge_for_job(job.title, job.required_skills)
    if not assessment.coding_challenge:
        assessment.coding_challenge = challenge_data
        db.add(assessment)
        db.commit()

    # Ensure viva prompt is attached to assessment
    viva_q = assessment.viva_prompt or VoiceScreeningService.get_default_viva_prompt_for_job(job.title, job.required_skills)
    if not assessment.viva_prompt:
        assessment.viva_prompt = viva_q
        db.add(assessment)
        db.commit()

    # Ensure multi-tiered adaptive question pool is available
    if not assessment.adaptive_question_pool:
        adaptive_pool = AdaptiveExamService.generate_adaptive_pool(job.title, job.required_skills or [])
        assessment.adaptive_question_pool = adaptive_pool
        db.add(assessment)
        db.commit()
    else:
        adaptive_pool = assessment.adaptive_question_pool

    # Initialize candidate's AdaptiveExamSession
    session_token = f"adapt_{current_user.id}_{job.id}_{uuid.uuid4().hex[:10]}"
    first_q_raw = (adaptive_pool.get("MEDIUM") or [])[0] if (adaptive_pool.get("MEDIUM") or []) else None
    if not first_q_raw:
        first_q_raw = (adaptive_pool.get("EASY") or [{}])[0]

    session_record = AdaptiveExamSession(
        session_token=session_token,
        candidate_id=current_user.id,
        job_id=job.id,
        current_question_index=1,
        current_tier="MEDIUM",
        current_streak=0,
        theta_score=50.0,
        history=[],
        current_question=first_q_raw,
        is_completed=False,
    )
    db.add(session_record)
    db.commit()

    first_q_view = {
        "id": first_q_raw.get("id", 1),
        "question_number": 1,
        "total_questions": 15,
        "tier": "MEDIUM",
        "tier_label": "Applied / Intermediate",
        "weight": 1.5,
        "question": first_q_raw.get("question", ""),
        "options": first_q_raw.get("options", []),
        "topic": first_q_raw.get("topic", "Practical Application"),
    } if first_q_raw else None

    safe_challenge = CodingChallengeView(
        title=challenge_data.get("title", "Live Technical Coding Challenge"),
        description=challenge_data.get("description", ""),
        input_format=challenge_data.get("input_format"),
        output_format=challenge_data.get("output_format"),
        example_test_cases=challenge_data.get("example_test_cases", []),
        starter_code=challenge_data.get("starter_code"),
    )

    return CandidateAssessmentView(
        job_id=job.id,
        job_title=job.title,
        company_name=job.company_name,
        total_mcq_count=len(safe_mcqs),
        total_written_count=len(safe_written),
        time_limit_minutes=45,
        mcq_questions=safe_mcqs,
        written_questions=safe_written,
        coding_challenge=safe_challenge,
        viva_prompt=viva_q,
        adaptive_enabled=True,
        adaptive_session_token=session_token,
        first_adaptive_question=first_q_view,
    )


@router.post("/assessments/run-code", response_model=RunCodeResponse)
def run_code_sandbox(
    payload: RunCodeRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Candidate Live Coding Sandbox Execution Engine:
    Safely executes candidate's code against public test cases with timeout,
    capturing Stdout, execution duration, and assertion results.
    """
    res = CodeSandboxService.run_code(
        code=payload.code,
        language=payload.language or "python",
        test_cases=payload.test_cases or [],
    )
    return RunCodeResponse(
        success=bool(res.get("success", False)),
        passed_count=int(res.get("passed_count", 0)),
        total_count=int(res.get("total_count", 0)),
        execution_time_ms=float(res.get("execution_time_ms", 0.0)),
        stdout=str(res.get("stdout", "")),
        error=res.get("error"),
        test_results=res.get("test_results", []),
    )


@router.post("/assessments/adaptive/start", response_model=AdaptiveStartResponse)
def start_adaptive_exam(
    payload: AdaptiveStartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Initializes a new Dynamic AI Adaptive Testing session.
    Starts candidate at MEDIUM difficulty (1.5x weight) with baseline Theta score 50.0.
    """
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job requisition not found.")

    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == job.id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not configured for this job.")

    if not assessment.adaptive_question_pool:
        adaptive_pool = AdaptiveExamService.generate_adaptive_pool(job.title, job.required_skills or [])
        assessment.adaptive_question_pool = adaptive_pool
        db.add(assessment)
        db.commit()
    else:
        adaptive_pool = assessment.adaptive_question_pool

    first_q_raw = (adaptive_pool.get("MEDIUM") or [])[0] if (adaptive_pool.get("MEDIUM") or []) else None
    if not first_q_raw:
        first_q_raw = (adaptive_pool.get("EASY") or [{}])[0]

    session_token = f"adapt_{current_user.id}_{job.id}_{uuid.uuid4().hex[:10]}"
    session = AdaptiveExamSession(
        session_token=session_token,
        candidate_id=current_user.id,
        job_id=job.id,
        current_question_index=1,
        current_tier="MEDIUM",
        current_streak=0,
        theta_score=50.0,
        history=[],
        current_question=first_q_raw,
        is_completed=False,
    )
    db.add(session)
    db.commit()

    q_view = AdaptiveQuestionView(
        id=first_q_raw.get("id", 1),
        question_number=1,
        total_questions=15,
        tier="MEDIUM",
        tier_label="Applied / Intermediate",
        weight=1.5,
        question=first_q_raw.get("question", ""),
        options=first_q_raw.get("options", []),
        topic=first_q_raw.get("topic", "Practical Application"),
    )

    return AdaptiveStartResponse(
        session_token=session_token,
        current_question=q_view,
        current_tier="MEDIUM",
        current_streak=0,
        theta_score=50.0,
        total_questions=15,
    )


@router.post("/assessments/adaptive/next", response_model=AdaptiveNextResponse)
def submit_adaptive_answer_and_get_next(
    payload: AdaptiveNextRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Item Response Engine:
    - Evaluates candidate's previous answer for correctness.
    - Recalibrates latent ability (Theta).
    - Determines next difficulty tier based on streak & accuracy.
    - Selects the next question from the pool matching the new tier.
    - If 15 questions completed, calculates final demonstrated skill ceiling & weighted score.
    """
    session = (
        db.query(AdaptiveExamSession)
        .filter(
            AdaptiveExamSession.session_token == payload.session_token,
            AdaptiveExamSession.candidate_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Adaptive assessment session not found or expired.")

    curr_q = session.current_question or {}
    correct_opt = str(curr_q.get("correct_option", "")).strip().upper()
    selected_opt = str(payload.selected_option).strip().upper()
    # Normalize if candidate sent full "A) Option" or index "0"
    if len(selected_opt) > 1 and selected_opt[1] == ')':
        selected_opt = selected_opt[0]
    elif selected_opt in ["0", "1", "2", "3"]:
        selected_opt = ["A", "B", "C", "D"][int(selected_opt)]

    is_correct = (selected_opt == correct_opt) if correct_opt else True
    current_tier = session.current_tier or "MEDIUM"

    # Update streak
    prev_streak = session.current_streak or 0
    if is_correct:
        new_streak = prev_streak + 1 if prev_streak > 0 else 1
    else:
        new_streak = prev_streak - 1 if prev_streak < 0 else -1

    # Update Theta score
    new_theta = AdaptiveExamService.update_theta_score(
        current_theta=session.theta_score,
        current_tier=current_tier,
        is_correct=is_correct,
        streak=new_streak,
    )

    # Compute next tier
    next_tier = AdaptiveExamService.compute_next_tier(
        current_tier=current_tier,
        is_correct=is_correct,
        streak=new_streak,
    )

    # Generate streak message
    streak_msg = None
    if is_correct and new_streak >= 2:
        tier_names = {"HARD": "Advanced", "EXPERT": "Expert Architecture", "MEDIUM": "Applied"}
        streak_msg = f"🔥 {new_streak} in a row! Difficulty upgraded to {tier_names.get(next_tier, next_tier)}"
    elif not is_correct and next_tier != current_tier:
        streak_msg = f"Recalibrated difficulty to {next_tier} to reinforce fundamentals"

    # Record history item
    history_item = {
        "question_num": session.current_question_index,
        "question_id": curr_q.get("id"),
        "tier": current_tier,
        "weight": curr_q.get("weight", TIER_MULTIPLIERS.get(current_tier, 1.5)),
        "topic": curr_q.get("topic", "Technical"),
        "selected_option": selected_opt,
        "correct_option": correct_opt,
        "is_correct": is_correct,
        "theta": new_theta,
        "streak": new_streak,
        "time_taken_seconds": payload.time_taken_seconds,
    }
    history = list(session.history or [])
    history.append(history_item)
    session.history = history

    total_test_limit = 15
    next_q_num = session.current_question_index + 1

    if next_q_num > total_test_limit:
        # Exam is completed!
        session.is_completed = True
        session.theta_score = new_theta
        session.current_tier = next_tier
        session.current_streak = new_streak

        # Compute final weighted metrics & ceiling
        tier_dist = {
            "EASY": {"attempted": 0, "correct": 0},
            "MEDIUM": {"attempted": 0, "correct": 0},
            "HARD": {"attempted": 0, "correct": 0},
            "EXPERT": {"attempted": 0, "correct": 0},
        }
        total_weighted_points = 0.0
        max_possible_points = 0.0
        total_correct = 0

        for h in history:
            t = h.get("tier", "MEDIUM")
            w = float(h.get("weight", 1.5))
            max_possible_points += (w * 10.0)
            if t in tier_dist:
                tier_dist[t]["attempted"] += 1
            if h.get("is_correct"):
                total_correct += 1
                total_weighted_points += (w * 10.0)
                if t in tier_dist:
                    tier_dist[t]["correct"] += 1

        weighted_percentage = round((total_weighted_points / max(1.0, max_possible_points)) * 100.0, 1)
        mcq_scaled_pts = round((weighted_percentage / 100.0) * 50.0, 2)
        skill_ceiling = AdaptiveExamService.calculate_skill_ceiling(new_theta, tier_dist)

        final_summary = {
            "total_questions": total_test_limit,
            "total_correct": total_correct,
            "raw_accuracy": round((total_correct / total_test_limit) * 100.0, 1),
            "weighted_percentage": weighted_percentage,
            "mcq_scaled_points": mcq_scaled_pts,
            "final_theta": new_theta,
            "skill_ceiling": skill_ceiling,
            "tier_distribution": tier_dist,
            "skill_curve": history,
        }

        db.add(session)
        db.commit()

        return AdaptiveNextResponse(
            is_completed=True,
            was_correct=is_correct,
            correct_option=correct_opt,
            explanation=curr_q.get("explanation"),
            updated_theta=new_theta,
            updated_tier=next_tier,
            current_streak=new_streak,
            streak_message="Assessment Completed! Recalibrated Final Skill Rating.",
            next_question=None,
            final_results=final_summary,
        )

    # Fetch next question from assessment adaptive pool
    job = db.query(Job).filter(Job.id == session.job_id).first()
    assessment = db.query(JobAssessment).filter(JobAssessment.job_id == session.job_id).first()
    pool = (assessment.adaptive_question_pool if assessment else None) or {}

    used_qids = {h.get("question_id") for h in history}
    candidate_questions = [q for q in pool.get(next_tier, []) if q.get("id") not in used_qids]

    if not candidate_questions:
        from app.services.adaptive_exam_service import TIER_ORDER
        for t in TIER_ORDER:
            candidate_questions = [q for q in pool.get(t, []) if q.get("id") not in used_qids]
            if candidate_questions:
                next_tier = t
                break

    next_q_raw = candidate_questions[0] if candidate_questions else None
    if not next_q_raw:
        next_q_raw = {
            "id": 500 + next_q_num,
            "tier": next_tier,
            "weight": TIER_MULTIPLIERS.get(next_tier, 1.5),
            "topic": "System Architecture",
            "question": f"When scaling system throughput, what architectural strategy mitigates database write bottlenecks under {next_tier} load?",
            "options": [
                "A) Event-driven asynchronous queuing (Kafka/RabbitMQ) and batch writes",
                "B) Disabling transaction isolation levels entirely",
                "C) Reducing server RAM allocation",
                "D) Synchronous polling loops"
            ],
            "correct_option": "A",
            "explanation": "Asynchronous messaging queues decouple ingestion from writes, allowing buffered bulk processing."
        }

    session.current_question_index = next_q_num
    session.current_tier = next_tier
    session.current_streak = new_streak
    session.theta_score = new_theta
    session.current_question = next_q_raw

    db.add(session)
    db.commit()

    tier_labels = {
        "EASY": "Foundational / Basics",
        "MEDIUM": "Applied / Intermediate",
        "HARD": "Deep Technical / Advanced",
        "EXPERT": "Expert Architecture",
    }

    next_q_view = AdaptiveQuestionView(
        id=next_q_raw.get("id", next_q_num),
        question_number=next_q_num,
        total_questions=total_test_limit,
        tier=next_tier,
        tier_label=tier_labels.get(next_tier, next_tier),
        weight=TIER_MULTIPLIERS.get(next_tier, 1.5),
        question=next_q_raw.get("question", ""),
        options=next_q_raw.get("options", []),
        topic=next_q_raw.get("topic", "Technical Architecture"),
    )

    return AdaptiveNextResponse(
        is_completed=False,
        was_correct=is_correct,
        correct_option=correct_opt,
        explanation=curr_q.get("explanation"),
        updated_theta=new_theta,
        updated_tier=next_tier,
        current_streak=new_streak,
        streak_message=streak_msg,
        next_question=next_q_view,
        final_results=None,
    )


@router.post("/assessments/submit-viva", response_model=SubmitVivaAudioResponse)
@router.post("/assessments/{job_id}/submit-viva", response_model=SubmitVivaAudioResponse)
async def submit_viva_audio(
    job_id: Optional[int] = None,
    audio_file: UploadFile = File(...),
    question_prompt: Optional[str] = Form(None),
    application_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submits candidate oral viva recording (up to 60s), passes audio directly to
    Google Gemini Pro Multimodal Audio Evaluation, transcribes speech, evaluates
    technical clarity, accuracy, vocabulary and tone, and persists the recording.
    """
    if not audio_file:
        raise HTTPException(status_code=400, detail="No audio file provided.")

    content = await audio_file.read()
    if len(content) < 100:
        raise HTTPException(status_code=400, detail="Audio file too short or corrupted.")

    effective_job_id = job_id or 0
    q_prompt = (question_prompt or "").strip()
    if not q_prompt and job_id:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            q_prompt = VoiceScreeningService.get_default_viva_prompt_for_job(job.title, job.required_skills)

    if not q_prompt:
        q_prompt = "In 60 seconds, describe a technically challenging problem you recently solved, how you approached debugging it, and the final outcome."

    # Save audio file to disk
    audio_url = VoiceScreeningService.save_viva_audio_file(
        audio_bytes=content,
        candidate_id=current_user.id,
        job_id=effective_job_id,
        content_type=audio_file.content_type or "audio/webm",
    )

    # Evaluate with Gemini Audio API
    eval_result = VoiceScreeningService.evaluate_viva_audio_with_gemini(
        audio_input=content,
        question_prompt=q_prompt,
        mime_type=audio_file.content_type or "audio/webm",
    )

    viva_score = float(eval_result.get("viva_score", 75.0))
    transcription = eval_result.get("transcribed_text", "")
    summary = eval_result.get("ai_viva_summary", "")

    # If application exists, update directly
    app_query = db.query(JobApplication).filter(JobApplication.user_id == current_user.id)
    if application_id:
        app_query = app_query.filter(JobApplication.id == application_id)
    elif job_id:
        app_query = app_query.filter(JobApplication.job_id == job_id)

    app_record = app_query.order_by(JobApplication.id.desc()).first()
    if app_record:
        app_record.viva_audio_url = audio_url
        app_record.viva_score = viva_score
        app_record.viva_transcription = transcription
        app_record.viva_evaluation = eval_result
        db.add(app_record)
        db.commit()
        db.refresh(app_record)

    return SubmitVivaAudioResponse(
        success=True,
        viva_audio_url=audio_url,
        viva_score=viva_score,
        viva_transcription=transcription,
        viva_evaluation=eval_result,
        ai_viva_summary=summary,
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
            expected_salary=payload.expected_salary,
        )
        db.add(application)
        db.flush()
    else:
        if payload.expected_salary is not None:
            application.expected_salary = payload.expected_salary

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
        is_suspicious = False
        submission_reason = "NORMAL"

    # Fast-Path for Proctoring Violations: DO NOT block thread on Gemini AI
    if submission_reason == "AUTO_PROCTOR_VIOLATION" or tab_switch_count > 2:
        logger.warning(f"Fast-path triggered for Candidate #{current_user.id} on Job #{job.id}: {submission_reason} ({tab_switch_count} violations)")
        mcq_questions = assessment.mcq_questions or []
        written_questions = assessment.written_questions or []
        total_mcqs = len(mcq_questions) if mcq_questions else 25
        correct_count = 0
        mcq_results = []
        cand_mcqs = payload.mcq_answers or {}

        for q in mcq_questions:
            qid_str = str(q.get("id"))
            selected = str(cand_mcqs.get(qid_str, "")).strip().upper()
            selected_letter = selected[0] if selected and selected[0] in ["A", "B", "C", "D"] else selected
            correct = str(q.get("correct_option", "")).strip().upper()
            correct_letter = correct[0] if correct and correct[0] in ["A", "B", "C", "D"] else correct
            is_correct = bool(selected_letter and selected_letter == correct_letter)
            if is_correct:
                correct_count += 1
            mcq_results.append({
                "question_id": q.get("id"),
                "selected_option": selected_letter,
                "correct_option": correct_letter,
                "is_correct": is_correct,
            })

        mcq_score = round((correct_count / max(1, total_mcqs)) * 50.0, 2)
        written_score = 0.0
        total_test_score = mcq_score
        written_evaluations = [
            {
                "question_id": wq.get("id"),
                "marks_awarded": 0.0,
                "max_marks": float(wq.get("max_marks", 10.0)),
                "feedback": "Evaluation omitted due to exam auto-termination on proctoring violation (>2 tab switches detected).",
                "strengths": "N/A",
                "areas_for_improvement": "Exam auto-terminated due to multiple window/tab switches.",
            }
            for wq in written_questions
        ]
        suspicion_note = f"⚠️ [PROCTORING ALERT]: Candidate flagged suspicious. Tab switches: {tab_switch_count}. Reason: {submission_reason}."
        written_feedback = {
            "evaluations": written_evaluations,
            "total_written_marks": 0.0,
            "summary": f"Exam auto-terminated. MCQs scored: {mcq_score}/50 ({correct_count}/{total_mcqs} correct). Written questions scored 0 due to proctoring violation.",
            "proctoring_flag": suspicion_note,
        }
        evaluation = {
            "mcq_score": mcq_score,
            "written_score": 0.0,
            "total_test_score": total_test_score,
            "mcq_correct_count": correct_count,
            "total_mcqs": total_mcqs,
            "mcq_details": mcq_results,
            "written_evaluations": written_evaluations,
            "written_evaluation_feedback": written_feedback,
            "summary_feedback": f"{suspicion_note}\nExam auto-terminated on proctoring violation. Overall score: {total_test_score}%.",
        }
    else:
        # Standard Gemini AI evaluation for clean submissions
        evaluation = GeminiService.evaluate_test_submission(
            mcq_questions=assessment.mcq_questions or [],
            written_questions=assessment.written_questions or [],
            mcq_answers=payload.mcq_answers or {},
            written_answers=payload.written_answers or {},
        )
        written_feedback = evaluation.get("written_evaluation_feedback", {}) or {}
        if is_suspicious:
            suspicion_note = f"⚠️ [PROCTORING ALERT]: Candidate flagged suspicious. Tab switches: {tab_switch_count}. Reason: {submission_reason}."
            written_feedback["proctoring_flag"] = suspicion_note
            if "summary_feedback" in evaluation:
                evaluation["summary_feedback"] = f"{suspicion_note}\n{evaluation.get('summary_feedback', '')}"

    # Live Coding Challenge AI Evaluation & Scoring
    # Dynamic AI Adaptive Testing Integration
    adaptive_session = None
    if payload.adaptive_session_token:
        adaptive_session = db.query(AdaptiveExamSession).filter(
            AdaptiveExamSession.session_token == payload.adaptive_session_token
        ).first()
    if not adaptive_session:
        # Fallback query by candidate & job
        adaptive_session = db.query(AdaptiveExamSession).filter(
            AdaptiveExamSession.candidate_id == current_user.id,
            AdaptiveExamSession.job_id == job.id,
        ).order_by(AdaptiveExamSession.updated_at.desc()).first()

    adaptive_ability_rating = payload.adaptive_ability_rating
    adaptive_theta_score = payload.adaptive_theta_score
    adaptive_skill_curve = payload.adaptive_skill_curve
    adaptive_tier_distribution = payload.adaptive_tier_distribution

    if adaptive_session and adaptive_session.history:
        history = adaptive_session.history or []
        total_correct = 0
        total_weighted_points = 0.0
        max_possible_points = 0.0
        tier_dist = {
            "EASY": {"attempted": 0, "correct": 0},
            "MEDIUM": {"attempted": 0, "correct": 0},
            "HARD": {"attempted": 0, "correct": 0},
            "EXPERT": {"attempted": 0, "correct": 0},
        }
        for h in history:
            t = h.get("tier", "MEDIUM")
            w = TIER_MULTIPLIERS.get(t, 1.5)
            max_possible_points += (w * 10.0)
            if t in tier_dist:
                tier_dist[t]["attempted"] += 1
            if h.get("is_correct"):
                total_correct += 1
                total_weighted_points += (w * 10.0)
                if t in tier_dist:
                    tier_dist[t]["correct"] += 1

        weighted_pct = round((total_weighted_points / max(1.0, max_possible_points)) * 100.0, 1)
        adaptive_mcq_pts = round((weighted_pct / 100.0) * 50.0, 2)
        final_theta = adaptive_session.theta_score if adaptive_session.theta_score is not None else 50.0
        calculated_ceiling = AdaptiveExamService.calculate_skill_ceiling(final_theta, tier_dist)

        adaptive_ability_rating = calculated_ceiling
        adaptive_theta_score = final_theta
        adaptive_skill_curve = history
        adaptive_tier_distribution = tier_dist

        # Apply adaptive weighted points as official MCQ score if clean submission
        if submission_reason != "AUTO_PROCTOR_VIOLATION" and tab_switch_count <= 2:
            evaluation["mcq_score"] = adaptive_mcq_pts
            evaluation["mcq_correct_count"] = total_correct
            evaluation["total_mcqs"] = len(history)

        adaptive_session.is_completed = True
        db.add(adaptive_session)
    elif not adaptive_ability_rating and adaptive_theta_score is not None:
        adaptive_ability_rating = AdaptiveExamService.calculate_skill_ceiling(adaptive_theta_score, adaptive_tier_distribution or {})

    # Live Coding Challenge AI Evaluation & Scoring
    coding_score = 0.0
    code_eval = None
    cand_code = payload.candidate_code
    code_lang = (payload.code_language or "python").strip().lower()

    if cand_code and cand_code.strip():
        challenge = assessment.coding_challenge or get_coding_challenge_for_job(job.title, job.required_skills)
        all_test_cases = (challenge.get("example_test_cases") or []) + (challenge.get("hidden_test_cases") or [])
        try:
            code_eval = evaluate_candidate_code_with_gemini(
                problem_statement=challenge.get("description", ""),
                candidate_code=cand_code,
                language=code_lang,
                expected_test_cases=all_test_cases,
            )
            coding_score = float(code_eval.get("final_score", 0.0))
        except Exception as eval_err:
            logger.error(f"Error evaluating candidate code submission: {eval_err}")
            coding_score = 0.0

    # Voice Viva Simulation & Speech Screening evaluation attributes
    viva_audio_url = payload.viva_audio_url or (application.viva_audio_url if application else None)
    viva_score = float(payload.viva_score) if payload.viva_score is not None else (application.viva_score if application and application.viva_score is not None else 0.0)
    viva_transcription = payload.viva_transcription or (application.viva_transcription if application else None)
    viva_eval = payload.viva_evaluation or (application.viva_evaluation if application else None)

    has_coding = bool(cand_code and cand_code.strip())
    has_viva = bool(viva_audio_url and viva_audio_url.strip())

    # Aggregate scores:
    mcq_val = evaluation["mcq_score"]     # 0-50 pts
    written_val = evaluation["written_score"] # 0-50 pts

    if has_coding and has_viva:
        # 30% MCQ, 25% Written, 25% Coding, 20% Viva
        total_test_score = round(
            (mcq_val / 50.0) * 30.0 +
            (written_val / 50.0) * 25.0 +
            (coding_score / 100.0) * 25.0 +
            (viva_score / 100.0) * 20.0,
            2
        )
    elif has_coding and not has_viva:
        # 40% MCQ, 30% Written, 30% Coding
        total_test_score = round(
            (mcq_val / 50.0) * 40.0 +
            (written_val / 50.0) * 30.0 +
            (coding_score / 100.0) * 30.0,
            2
        )
    elif not has_coding and has_viva:
        # 35% MCQ, 35% Written, 30% Viva
        total_test_score = round(
            (mcq_val / 50.0) * 35.0 +
            (written_val / 50.0) * 35.0 +
            (viva_score / 100.0) * 30.0,
            2
        )
    else:
        # 50% MCQ, 50% Written
        total_test_score = evaluation["total_test_score"]

    # Persist CandidateTestSubmission
    submission = CandidateTestSubmission(
        application_id=application.id if application else None,
        candidate_id=current_user.id,
        job_id=job.id,
        assessment_id=assessment.id,
        mcq_answers=payload.mcq_answers or {},
        written_answers=payload.written_answers or {},
        candidate_code=cand_code,
        code_language=code_lang,
        coding_score=coding_score,
        code_evaluation=code_eval,
        viva_audio_url=viva_audio_url,
        viva_score=viva_score,
        viva_transcription=viva_transcription,
        viva_evaluation=viva_eval,
        adaptive_ability_rating=adaptive_ability_rating,
        adaptive_theta_score=adaptive_theta_score,
        adaptive_skill_curve=adaptive_skill_curve,
        adaptive_tier_distribution=adaptive_tier_distribution,
        mcq_score=evaluation["mcq_score"],
        written_score=evaluation["written_score"],
        total_test_score=total_test_score,
        written_evaluation_feedback=written_feedback,
        tab_switch_count=tab_switch_count,
        is_suspicious=is_suspicious,
        proctoring_violations=proctoring_violations,
        submission_reason=submission_reason,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    # Update JobApplication linkage and status
    if application:
        application.candidate_test_submission_id = submission.id
        application.test_score = submission.total_test_score
        application.candidate_code = cand_code
        application.code_language = code_lang
        application.coding_score = coding_score
        application.code_evaluation = code_eval
        application.viva_audio_url = viva_audio_url
        application.viva_score = viva_score
        application.viva_transcription = viva_transcription
        application.viva_evaluation = viva_eval
        if payload.video_pitch_url:
            application.video_pitch_url = payload.video_pitch_url
        application.adaptive_ability_rating = adaptive_ability_rating
        application.adaptive_theta_score = adaptive_theta_score
        application.adaptive_skill_curve = adaptive_skill_curve
        application.adaptive_tier_distribution = adaptive_tier_distribution
        application.assessment_status = "COMPLETED"
        application.tab_switch_count = tab_switch_count
        application.is_suspicious = is_suspicious
        application.proctoring_violations = proctoring_violations
        application.submission_reason = submission_reason

        # Re-evaluate AI Salary Benchmark & Budget Fit with actual test score
        if application.expected_salary is not None:
            cand_skills = (resume.parsed_data or {}).get("skills", []) if resume else []
            cand_exp = float((resume.parsed_data or {}).get("experience_years", 1.0)) if resume else 1.0
            try:
                salary_bench = SalaryBenchmarkService.analyze_salary_and_budget_fit(
                    job_title=job.title,
                    experience_required=job.experience_years_required or 0,
                    min_salary=job.min_salary,
                    max_salary=job.max_salary,
                    candidate_experience_years=cand_exp,
                    candidate_skills=cand_skills,
                    candidate_test_score=submission.total_test_score,
                    expected_salary=application.expected_salary,
                )
                application.ai_salary_benchmark_analysis = salary_bench
                application.salary_fit_status = salary_bench.get("fit_status", "WITHIN_BUDGET")
            except Exception as sb_err:
                logger.warning(f"Could not compute salary benchmark on assessment submit: {sb_err}")

        if is_suspicious:
            proctor_note = f"[PROCTORING VIOLATION ALERT] Suspicious activity detected: {tab_switch_count} tab switches / focus changes. Mode: {submission_reason}."
            application.recruiter_notes = f"{proctor_note}\n{application.recruiter_notes}" if application.recruiter_notes else proctor_note

        # Benchmark evaluation based on Recruiter-configured passing score (default: 70.0)
        passing_benchmark = float(job.passing_score if job.passing_score is not None else 70.0)
        is_passed = float(submission.total_test_score or 0.0) >= passing_benchmark and submission_reason != "AUTO_PROCTOR_VIOLATION"
        application.is_stage1_passed = is_passed
        if is_passed:
            application.status = JobApplicationStatus.STAGE1_PASSED
        else:
            application.status = JobApplicationStatus.STAGE1_FAILED

        db.add(application)
        db.commit()
        db.refresh(application)

    # Automatic Verified Talent Badge Generation for Top Performers (Score >= 80%)
    if float(submission.total_test_score or 0.0) >= 80.0 and not is_suspicious:
        try:
            BadgeService.issue_badge_if_eligible(
                db=db,
                candidate_id=current_user.id,
                score=float(submission.total_test_score),
                skill_domain=job.title,
                job_id=job.id,
                application_id=application.id if application else None,
                submission_id=submission.id,
                verified_skills=job.required_skills or [],
            )
        except Exception as badge_err:
            logger.warning(f"Could not auto-generate badge for candidate #{current_user.id}: {badge_err}")

    # Dispatch notifications
    try:
        # Candidate notification
        cand_notif_title = "Exam Terminated - Proctoring Violation" if submission_reason == "AUTO_PROCTOR_VIOLATION" else "Screening Test Submitted"
        cand_notif_msg = (
            f"Your screening exam for '{job.title}' was automatically terminated due to excessive tab switching and submitted with a proctoring flag."
            if submission_reason == "AUTO_PROCTOR_VIOLATION"
            else f"You achieved {submission.total_test_score}% on the technical screening for '{job.title}'."
        )
        db.add(
            Notification(
                user_id=current_user.id,
                title=cand_notif_title,
                message=cand_notif_msg,
                type=NotificationType.JOB,
            )
        )
        # Recruiter notification
        rec_notif_title = "⚠️ Candidate Exam Terminated (High Proctoring Risk)" if is_suspicious else "Candidate Assessment Score Available"
        rec_notif_msg = (
            f"Candidate {current_user.full_name} was auto-terminated on '{job.title}' ({tab_switch_count} violations). Exam flagged for your review."
            if is_suspicious
            else f"{current_user.full_name} completed the screening test for '{job.title}' with a score of {submission.total_test_score}%."
        )
        db.add(
            Notification(
                user_id=job.posted_by_user_id,
                title=rec_notif_title,
                message=rec_notif_msg,
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
        coding_score=submission.coding_score,
        total_test_score=submission.total_test_score,
        candidate_code=submission.candidate_code,
        code_language=submission.code_language,
        code_evaluation=submission.code_evaluation,
        viva_audio_url=submission.viva_audio_url,
        viva_score=submission.viva_score,
        viva_transcription=submission.viva_transcription,
        viva_evaluation=submission.viva_evaluation,
        adaptive_ability_rating=submission.adaptive_ability_rating,
        adaptive_theta_score=submission.adaptive_theta_score,
        adaptive_skill_curve=submission.adaptive_skill_curve,
        adaptive_tier_distribution=submission.adaptive_tier_distribution,
        mcq_correct_count=evaluation["mcq_correct_count"],
        total_mcqs=evaluation["total_mcqs"],
        written_evaluations=evaluation["written_evaluations"],
        summary_feedback=evaluation.get("summary_feedback", ""),
        assessment_status=application.assessment_status if application else "COMPLETED",
        tab_switch_count=submission.tab_switch_count,
        is_suspicious=submission.is_suspicious,
        proctoring_violations=submission.proctoring_violations,
        submission_reason=submission.submission_reason,
        expected_salary=application.expected_salary if application else payload.expected_salary,
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
        "coding_score": sub.coding_score,
        "candidate_code": sub.candidate_code,
        "code_evaluation": sub.code_evaluation,
        "viva_audio_url": sub.viva_audio_url,
        "viva_score": sub.viva_score,
        "viva_transcription": sub.viva_transcription,
        "viva_evaluation": sub.viva_evaluation,
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
