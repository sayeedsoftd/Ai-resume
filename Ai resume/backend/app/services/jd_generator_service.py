import json
import re
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types

from app.core.config import settings
from app.utils.logger import logger
from app.utils.i18n_helper import get_ai_localization_directive

GEMINI_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-flash-latest",
]


class JobDescriptionGeneratorService:
    """
    1-Click AI Job Description Generator & Optimizer using Google Gemini Pro.
    Generates structured, industry-standard, and attractive job descriptions with:
    - Executive Role Summary
    - Key Responsibilities
    - Required Core Technical Skills & Bonus Skills
    - Experience Years and Education
    - Recommended Salary Range in BDT & Company Benefits
    """

    _client: Optional[genai.Client] = None

    @classmethod
    def get_client(cls) -> Optional[genai.Client]:
        if cls._client is None and settings.GEMINI_API_KEY:
            try:
                cls._client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client for JD Generator: {e}")
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
    def generate_job_description(
        cls,
        job_title: str,
        experience_level: str = "MID",
        industry: str = "Software Engineering",
        keywords: Optional[str] = None,
        workplace_type: str = "ON_SITE",
        tone: str = "Professional",
        target_language: Optional[str] = "en",
    ) -> Dict[str, Any]:
        """
        Drafts a comprehensive, modern Job Description via Gemini Pro.
        Returns a structured dictionary matching AIJobDescriptionResponse.
        """
        client = cls.get_client()

        level_name = {
            "ENTRY": "Junior / Entry-Level (0-2 years)",
            "MID": "Mid-Level Professional (2-4 years)",
            "SENIOR": "Senior Specialist (5+ years)",
            "EXECUTIVE": "Lead / Principal / Executive (7+ years)",
        }.get(experience_level.upper(), experience_level)

        prompt = f"""
You are an elite Chief Talent Officer, Technical Recruiter, and AI Job Market Strategist.
Create an industry-leading, highly attractive, and modern Job Requisition Circular for the following position.

POSITION DETAILS:
- Job Title: {job_title}
- Target Experience Level: {level_name} ({experience_level})
- Industry / Sector: {industry or "Technology & Software Engineering"}
- Technical Keywords / Focus Areas: {keywords or "Modern industry tech stack"}
- Workplace Arrangement: {workplace_type} (On-site / Remote / Hybrid)
- Desired Brand Tone: {tone} (e.g. Professional, Inspiring, High-Growth)

INSTRUCTIONS:
Return ONLY a valid JSON object matching this schema exactly (no conversational text, no markdown wrappers):
{{
  "job_title": "{job_title}",
  "role_overview": "A compelling 2-3 sentence executive role summary explaining the mission, team context, and high-level purpose of this role.",
  "responsibilities": [
    "5 to 7 concrete, action-oriented bullet points outlining key responsibilities..."
  ],
  "required_skills": [
    "5 to 8 essential hard skills or technologies required for the role"
  ],
  "bonus_skills": [
    "2 to 4 nice-to-have or competitive advantage skills"
  ],
  "soft_skills": [
    "3 to 4 collaborative, communication, or leadership competencies"
  ],
  "experience_years": 3,
  "recommended_min_salary": 45000,
  "recommended_max_salary": 75000,
  "suggested_benefits": [
    "Two festival bonuses (Eid-ul-Fitr, Eid-ul-Adha / Puja)",
    "Provident fund & gratuity benefits",
    "Comprehensive health & outpatient insurance",
    "Flexible work hours & wellness allowances",
    "Annual paid vacation & certification stipend"
  ],
  "full_formatted_description": "A complete, beautifully formatted markdown document combining Role Overview, Key Responsibilities, Technical Requirements, and Benefits."
}}

SALARY BENCHMARK GUIDANCE (Monthly BDT - Bangladesh Tech Market):
- Entry / Junior: ৳30,000 - ৳50,000
- Mid-Level (2-4 yrs): ৳50,000 - ৳85,000
- Senior (5+ yrs): ৳90,000 - ৳150,000
- Lead / Executive: ৳150,000 - ৳250,000+
Return only positive integers for recommended_min_salary and recommended_max_salary.
""" + get_ai_localization_directive(target_language)

        if client:
            config = types.GenerateContentConfig(
                temperature=0.3,
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
                        if isinstance(parsed, dict) and "role_overview" in parsed and "responsibilities" in parsed:
                            # Ensure all keys are populated cleanly
                            return cls._normalize_result(parsed, job_title, experience_level, keywords)
                except Exception as e:
                    logger.warning(f"Gemini model {model_name} failed on JD generation: {e}")

        # Fallback Deterministic Generator
        logger.info("Using intelligent fallback JD template generator.")
        return cls._get_fallback_jd(
            job_title=job_title,
            experience_level=experience_level,
            industry=industry,
            keywords=keywords,
            workplace_type=workplace_type,
        )

    @classmethod
    def _normalize_result(
        cls,
        data: Dict[str, Any],
        job_title: str,
        experience_level: str,
        keywords: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Ensures all expected schema fields exist with valid types and default fallbacks."""
        role_overview = data.get("role_overview", f"We are seeking a talented {job_title} to join our high-performing team.")
        responsibilities = data.get("responsibilities", [
            f"Design, build, and maintain efficient, reusable, and reliable solutions as a {job_title}.",
            "Collaborate with cross-functional teams to define, design, and ship new features.",
            "Participate in architecture reviews and code audits to maintain high engineering standards.",
            "Identify bottlenecks and devise elegant solutions to complex technical challenges.",
            "Write comprehensive unit and integration tests to guarantee system stability.",
        ])
        req_skills = data.get("required_skills", [])
        if not req_skills and keywords:
            req_skills = [k.strip() for k in keywords.split(",") if k.strip()]
        if not req_skills:
            req_skills = ["Problem Solving", "System Architecture", "Git", "Clean Code"]

        bonus_skills = data.get("bonus_skills", ["Cloud Computing", "Docker", "CI/CD"])
        soft_skills = data.get("soft_skills", ["Strong Communication", "Agile Mindset", "Team Leadership"])

        # Default experience years based on level
        exp_years = data.get("experience_years")
        if exp_years is None or not isinstance(exp_years, int):
            exp_years = {"ENTRY": 1, "MID": 3, "SENIOR": 5, "EXECUTIVE": 7}.get(experience_level.upper(), 3)

        min_sal = float(data.get("recommended_min_salary") or 45000.0)
        max_sal = float(data.get("recommended_max_salary") or (min_sal * 1.5))

        benefits = data.get("suggested_benefits", [
            "Two festival bonuses annually",
            "Provident fund & Gratuity",
            "Comprehensive health insurance coverage",
            "Flexible work arrangements & learning allowances",
        ])

        formatted_desc = data.get("full_formatted_description")
        if not formatted_desc or len(formatted_desc.strip()) < 100:
            formatted_desc = cls._build_markdown_description(
                job_title=job_title,
                role_overview=role_overview,
                responsibilities=responsibilities,
                required_skills=req_skills,
                bonus_skills=bonus_skills,
                soft_skills=soft_skills,
                experience_years=exp_years,
                benefits=benefits,
            )

        return {
            "job_title": job_title,
            "role_overview": role_overview,
            "responsibilities": responsibilities,
            "required_skills": req_skills,
            "bonus_skills": bonus_skills,
            "soft_skills": soft_skills,
            "experience_years": exp_years,
            "recommended_min_salary": min_sal,
            "recommended_max_salary": max_sal,
            "suggested_benefits": benefits,
            "full_formatted_description": formatted_desc,
        }

    @classmethod
    def _build_markdown_description(
        cls,
        job_title: str,
        role_overview: str,
        responsibilities: List[str],
        required_skills: List[str],
        bonus_skills: List[str],
        soft_skills: List[str],
        experience_years: int,
        benefits: List[str],
    ) -> str:
        resp_bullets = "\n".join([f"- {r}" for r in responsibilities])
        req_bullets = "\n".join([f"- {s}" for s in required_skills])
        bonus_bullets = "\n".join([f"- {b}" for b in bonus_skills])
        benefit_bullets = "\n".join([f"- {b}" for b in benefits])

        return f"""### About the Role
{role_overview}

### Key Responsibilities
{resp_bullets}

### Qualifications & Required Skills
- Minimum **{experience_years}+ years** of professional experience in relevant domain.
{req_bullets}

### Nice-to-Have & Bonus Skills
{bonus_bullets}

### Compensation & Benefits
{benefit_bullets}
"""

    @classmethod
    def _get_fallback_jd(
        cls,
        job_title: str,
        experience_level: str,
        industry: str,
        keywords: Optional[str] = None,
        workplace_type: str = "ON_SITE",
    ) -> Dict[str, Any]:
        """Provides an immediate, high-quality job description when offline or testing."""
        kw_list = [k.strip() for k in keywords.split(",")] if keywords else []
        clean_kws = [k for k in kw_list if k]

        exp_years = {"ENTRY": 1, "MID": 3, "SENIOR": 5, "EXECUTIVE": 7}.get(experience_level.upper(), 3)

        salary_ranges = {
            "ENTRY": (35000.0, 50000.0),
            "MID": (55000.0, 85000.0),
            "SENIOR": (95000.0, 150000.0),
            "EXECUTIVE": (160000.0, 240000.0),
        }
        min_sal, max_sal = salary_ranges.get(experience_level.upper(), (50000.0, 80000.0))

        primary_skills = clean_kws if clean_kws else ["System Architecture", "API Integration", "Database Optimization", "Git Workflow"]
        bonus_skills = ["Docker / Containerization", "CI/CD Automation", "Cloud Infrastructure (AWS/GCP)"]

        role_overview = (
            f"We are looking for an experienced and driven {job_title} to spearhead our next phase of product growth. "
            f"In this role, you will collaborate with cross-functional engineering and design teams to build resilient, "
            f"high-impact software solutions with modern best practices."
        )

        responsibilities = [
            f"Architect, develop, and deploy scalable features and microservices as our {job_title}.",
            "Collaborate closely with product managers, designers, and fellow engineers in an agile cadence.",
            "Write robust, test-driven, and well-documented clean code adhering to team standards.",
            "Diagnose, debug, and optimize application performance, query latencies, and system bottlenecks.",
            "Actively participate in architecture discussions, code reviews, and mentor junior colleagues.",
        ]

        benefits = [
            "Two annual festival bonuses (Eid / Puja allowances)",
            "Provident fund & gratuity scheme",
            "Comprehensive health insurance with hospitalization coverage",
            "Flexible working hours and supportive remote/hybrid options",
            "Annual learning stipend for professional certifications and conferences",
        ]

        full_desc = cls._build_markdown_description(
            job_title=job_title,
            role_overview=role_overview,
            responsibilities=responsibilities,
            required_skills=primary_skills,
            bonus_skills=bonus_skills,
            soft_skills=["Clear Communication", "Critical Problem Solving", "Proactive Ownership"],
            experience_years=exp_years,
            benefits=benefits,
        )

        return {
            "job_title": job_title,
            "role_overview": role_overview,
            "responsibilities": responsibilities,
            "required_skills": primary_skills,
            "bonus_skills": bonus_skills,
            "soft_skills": ["Clear Communication", "Critical Problem Solving", "Proactive Ownership"],
            "experience_years": exp_years,
            "recommended_min_salary": min_sal,
            "recommended_max_salary": max_sal,
            "suggested_benefits": benefits,
            "full_formatted_description": full_desc,
        }
