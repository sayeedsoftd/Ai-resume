import json
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types

from app.core.config import settings
from app.utils.logger import logger

GEMINI_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-flash-latest",
]


class FeedbackService:
    """
    Constructive AI Rejection Feedback & Growth Path Generator using Google Gemini Pro.
    Eliminates cold rejection and ghosting by providing unsuccessful candidates with
    empathetic, respectful, and actionable career growth roadmaps.
    """

    _client: Optional[genai.Client] = None

    @classmethod
    def get_client(cls) -> Optional[genai.Client]:
        if cls._client is None and settings.GEMINI_API_KEY:
            try:
                cls._client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client for Feedback Service: {e}")
                return None
        return cls._client

    @classmethod
    def _clean_json_markdown(cls, text: str) -> str:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()

    @classmethod
    def generate_rejection_growth_feedback(
        cls,
        candidate_name: str,
        job_title: str,
        skills_required: Optional[List[str] | str] = None,
        assessment_score: Optional[float] = None,
        score_breakdown: Optional[Dict[str, Any]] = None,
        recruiter_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generates structured, empathetic, and constructive growth feedback via Gemini Pro.
        Returns a dictionary adhering to the roadmap schema.
        """
        candidate_name = candidate_name.strip() if candidate_name else "Candidate"
        job_title = job_title.strip() if job_title else "the requisition"

        # Format skills string
        if isinstance(skills_required, list):
            skills_str = ", ".join(skills_required) if skills_required else "General Technical Skills"
        elif isinstance(skills_required, str):
            skills_str = skills_required if skills_required.strip() else "General Technical Skills"
        else:
            skills_str = "Software Engineering, Problem Solving"

        score_val = round(float(assessment_score), 1) if assessment_score is not None else 65.0
        breakdown_str = json.dumps(score_breakdown) if score_breakdown else "Standard screening assessment evaluated."
        recruiter_context = f"Recruiter internal remarks: {recruiter_notes}" if recruiter_notes else "No specific recruiter notes provided."

        prompt = f"""
You are an empathetic, encouraging technical career mentor and engineering leader.
A candidate named '{candidate_name}' was not selected for '{job_title}'.
Target Skills for the position: {skills_str}
Their pre-screening benchmark score was {score_val}%.
Assessment Score Breakdown / Submissions: {breakdown_str}
{recruiter_context}

Analyze their performance and skill alignment. Provide respectful, motivating, and constructive feedback that helps them bridge their knowledge gap for future interview cycles.
NEVER use harsh, demoralizing, or dismissive language. Emphasize that every assessment is a valuable diagnostic metric.

Return ONLY a strict JSON object with this exact structure:
{{
  "supportive_message": "A warm, respectful 2-3 sentence paragraph thanking them for their effort and acknowledging their foundational competence.",
  "key_strengths_observed": [
    "Specific observed strength 1 (e.g., solid grasp of core principles)",
    "Specific observed strength 2"
  ],
  "critical_growth_areas": [
    "Constructive skill area to refine 1 (e.g., deeper concurrency and indexing)",
    "Constructive skill area to refine 2"
  ],
  "recommended_study_topics": [
    {{
      "topic": "Name of high-impact subject or tool (e.g., Database Indexing & Query Plans)",
      "why": "Clear 1-sentence explanation of why mastering this will boost their competitive edge in future technical screens"
    }},
    {{
      "topic": "Second high-impact subject (e.g., Asynchronous Architecture in FastAPI)",
      "why": "Clear 1-sentence explanation"
    }},
    {{
      "topic": "Third high-impact subject (e.g., Docker Multi-Stage Containerization)",
      "why": "Clear 1-sentence explanation"
    }}
  ],
  "encouragement_quote": "A 1-2 sentence uplifting mentorship note reminding them of their trajectory and encouraging continued growth."
}}
"""

        client = cls.get_client()
        if client:
            config = types.GenerateContentConfig(
                temperature=0.4,
                top_p=0.9,
                response_mime_type="application/json",
            )
            for model_name in GEMINI_MODELS:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=config,
                    )
                    if response and response.text:
                        cleaned = cls._clean_json_markdown(response.text)
                        parsed = json.loads(cleaned)
                        if (
                            isinstance(parsed, dict)
                            and "supportive_message" in parsed
                            and "key_strengths_observed" in parsed
                        ):
                            return cls._normalize_feedback(parsed, candidate_name, job_title, skills_str)
                except Exception as e:
                    logger.warning(f"Gemini model {model_name} failed on growth feedback generation: {e}")

        # Fallback Deterministic Generator
        logger.info("Using intelligent fallback growth feedback generator.")
        return cls._get_fallback_growth_feedback(
            candidate_name=candidate_name,
            job_title=job_title,
            skills_str=skills_str,
            score_val=score_val,
            recruiter_notes=recruiter_notes,
        )

    @classmethod
    def _normalize_feedback(
        cls,
        data: Dict[str, Any],
        candidate_name: str,
        job_title: str,
        skills_str: str,
    ) -> Dict[str, Any]:
        """Validates and ensures all fields adhere strictly to the schema."""
        supportive_msg = data.get(
            "supportive_message",
            f"Thank you for taking the time to apply for {job_title}. While we are moving forward with other applicants whose current experience profile more closely matches this specific position, your engagement and effort were sincerely appreciated.",
        )
        strengths = data.get("key_strengths_observed", [])
        if not strengths or not isinstance(strengths, list):
            strengths = [
                "Demonstrated strong commitment and foundational problem-solving aptitude.",
                "Clear communication and proactive completion of pre-screening exercises.",
            ]

        growth_areas = data.get("critical_growth_areas", [])
        if not growth_areas or not isinstance(growth_areas, list):
            growth_areas = [
                f"Hands-on architectural depth in core stack components ({skills_str}).",
                "Advanced edge-case handling and system optimization under time constraints.",
            ]

        study_topics = data.get("recommended_study_topics", [])
        if not study_topics or not isinstance(study_topics, list):
            study_topics = [
                {
                    "topic": "System Design & Architecture Patterns",
                    "why": "Provides structured mental models to navigate complex engineering tradeoffs in senior interviews.",
                },
                {
                    "topic": "Practical Optimization & Profiling",
                    "why": "Deepens hands-on mastery over bottleneck identification and clean code execution.",
                },
            ]

        quote = data.get(
            "encouragement_quote",
            "Every assessment is a valuable diagnostic on the path to mastery. With focused practice on core technical nuances, your profile will stand out in upcoming interview rounds.",
        )

        return {
            "supportive_message": supportive_msg,
            "key_strengths_observed": strengths,
            "critical_growth_areas": growth_areas,
            "recommended_study_topics": study_topics,
            "encouragement_quote": quote,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    @classmethod
    def _get_fallback_growth_feedback(
        cls,
        candidate_name: str,
        job_title: str,
        skills_str: str,
        score_val: float,
        recruiter_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Deterministic, highly personalized fallback feedback generator."""
        skills_list = [s.strip() for s in skills_str.split(",") if s.strip()]
        primary_skill = skills_list[0] if skills_list else "Software Engineering"
        secondary_skill = skills_list[1] if len(skills_list) > 1 else "Database Systems"

        supportive_msg = (
            f"Thank you, {candidate_name}, for your interest in joining the team as a {job_title}. "
            f"While this specific requisition required deeper hands-on alignment in select specialization areas, "
            f"your foundational preparation and proactive engagement were noteworthy."
        )

        strengths = [
            f"Solid foundational competence in problem analysis and {primary_skill} fundamentals.",
            f"Demonstrated good technical discipline across pre-screening exercises ({round(score_val)}% benchmark achieved).",
            "Strong communication and professional engagement throughout the screening process.",
        ]

        growth_areas = [
            f"Deep-dive performance tuning and production debugging in {secondary_skill}.",
            f"Designing scalable end-to-end architectures tailored for {job_title} responsibilities.",
            "Structuring modular test suites and automated CI/CD containerization pipelines.",
        ]

        study_topics = [
            {
                "topic": f"Advanced {primary_skill} Patterns & Concurrency",
                "why": "Strengthens your ability to handle high-throughput, latency-critical real-world workloads.",
            },
            {
                "topic": "Relational Indexing, Partitioning & Query Execution Plans",
                "why": "Equips you to optimize enterprise data stores and answer complex backend architectural questions.",
            },
            {
                "topic": "Docker Multi-Stage Builds & Production Readiness",
                "why": "Ensures seamless deployment lifecycle management expected by modern engineering organizations.",
            },
        ]

        if recruiter_notes:
            growth_areas.insert(0, f"Recruiter focus note: {recruiter_notes}")

        quote = (
            f"Every assessment is an opportunity to calibrate and accelerate your career trajectory. "
            f"Targeted preparation on {primary_skill} nuances will make your profile formidable in future interviews."
        )

        return {
            "supportive_message": supportive_msg,
            "key_strengths_observed": strengths,
            "critical_growth_areas": growth_areas,
            "recommended_study_topics": study_topics,
            "encouragement_quote": quote,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
