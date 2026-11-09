from datetime import date
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class QuestionPublicItem(BaseModel):
    id: int
    skill: str
    question: str
    options: List[str]


class QuestionResultItem(BaseModel):
    id: int
    skill: str
    question: str
    options: List[str]
    correct_option_index: int
    candidate_option_index: Optional[int] = None
    is_correct: bool
    concise_explanation: str


class DailyQuizStatusResponse(BaseModel):
    session_id: int
    quiz_date: str
    is_completed: bool
    current_streak_days: int
    total_xp: int
    completed_quizzes_count: int
    score_achieved: Optional[int] = None
    xp_earned: int = 0
    questions: List[Dict[str, Any]] = []


class SubmitDailyQuizRequest(BaseModel):
    session_id: int
    answers: List[int] = Field(..., description="List of chosen option indices (0-3) for questions 1 to 5")


class DailyQuizResultResponse(BaseModel):
    session_id: int
    score_achieved: int
    total_questions: int = 5
    xp_earned: int
    current_streak_days: int
    total_xp: int
    streak_maintained: bool
    results: List[QuestionResultItem]
