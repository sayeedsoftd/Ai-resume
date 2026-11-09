from datetime import datetime, timezone, date, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.resume import Resume
from app.models.profile import UserProfile
from app.models.daily_quiz import UserSkillProgress, DailyQuizSession
from app.services.daily_quiz_service import DailyQuizService
from app.schemas.daily_quiz import (
    DailyQuizStatusResponse,
    SubmitDailyQuizRequest,
    DailyQuizResultResponse,
    QuestionResultItem,
)
from app.utils.logger import logger

router = APIRouter()


def _get_or_create_skill_progress(db: Session, user_id: int) -> UserSkillProgress:
    progress = db.query(UserSkillProgress).filter(UserSkillProgress.user_id == user_id).first()
    if not progress:
        progress = UserSkillProgress(
            user_id=user_id,
            current_streak_days=0,
            last_quiz_completed_date=None,
            total_xp=0,
            completed_quizzes_count=0,
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    return progress


def _extract_candidate_skills(db: Session, user_id: int) -> List[str]:
    skills = []
    # Fetch from primary or most recent resume
    resume = (
        db.query(Resume)
        .filter(Resume.user_id == user_id)
        .order_by(Resume.is_primary.desc(), Resume.id.desc())
        .first()
    )
    if resume and resume.parsed_data and isinstance(resume.parsed_data, dict):
        parsed = resume.parsed_data.get("skills", [])
        if isinstance(parsed, list):
            for s in parsed:
                if isinstance(s, str) and s.strip():
                    skills.append(s.strip())
                elif isinstance(s, dict) and "name" in s:
                    skills.append(str(s["name"]).strip())

    # Fetch from user profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if profile and profile.skills and isinstance(profile.skills, list):
        for s in profile.skills:
            if isinstance(s, str) and s.strip():
                skills.append(s.strip())

    # Deduplicate
    seen = set()
    deduped = []
    for s in skills:
        s_clean = s.strip()
        s_lower = s_clean.lower()
        if s_lower not in seen and len(s_clean) > 1:
            seen.add(s_lower)
            deduped.append(s_clean)

    if not deduped:
        deduped = ["FastAPI", "React", "Python", "SQL", "Docker"]
    return deduped


@router.get("/today", response_model=DailyQuizStatusResponse)
def get_today_quiz(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch or generate today's 5-question micro-drill session and candidate streak info.
    """
    today_date = date.today()
    progress = _get_or_create_skill_progress(db, current_user.id)

    # Check streak status: if missed yesterday, streak resets to 0 display
    effective_streak = progress.current_streak_days
    if progress.last_quiz_completed_date:
        days_diff = (today_date - progress.last_quiz_completed_date).days
        if days_diff > 1 and progress.last_quiz_completed_date != today_date:
            effective_streak = 0

    # Look for existing session for today
    session = (
        db.query(DailyQuizSession)
        .filter(DailyQuizSession.user_id == current_user.id, DailyQuizSession.quiz_date == today_date)
        .first()
    )

    if not session:
        # Generate fresh questions via Gemini Pro
        skills = _extract_candidate_skills(db, current_user.id)
        questions = DailyQuizService.generate_daily_micro_quiz(skills)

        session = DailyQuizSession(
            user_id=current_user.id,
            quiz_date=today_date,
            questions_payload=questions,
            candidate_answers=[],
            score_achieved=None,
            xp_earned=0,
            is_completed=False,
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # If completed, return full review with explanations and user selections
    if session.is_completed:
        raw_questions = session.questions_payload or []
        candidate_ans = session.candidate_answers or []
        review_questions = []

        for i, q in enumerate(raw_questions):
            c_idx = candidate_ans[i] if i < len(candidate_ans) else None
            correct_idx = q.get("correct_option_index", 0)
            is_c = c_idx == correct_idx

            review_questions.append({
                "id": q.get("id", i + 1),
                "skill": q.get("skill", "General"),
                "question": q.get("question", ""),
                "options": q.get("options", []),
                "correct_option_index": correct_idx,
                "candidate_option_index": c_idx,
                "is_correct": is_c,
                "concise_explanation": q.get("concise_explanation", ""),
            })

        return DailyQuizStatusResponse(
            session_id=session.id,
            quiz_date=str(session.quiz_date),
            is_completed=True,
            current_streak_days=effective_streak,
            total_xp=progress.total_xp,
            completed_quizzes_count=progress.completed_quizzes_count,
            score_achieved=session.score_achieved,
            xp_earned=session.xp_earned,
            questions=review_questions,
        )

    # If not completed, return sanitized questions without exposing correct options
    sanitized_questions = []
    for q in (session.questions_payload or []):
        sanitized_questions.append({
            "id": q.get("id"),
            "skill": q.get("skill", "Software Engineering"),
            "question": q.get("question"),
            "options": q.get("options", []),
        })

    return DailyQuizStatusResponse(
        session_id=session.id,
        quiz_date=str(session.quiz_date),
        is_completed=False,
        current_streak_days=effective_streak,
        total_xp=progress.total_xp,
        completed_quizzes_count=progress.completed_quizzes_count,
        score_achieved=None,
        xp_earned=0,
        questions=sanitized_questions,
    )


@router.post("/submit", response_model=DailyQuizResultResponse)
def submit_today_quiz(
    payload: SubmitDailyQuizRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Grade candidate answers, award XP (+10 per correct), update daily streak, and return explanations.
    """
    today_date = date.today()
    session = (
        db.query(DailyQuizSession)
        .filter(DailyQuizSession.id == payload.session_id, DailyQuizSession.user_id == current_user.id)
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily quiz session not found or does not belong to you.",
        )

    progress = _get_or_create_skill_progress(db, current_user.id)
    questions = session.questions_payload or []
    answers = payload.answers or []

    # If already completed, return existing graded results
    if session.is_completed:
        results = []
        for i, q in enumerate(questions):
            c_idx = (session.candidate_answers or [])[i] if i < len(session.candidate_answers or []) else None
            correct_idx = q.get("correct_option_index", 0)
            results.append(
                QuestionResultItem(
                    id=q.get("id", i + 1),
                    skill=q.get("skill", ""),
                    question=q.get("question", ""),
                    options=q.get("options", []),
                    correct_option_index=correct_idx,
                    candidate_option_index=c_idx,
                    is_correct=c_idx == correct_idx,
                    concise_explanation=q.get("concise_explanation", ""),
                )
            )

        return DailyQuizResultResponse(
            session_id=session.id,
            score_achieved=session.score_achieved or 0,
            total_questions=len(questions),
            xp_earned=session.xp_earned,
            current_streak_days=progress.current_streak_days,
            total_xp=progress.total_xp,
            streak_maintained=True,
            results=results,
        )

    # Grade the newly submitted answers
    score_achieved = 0
    results = []
    for i, q in enumerate(questions):
        c_idx = answers[i] if i < len(answers) else None
        correct_idx = q.get("correct_option_index", 0)
        is_c = (c_idx == correct_idx)
        if is_c:
            score_achieved += 1

        results.append(
            QuestionResultItem(
                id=q.get("id", i + 1),
                skill=q.get("skill", ""),
                question=q.get("question", ""),
                options=q.get("options", []),
                correct_option_index=correct_idx,
                candidate_option_index=c_idx,
                is_correct=is_c,
                concise_explanation=q.get("concise_explanation", ""),
            )
        )

    xp_earned = score_achieved * 10

    # Calculate and update streak
    yesterday_date = today_date - timedelta(days=1)
    if progress.last_quiz_completed_date == yesterday_date:
        progress.current_streak_days += 1
    elif progress.last_quiz_completed_date == today_date:
        # Already completed today
        pass
    else:
        # Missed days or first quiz
        progress.current_streak_days = 1

    progress.last_quiz_completed_date = today_date
    progress.total_xp += xp_earned
    progress.completed_quizzes_count += 1
    progress.updated_at = datetime.now(timezone.utc)

    # Update session
    session.candidate_answers = answers
    session.score_achieved = score_achieved
    session.xp_earned = xp_earned
    session.is_completed = True
    session.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(session)
    db.refresh(progress)

    logger.info(
        f"User #{current_user.id} finished daily quiz: {score_achieved}/{len(questions)} score, "
        f"+{xp_earned} XP, streak {progress.current_streak_days} days"
    )

    return DailyQuizResultResponse(
        session_id=session.id,
        score_achieved=score_achieved,
        total_questions=len(questions),
        xp_earned=xp_earned,
        current_streak_days=progress.current_streak_days,
        total_xp=progress.total_xp,
        streak_maintained=True,
        results=results,
    )
