import json
import re
from typing import Dict, Any, List, Optional
from app.services.gemini_service import GeminiService
from app.utils.logger import logger


class ResumeGapAnalyzer:
    """
    Real-Time AI Resume Gap Analyzer & Optimization Recommender.
    Compares candidate resume text and structured entities against target Job Description requirements,
    identifying hard/soft skill voids, experience alignment, project tweaks, and bullet rewrites.
    """

    @classmethod
    def analyze_resume_gap(
        cls,
        candidate_profile: Dict[str, Any],
        resume_text: str,
        job_title: str,
        job_description: str,
        required_skills: List[str],
        min_experience_years: float = 2.0,
    ) -> Dict[str, Any]:
        """
        Executes Gemini AI gap analysis with strict structured output and resilient fallback.
        """
        prompt = cls._build_gap_analysis_prompt(
            candidate_profile=candidate_profile,
            resume_text=resume_text,
            job_title=job_title,
            job_description=job_description,
            required_skills=required_skills,
            min_experience_years=min_experience_years,
        )

        try:
            raw_response = GeminiService._generate_with_fallback(prompt, is_json=True)
            if raw_response:
                clean_json = GeminiService._clean_json_response(raw_response)
                data = json.loads(clean_json)
                if cls._validate_gap_response(data):
                    logger.info("Successfully executed Gemini AI real-time resume gap analysis.")
                    return cls._format_success_response(data, candidate_profile, required_skills)
        except Exception as e:
            logger.warning(f"Gemini API gap analysis failed or timed out: {e}. Falling back to deterministic gap engine.")

        # Resilient fallback engine
        return cls._fallback_gap_analysis(
            candidate_profile=candidate_profile,
            resume_text=resume_text,
            job_title=job_title,
            job_description=job_description,
            required_skills=required_skills,
            min_experience_years=min_experience_years,
        )

    @classmethod
    def _build_gap_analysis_prompt(
        cls,
        candidate_profile: Dict[str, Any],
        resume_text: str,
        job_title: str,
        job_description: str,
        required_skills: List[str],
        min_experience_years: float,
    ) -> str:
        cand_skills = candidate_profile.get("skills", [])
        cand_exp = candidate_profile.get("experience_years", 1.0)
        
        # Extract sample sentences or bullet points from resume text
        snippet_lines = [
            line.strip() for line in resume_text.split("\n")
            if len(line.strip()) > 25 and not line.strip().startswith("http")
        ][:12]
        sample_bullets = "\n".join(f"- {line}" for line in snippet_lines) if snippet_lines else "None provided"

        return f"""You are a Principal Technical Recruiter and ATS Optimization Architect.
Perform a deep, critical gap analysis comparing the candidate's resume against the target job requirements.
Identify what is missing, quantify the gap, and formulate high-impact bullet rewrites to maximize the candidate's ATS match score.

### Target Job Requisition:
- Title: {job_title}
- Required Experience: {min_experience_years}+ years
- Stated Required Skills: {", ".join(required_skills) if required_skills else "Extract from description"}
- Job Description:
\"\"\"
{job_description[:3000]}
\"\"\"

### Candidate Current Profile:
- Known Candidate Skills: {", ".join(cand_skills) if cand_skills else "Extract from text"}
- Recorded Experience: ~{cand_exp} years
- Sample Resume Content & Bullets:
\"\"\"
{sample_bullets}
\"\"\"
- Resume Excerpt:
\"\"\"
{resume_text[:2500]}
\"\"\"

### Strict Requirements:
Return a valid, single JSON object adhering EXACTLY to this schema (do NOT return markdown fences):
{{
  "match_score": <integer from 0 to 100 representing current ATS match percentage>,
  "missing_hard_skills": [
    "<specific technical tool, language, or system requirement in JD not clearly evident in resume>"
  ],
  "missing_soft_skills": [
    "<collaborative, leadership, agile, or communication trait expected in JD>"
  ],
  "experience_gap": "<1-2 concise sentences comparing candidate's experience years and domain seniority against the job requirements>",
  "project_recommendations": [
    "<actionable instruction on what metrics, architectural choices, or tools to incorporate into their project descriptions>"
  ],
  "bullet_point_rewrites": [
    {{
      "original": "<a real or realistic bullet point / responsibility from the candidate's experience>",
      "optimized": "<AI-enhanced version with strong action verb, technologies mentioned, and measurable impact/metrics>"
    }}
  ],
  "projected_score_boost": "<e.g. '+18%'>",
  "matched_skills": [
    "<skills candidate already has that match the JD>"
  ]
}}
"""

    @classmethod
    def _validate_gap_response(cls, data: Dict[str, Any]) -> bool:
        required_keys = [
            "match_score",
            "missing_hard_skills",
            "missing_soft_skills",
            "experience_gap",
            "project_recommendations",
            "bullet_point_rewrites",
            "projected_score_boost",
        ]
        return all(key in data for key in required_keys) and isinstance(data.get("bullet_point_rewrites"), list)

    @classmethod
    def _format_success_response(
        cls, data: Dict[str, Any], candidate_profile: Dict[str, Any], required_skills: List[str]
    ) -> Dict[str, Any]:
        match_score = int(data.get("match_score", 65))
        match_score = max(5, min(98, match_score))

        projected_boost = str(data.get("projected_score_boost", ""))
        if not projected_boost.startswith("+"):
            potential_gain = min(30, max(12, 95 - match_score))
            projected_boost = f"+{potential_gain}%"

        # Ensure bullet rewrites has clean structure
        rewrites = []
        for item in data.get("bullet_point_rewrites", []):
            if isinstance(item, dict) and "original" in item and "optimized" in item:
                rewrites.append({
                    "original": str(item["original"]).strip(),
                    "optimized": str(item["optimized"]).strip(),
                })

        return {
            "match_score": match_score,
            "missing_hard_skills": [str(s).strip() for s in data.get("missing_hard_skills", []) if s][:8],
            "missing_soft_skills": [str(s).strip() for s in data.get("missing_soft_skills", []) if s][:6],
            "experience_gap": str(data.get("experience_gap", "Experience aligns moderately with target role requirements.")).strip(),
            "project_recommendations": [str(r).strip() for r in data.get("project_recommendations", []) if r][:5],
            "bullet_point_rewrites": rewrites[:4],
            "projected_score_boost": projected_boost,
            "matched_skills": [str(s).strip() for s in data.get("matched_skills", []) if s][:10],
        }

    @classmethod
    def _fallback_gap_analysis(
        cls,
        candidate_profile: Dict[str, Any],
        resume_text: str,
        job_title: str,
        job_description: str,
        required_skills: List[str],
        min_experience_years: float,
    ) -> Dict[str, Any]:
        """
        Deterministic, rule-based fallback when Gemini API is unavailable or non-responsive.
        """
        cand_skills = set(s.strip().lower() for s in candidate_profile.get("skills", []) if s)
        resume_lower = resume_text.lower()
        
        # If no candidate skills parsed, extract from text
        common_tech = [
            "python", "fastapi", "django", "flask", "react", "node.js", "javascript", "typescript",
            "docker", "kubernetes", "aws", "gcp", "azure", "sql", "postgresql", "mysql", "mongodb",
            "redis", "graphql", "rest api", "ci/cd", "git", "linux", "html", "css", "tailwind"
        ]
        for t in common_tech:
            if re.search(r"\b" + re.escape(t) + r"\b", resume_lower):
                cand_skills.add(t)

        # Parse JD skills
        jd_skills_target = [s.strip() for s in required_skills if s.strip()]
        if not jd_skills_target:
            # Extract common tech from JD
            for t in common_tech:
                if re.search(r"\b" + re.escape(t) + r"\b", job_description.lower()):
                    jd_skills_target.append(t.title())

        matched_skills = []
        missing_hard_skills = []

        for req in jd_skills_target:
            req_clean = req.strip()
            if req_clean.lower() in cand_skills or re.search(r"\b" + re.escape(req_clean.lower()) + r"\b", resume_lower):
                matched_skills.append(req_clean)
            else:
                missing_hard_skills.append(req_clean)

        total_req = max(1, len(jd_skills_target))
        skill_ratio = len(matched_skills) / total_req
        match_score = int(round(35 + (skill_ratio * 45)))
        match_score = max(35, min(92, match_score))

        potential_boost = min(28, max(14, 94 - match_score))
        projected_score_boost = f"+{potential_boost}%"

        # Missing soft skills
        common_soft = [
            "Agile / Scrum Delivery",
            "Cross-functional Collaboration",
            "System Architecture & Documentation",
            "Stakeholder Communication",
            "Code Review & Quality Mentorship"
        ]
        missing_soft_skills = common_soft[:3]

        # Experience gap
        cand_exp = float(candidate_profile.get("experience_years", 1.5))
        if cand_exp < min_experience_years:
            diff = round(min_experience_years - cand_exp, 1)
            exp_gap = f"Target role requires {min_experience_years}+ years of experience; your resume reflects ~{cand_exp} years (Gap: ~{diff} years)."
        else:
            exp_gap = f"Experience seniority matches expectations ({cand_exp} yrs vs {min_experience_years}+ yrs requested). Focus on highlighting domain-specific system scale."

        # Project recommendations based on missing hard skills
        recs = []
        if missing_hard_skills:
            top_missing = missing_hard_skills[:2]
            recs.append(f"Incorporate hands-on implementation details using {', '.join(top_missing)} into your featured projects.")
        recs.append("Quantify your achievements with concrete metrics (e.g., 'reduced API response time by 30%', 'scaled throughput to 10k RPS').")
        recs.append("Detail your CI/CD, unit testing, and container deployment workflow in your most recent employment section.")

        # Bullet point rewrites
        bullet_rewrites = [
            {
                "original": "Worked on backend APIs and bug fixing using modern web frameworks.",
                "optimized": f"Architected high-availability RESTful microservices for {job_title}, reducing response latency by 28% and ensuring 99.9% uptime."
            },
            {
                "original": "Helped manage database queries and application data storage.",
                "optimized": "Optimized complex relational SQL queries and introduced Redis caching, boosting database query throughput by 35%."
            }
        ]

        if missing_hard_skills:
            primary_missing = missing_hard_skills[0]
            bullet_rewrites.append({
                "original": "Deployed application updates and worked with server environment.",
                "optimized": f"Containerized full-stack services using {primary_missing} and orchestrated zero-downtime deployment pipelines."
            })

        return {
            "match_score": match_score,
            "missing_hard_skills": missing_hard_skills[:6] if missing_hard_skills else ["Docker Containerization", "Redis Caching", "Cloud Infrastructure (AWS/GCP)"],
            "missing_soft_skills": missing_soft_skills,
            "experience_gap": exp_gap,
            "project_recommendations": recs,
            "bullet_point_rewrites": bullet_rewrites,
            "projected_score_boost": projected_score_boost,
            "matched_skills": matched_skills[:8],
        }
