from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.resume import Resume
from app.services.gemini_service import GeminiService

router = APIRouter()


class GenerateQuestionsRequest(BaseModel):
    job_title: str = Field(..., description="Target job title or domain (e.g. Senior Backend Engineer)")
    experience_level: Optional[str] = Field("MID", description="Seniority level (ENTRY, MID, SENIOR, LEAD)")
    skills: Optional[List[str]] = Field(default=[], description="Key tech stack competencies to test")
    count: Optional[int] = Field(3, ge=1, le=10, description="Number of questions to generate")
    use_my_resume: Optional[bool] = Field(False, description="Whether to automatically incorporate candidate's primary resume skills")


class EvaluateAnswerRequest(BaseModel):
    job_title: str = Field(..., description="Target job role")
    question: str = Field(..., description="The interview question presented")
    expected_concepts: Optional[List[str]] = Field(default=[], description="Expected technical concepts")
    candidate_answer: str = Field(..., min_length=5, description="Candidate's typed answer")


class GenerateRoadmapRequest(BaseModel):
    target_role: str = Field(..., description="Desired target position or job title")
    current_skills: Optional[List[str]] = Field(default=[], description="Skills already mastered")
    missing_skills: Optional[List[str]] = Field(default=[], description="Skills desired to learn")


@router.post("/generate-questions")
def generate_interview_questions(
    request: GenerateQuestionsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate tailored technical interview questions based on candidate role,
    experience level, and optional resume skills.
    """
    skills = list(request.skills or [])

    if request.use_my_resume:
        primary_resume = (
            db.query(Resume)
            .filter(Resume.user_id == current_user.id, Resume.is_primary == True)
            .first()
        )
        if primary_resume:
            resume_skills = (primary_resume.parsed_data or {}).get("skills", [])
            skills = list(set(skills + resume_skills))

    questions = GeminiService.generate_interview_questions(
        job_title=request.job_title,
        experience_level=request.experience_level,
        skills=skills,
        count=request.count,
    )

    return {
        "job_title": request.job_title,
        "experience_level": request.experience_level,
        "skills_tested": skills,
        "questions": questions,
    }


@router.post("/evaluate-answer")
def evaluate_interview_answer(
    request: EvaluateAnswerRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Evaluate a candidate's answer to an interview question using Gemini AI.
    Returns technical score (0-100), feedback, missed concepts, and gold-standard model response.
    """
    evaluation = GeminiService.evaluate_interview_answer(
        question=request.question,
        expected_concepts=request.expected_concepts or [],
        candidate_answer=request.candidate_answer,
        job_title=request.job_title,
    )
    return evaluation


@router.post("/roadmap")
def generate_career_roadmap(
    request: GenerateRoadmapRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate an AI skill-gap upskilling roadmap with learning phases, course recommendations,
    and portfolio project ideas for any target job.
    """
    current_skills = list(request.current_skills or [])
    if not current_skills:
        primary_resume = (
            db.query(Resume)
            .filter(Resume.user_id == current_user.id, Resume.is_primary == True)
            .first()
        )
        if primary_resume:
            current_skills = (primary_resume.parsed_data or {}).get("skills", [])

    roadmap = GeminiService.generate_skill_roadmap(
        current_skills=current_skills,
        target_role=request.target_role,
        missing_skills=request.missing_skills or [],
    )
    return roadmap
