import re
from typing import List, Dict, Any, Optional
from app.services.parser import ResumeParserService
from app.utils.constants import SKILL_LEARNING_RECOMMENDATIONS
from app.utils.logger import logger


class JobMatchService:
    """
    Advanced ATS Matching Engine:
    - Multi-factor compatibility scoring (Skill overlap + Keyword semantic density + Experience alignment)
    - Skill Gap Detection (Identifies missing competencies)
    - Actionable resume optimization advice and curated learning pathways
    """

    @classmethod
    def extract_skills_from_jd(cls, jd_text: str) -> List[str]:
        """Extracts required competencies directly from a raw job description."""
        return ResumeParserService.extract_skills(jd_text)

    @classmethod
    def calculate_ats_match(
        cls,
        resume_skills: List[str],
        resume_text: str,
        resume_experience_years: float,
        required_skills: List[str],
        jd_text: str = "",
        expected_experience_level: str = "MID",
    ) -> Dict[str, Any]:
        """
        Calculates holistic ATS Match Score (0 - 100%) against a Job Description.
        """
        # If required skills list is empty, extract from JD text directly
        if not required_skills and jd_text:
            required_skills = cls.extract_skills_from_jd(jd_text)

        # Normalize skills for uniform set operations
        resume_set = {s.lower().strip() for s in resume_skills}
        required_set = {s.lower().strip() for s in required_skills}

        if not required_set:
            return {
                "ats_score": 95.0,
                "matched_skills": resume_skills,
                "missing_skills": [],
                "match_level": "High Match",
                "suggestions": ["Job has no strict mandatory skill requirements."],
                "learning_recommendations": [],
            }

        # 1. Skill Match (40% Weight)
        matched_set = resume_set.intersection(required_set)
        missing_set = required_set.difference(resume_set)

        skill_ratio = len(matched_set) / max(len(required_set), 1)
        skill_score = skill_ratio * 40.0

        # 2. Experience & Title Alignment (30% Weight)
        exp_target_map = {
            "ENTRY": 1.0,
            "MID": 3.0,
            "SENIOR": 5.0,
            "LEAD": 8.0,
        }
        min_target = exp_target_map.get(expected_experience_level.upper(), 2.0)
        if resume_experience_years >= min_target:
            exp_duration_pts = 18.0
        else:
            exp_duration_pts = max(4.0, (resume_experience_years / max(min_target, 1.0)) * 18.0)

        # Title alignment in JD text
        title_pts = 12.0 if any(s in resume_text.lower() for s in ["engineer", "developer", "architect", "lead", "manager"]) else 8.0
        experience_score = exp_duration_pts + title_pts

        # 3. Education & Qualifications (20% Weight)
        education_pts = 20.0 if re.search(r"\b(?:bachelor|master|ph\.?d|b\.?sc|b\.?e|diploma)\b", resume_text.lower()) else 12.0

        # 4. Formatting / Structural Completeness (10% Weight)
        word_count = len(resume_text.split())
        format_pts = 10.0 if word_count >= 150 else 6.0

        # Deterministic Composite ATS Score
        final_score = round(skill_score + experience_score + education_pts + format_pts, 1)
        final_score = min(max(final_score, 15.0), 100.0)

        is_shortlisted = final_score >= 75.0
        shortlist_status = "Shortlisted / Recommended" if is_shortlisted else "Filtered / Under Review"

        # Format matched & missing lists
        matched_skills_formatted = [s.title() if len(s) > 3 else s.upper() for s in matched_set]
        missing_skills_formatted = [s.title() if len(s) > 3 else s.upper() for s in missing_set]

        # Generate Actionable Tailoring Advice
        suggestions = []
        if missing_skills_formatted:
            missing_preview = ", ".join(missing_skills_formatted[:4])
            suggestions.append(
                f"Incorporate missing core technologies into your work experience or project bullets: {missing_preview}."
            )
        if resume_experience_years < min_target:
            suggestions.append(
                f"Position expects ~{min_target}+ years of experience; highlight relevant contract, freelance, or open-source projects."
            )
        if final_score >= 75.0:
            suggestions.append("Strong profile alignment! Automatically tagged as Shortlisted / Recommended for recruiter review.")

        # Curated Learning Bridge Recommendations
        learning_paths = []
        for missing_s in missing_set:
            rec = SKILL_LEARNING_RECOMMENDATIONS.get(missing_s.lower())
            if rec:
                learning_paths.append({
                    "skill": missing_s.title() if len(missing_s) > 3 else missing_s.upper(),
                    "recommendation": rec,
                })

        # Match level descriptor
        if final_score >= 80:
            match_level = "High Match"
        elif final_score >= 60:
            match_level = "Moderate Match"
        else:
            match_level = "Low Match"

        return {
            "ats_score": final_score,
            "match_level": match_level,
            "shortlist_status": shortlist_status,
            "is_shortlisted": is_shortlisted,
            "score_breakdown": {
                "skills_score": round(skill_score, 1),
                "skills_max": 40.0,
                "experience_score": round(experience_score, 1),
                "experience_max": 30.0,
                "education_score": round(education_pts, 1),
                "education_max": 20.0,
                "format_score": round(format_pts, 1),
                "format_max": 10.0,
            },
            "matched_skills": sorted(matched_skills_formatted),
            "missing_skills": sorted(missing_skills_formatted),
            "suggestions": suggestions,
            "learning_recommendations": learning_paths,
        }
