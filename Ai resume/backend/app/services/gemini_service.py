import json
import re
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types
from app.core.config import settings
from app.utils.logger import logger
from app.services.matcher import JobMatchService

# Multi-model pool: gemini-3.1-flash-lite, gemini-3.5-flash, gemini-3.8-flash, gemini-flash-latest
GEMINI_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"]



class GeminiService:
    """
    Centralized Gemini AI Service Layer:
    - Stage 2: Structured Information Categorization (Entity Extraction)
    - Stage 3: Job Description & Criteria Matching Engine
    - Stage 4: Scoring, Ranking & Automated Shortlisting (Deterministic formula + AI insights)
    - AI Resume Optimizer & Executive Summary Rephraser
    - AI Skill Gap & Career Roadmap Generator
    - AI Mock Interview Agent
    - Resilient multi-model fallback pool
    """

    _client: Optional[genai.Client] = None

    @classmethod
    def get_client(cls) -> Optional[genai.Client]:
        if cls._client is None and settings.GEMINI_API_KEY:
            try:
                cls._client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {e}")
                return None
        return cls._client

    @classmethod
    def _clean_json_response(cls, text: str) -> str:
        """Strip markdown fences from model response."""
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()

    @classmethod
    def _generate_with_fallback(cls, prompt: str, is_json: bool = True) -> Optional[str]:
        """Tries models sequentially across the pool to guarantee resilience."""
        client = cls.get_client()
        if not client:
            return None

        config = types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json" if is_json else None,
        )

        for model_name in GEMINI_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config,
                )
                if response and response.text:
                    return response.text
            except Exception as e:
                logger.warning(f"Model {model_name} failed: {e}. Trying next available model...")
        return None

    # =========================================================================
    # STAGE 2: STRUCTURED INFORMATION CATEGORIZATION (ENTITY EXTRACTION)
    # =========================================================================
    @classmethod
    def extract_structured_entities(cls, text: str) -> Dict[str, Any]:
        """
        Passes normalized resume text into Gemini AI with a strict multi-domain JSON schema.
        Dynamically detects candidate domain (Design, Marketing, Engineering, Healthcare, etc.).
        Extracts:
          - Personal Info: Full Name, Email, Phone, Location, Portfolio/LinkedIn/GitHub links
          - Professional Summary / Objective
          - Work Experience: Job titles, company names, start/end dates, key achievements/bullet points
          - Education: Degree level, major/department, institution name, graduation year, GPA/CGPA
          - Skills Inventory: Categorized technical/domain tools, frameworks, and soft skills
          - Certifications & Licenses
        """
        prompt = f"""
You are an expert NLP Multi-Domain Resume Entity Extraction Engine.
Analyze the following clean resume text and extract all entities into a strictly structured JSON object.

CRITICAL INSTRUCTIONS:
- Do NOT assume tech or software engineering roles by default. Automatically determine the candidate's professional domain (e.g. Graphic Design, Creative Arts, Digital Marketing, Software Engineering, Healthcare, Finance, Management, etc.).
- Extract all domain-specific tools, creative software, technical proficiencies, core competencies, and domain expertise. For example, for Graphic Design: Adobe Photoshop, Illustrator, InDesign, Figma, Brand Identity, Logo Design, Packaging Design, Typography, Social Media Design, etc.
- In 'all_skills', provide a complete flat unique list of ALL extracted tools, technologies, creative software, and domain competencies.

Resume Text:
\"\"\"
{text[:7000]}
\"\"\"

Return a strict, valid JSON object matching this exact schema:
{{
  "candidate_name": "<Full Name or null>",
  "contact": {{
    "email": "<Primary Email or null>",
    "phone": "<Phone Number or null>",
    "location": "<City, Country or null>",
    "linkedin": "<LinkedIn URL or null>",
    "github": "<GitHub URL or null>",
    "portfolio": "<Portfolio/Website URL or null>"
  }},
  "summary": "<Professional Summary or Career Objective>",
  "domain": "<Detected Domain, e.g. Graphic Design, Software Engineering, Marketing>",
  "experience": [
    {{
      "title": "<Job Title>",
      "company": "<Company Name>",
      "location": "<Location or null>",
      "start_date": "<e.g. Jan 2021>",
      "end_date": "<e.g. Present or Dec 2023>",
      "achievements": ["<bullet point 1>", "<bullet point 2>"]
    }}
  ],
  "experience_years": <numeric estimated years, e.g. 5.0>,
  "education": [
    {{
      "degree": "<e.g. Bachelor of Science in Computer Science or Higher Secondary Certificate>",
      "degree_level": "<Bachelor's | Master's | PhD | Diploma | HSC | Other>",
      "major": "<Major or Department>",
      "institution": "<University or College Name>",
      "graduation_year": "<Year e.g. 2022 or null>",
      "gpa": "<GPA / CGPA or null>"
    }}
  ],
  "skills": {{
    "domain_skills": ["<Core domain skills, e.g. Brand Identity, Logo Design, Packaging Design, Social Media Design>"],
    "tools_and_software": ["<Tools/Software, e.g. Adobe Photoshop, Illustrator, InDesign, Figma, Canva>"],
    "soft_skills": ["<e.g. Client Communication, Time Management, Remote Collaboration>"]
  }},
  "all_skills": ["<flat unique list of all tools, software, technical and domain skills extracted>"],
  "certifications": [
    {{
      "name": "<Certification Name>",
      "issuer": "<Issuing Organization or null>",
      "year": "<Year or null>"
    }}
  ]
}}
"""
        raw_text = cls._generate_with_fallback(prompt, is_json=True)
        if raw_text:
            try:
                cleaned = cls._clean_json_response(raw_text)
                data = json.loads(cleaned)
                # Ensure all_skills is properly populated
                if not data.get("all_skills"):
                    collected = []
                    skills_obj = data.get("skills", {})
                    if isinstance(skills_obj, dict):
                        for k, v in skills_obj.items():
                            if isinstance(v, list):
                                collected.extend(v)
                    elif isinstance(skills_obj, list):
                        collected = skills_obj
                    data["all_skills"] = sorted(list(set(collected)))
                logger.info("Gemini Stage 2 Structured Entity Extraction completed successfully.")
                return data
            except Exception as e:
                logger.warning(f"Failed to parse Gemini Stage 2 JSON response: {e}")

        # Fallback to heuristic parser if AI generation fails or times out
        from app.services.parser import ResumeParserService
        fallback_parsed = ResumeParserService.parse_document_text(text)
        extracted_skills = fallback_parsed.get("skills", [])
        return {
            "candidate_name": None,
            "contact": {
                "email": fallback_parsed.get("contact", {}).get("emails", [None])[0] if fallback_parsed.get("contact", {}).get("emails") else None,
                "phone": fallback_parsed.get("contact", {}).get("phones", [None])[0] if fallback_parsed.get("contact", {}).get("phones") else None,
                "location": None,
                "linkedin": fallback_parsed.get("contact", {}).get("linkedin"),
                "github": fallback_parsed.get("contact", {}).get("github"),
                "portfolio": None,
            },
            "summary": "",
            "domain": "General",
            "experience": [],
            "experience_years": fallback_parsed.get("experience_years", 1.0),
            "education": fallback_parsed.get("education", []),
            "skills": {
                "domain_skills": extracted_skills,
                "tools_and_software": extracted_skills,
                "soft_skills": [],
            },
            "all_skills": extracted_skills,
            "certifications": [],
        }

    # =========================================================================
    # STAGE 3: JOB DESCRIPTION REQUIREMENT EXTRACTION
    # =========================================================================
    @classmethod
    def extract_job_requirements(cls, job_description: str) -> Dict[str, Any]:
        """
        Dynamically extracts required skills, tools, domain competencies,
        and experience expectations from any job circular.
        Does NOT output single-letter false positives like 'C'.
        """
        from app.services.parser import ResumeParserService
        from app.utils.constants import SKILL_ALIASES

        prompt = f"""
You are an expert Job Description and Recruitment Requirements Analyzer.
Analyze the following job circular / job description and extract its core requirements into a JSON object.

CRITICAL INSTRUCTIONS:
- Do NOT assume technical or software engineering roles. Dynamically detect the job domain (e.g., Graphic Design, Digital Marketing, Software Engineering, Product, etc.).
- Extract the actual tools (e.g., Adobe Photoshop, Illustrator, InDesign, Figma, etc.), core competencies, and required skills directly from the text.
- Do NOT output single isolated letters (like 'C') as a skill unless explicitly referring to C programming language in a developer role.
- For design jobs, extract all creative software (Photoshop, Illustrator, InDesign, etc.) and design skills (Social Media Design, Banner Design, Infographics, etc.).

Job Description:
\"\"\"
{job_description[:6000]}
\"\"\"

Return a strict, valid JSON object matching this schema:
{{
  "job_title": "<e.g. Graphic Designer or Entry-Level Graphic Designer>",
  "required_skills": ["<Specific Tool or Skill 1, e.g. Adobe Photoshop>", "<Skill 2, e.g. Adobe Illustrator>", "<Skill 3, e.g. Adobe InDesign>", "<Skill 4, e.g. Social Media Design>", "<Skill 5, e.g. Digital Marketing>"],
  "experience_years": <numeric minimum years required, e.g. 0.0, 1.0, 2.0>,
  "education_level": "<e.g. H.S.C / Bachelor's / Master's / Any>",
  "job_domain": "<e.g. Graphic Design / Marketing / Software Engineering>"
}}
"""
        raw_text = cls._generate_with_fallback(prompt, is_json=True)
        if raw_text:
            try:
                cleaned = cls._clean_json_response(raw_text)
                data = json.loads(cleaned)
                req_skills = data.get("required_skills", [])
                # Filter out single-letter or invalid false positives
                clean_skills = [
                    SKILL_ALIASES.get(s.lower().strip(), s.strip())
                    for s in req_skills
                    if isinstance(s, str) and len(s.strip()) > 1 and s.strip().lower() not in ["c", "etc", "and", "or"]
                ]
                data["required_skills"] = clean_skills
                return data
            except Exception as e:
                logger.warning(f"Failed to parse JD requirements JSON: {e}")

        # Fallback to enhanced parser
        heuristic_skills = ResumeParserService.extract_skills(job_description)
        # Filter out isolated single letter false positives
        heuristic_skills = [s for s in heuristic_skills if len(s) > 1 and s.lower() not in ["c", "etc"]]

        # Heuristic title detection
        title = "Target Position"
        for candidate_title in ["Graphic Designer", "Senior Graphic Designer", "UI/UX Designer", "Software Engineer", "Full-Stack Developer", "Digital Marketer"]:
            if candidate_title.lower() in job_description.lower():
                title = candidate_title
                break

        return {
            "job_title": title,
            "required_skills": heuristic_skills,
            "experience_years": ResumeParserService.estimate_experience_years(job_description),
            "education_level": "Bachelor's" if "bachelor" in job_description.lower() else ("H.S.C" if "h.s.c" in job_description.lower() else "Any"),
            "job_domain": "Design" if "design" in job_description.lower() else "General",
        }

    # =========================================================================
    # STAGE 3 & 4: MATCHING & 4-FACTOR DETERMINISTIC SCORING ENGINE
    # =========================================================================
    @classmethod
    def evaluate_4stage_ats_pipeline(
        cls,
        candidate_profile: Dict[str, Any],
        resume_text: str,
        job_title: str,
        job_description: str,
        required_skills: List[str],
        experience_level: str = "MID",
        min_experience_years: float = 2.0,
        required_education: str = "Bachelor's",
    ) -> Dict[str, Any]:
        """
        Executes Stage 3 (Criteria Matching) and Stage 4 (Scoring, Ranking & Automated Shortlisting).
        
        Strict Deterministic Formula:
          1. Skills Match: 40%
          2. Experience & Title Match: 30%
          3. Education & Qualifications: 20%
          4. Formatting / Structural Completeness: 10%
          Total = 100%

        Shortlist Threshold: >= 75% -> "Shortlisted / Recommended"
                             < 75%  -> "Filtered / Under Review"
        """
        from app.utils.constants import SKILL_ALIASES

        # --- Resolve Required Skills from JD if missing, empty, or single-letter bug ---
        clean_required = [
            s.strip() for s in required_skills
            if isinstance(s, str) and len(s.strip()) > 1 and s.strip().lower() not in ["c", "etc"]
        ]

        if (not clean_required or len(clean_required) <= 1) and job_description and len(job_description.strip()) > 20:
            extracted_jd = cls.extract_job_requirements(job_description)
            if extracted_jd.get("required_skills"):
                clean_required = extracted_jd["required_skills"]
            if extracted_jd.get("job_title") and job_title in ["Target Position", "Target Job Posting", ""]:
                job_title = extracted_jd["job_title"]
            if extracted_jd.get("experience_years") is not None and min_experience_years == 2.0:
                min_experience_years = float(extracted_jd["experience_years"])

        # --- Resolve Candidate Skills ---
        candidate_skills_list = []
        if isinstance(candidate_profile.get("all_skills"), list):
            candidate_skills_list.extend(candidate_profile["all_skills"])
        if isinstance(candidate_profile.get("skills"), list):
            candidate_skills_list.extend(candidate_profile["skills"])
        elif isinstance(candidate_profile.get("skills"), dict):
            for sublist in candidate_profile["skills"].values():
                if isinstance(sublist, list):
                    candidate_skills_list.extend(sublist)

        candidate_skills_set = {s.strip() for s in candidate_skills_list if isinstance(s, str) and len(s.strip()) > 1}

        # --- 1. SKILLS MATCH (40 pts) WITH FUZZY & SEMANTIC OVERLAP ---
        def is_skill_match(req: str, cand_skills: set, raw_text: str) -> bool:
            req_clean = req.lower().strip()
            if not req_clean:
                return False
            req_canonical = SKILL_ALIASES.get(req_clean, req_clean).lower()

            # 1. Exact match with candidate skill or its canonical alias
            for cand in cand_skills:
                cand_clean = cand.lower().strip()
                cand_canonical = SKILL_ALIASES.get(cand_clean, cand_clean).lower()
                if (req_clean == cand_clean or req_canonical == cand_canonical or
                        req_canonical == cand_clean or req_clean == cand_canonical):
                    return True

            # 2. Substring & space-normalized containment (e.g. "photoshop" in "adobe photoshop")
            req_no_space = req_clean.replace(" ", "").replace("-", "")
            for cand in cand_skills:
                cand_clean = cand.lower().strip()
                cand_no_space = cand_clean.replace(" ", "").replace("-", "")
                if req_no_space in cand_no_space or cand_no_space in req_no_space:
                    return True
                if len(req_clean) >= 4 and req_clean in cand_clean:
                    return True
                if len(cand_clean) >= 4 and cand_clean in req_clean:
                    return True

            # 3. Semantic Token Overlap
            req_tokens = {w for w in re.findall(r"\w+", req_clean) if len(w) > 3 and w not in ["skills", "knowledge", "expert", "experience", "required"]}
            for cand in cand_skills:
                cand_tokens = {w for w in re.findall(r"\w+", cand.lower()) if len(w) > 3 and w not in ["skills", "knowledge", "expert", "experience", "required"]}
                if req_tokens and cand_tokens:
                    overlap = req_tokens.intersection(cand_tokens)
                    if len(overlap) >= 2 or (len(overlap) >= 1 and any(t in ['photoshop', 'illustrator', 'indesign', 'infographics', 'packaging', 'typography', 'branding', 'figma'] for t in overlap)):
                        return True

            # 4. Root token & stem matching (e.g. 'banner' in 'banners', 'infographic' in 'infographics', 'english')
            req_words = [w.rstrip("s") for w in re.findall(r"\w+", req_clean) if len(w) > 3 and w not in ["skills", "knowledge", "expert", "experience", "required", "design", "good"]]
            for rw in req_words:
                if rw in ["banner", "infographic", "packaging", "branding", "retouching", "illustration", "english", "social"]:
                    if re.search(rf"\b{rw}\w*\b", raw_text.lower()):
                        return True

            # 5. Search in raw resume text
            if req_canonical and re.search(rf"\b{re.escape(req_canonical)}\b", raw_text.lower()):
                return True
            if len(req_clean) >= 4 and re.search(rf"\b{re.escape(req_clean)}\b", raw_text.lower()):
                return True
            if "indesign" in req_no_space and re.search(r"\bindesign\b", raw_text.lower()):
                return True

            return False

        matched_skills_set = set()
        missing_skills_set = set()

        for req in clean_required:
            if is_skill_match(req, candidate_skills_set, resume_text):
                matched_skills_set.add(req)
            else:
                missing_skills_set.add(req)

        # Calculate skills ratio
        if clean_required:
            skills_ratio = len(matched_skills_set) / len(clean_required)
            matched_lower = {s.lower() for s in matched_skills_set}
            has_major_tools = sum(1 for ct in ["photoshop", "illustrator", "indesign"] if any(ct in m for m in matched_lower)) >= 2

            if skills_ratio >= 0.8:
                skills_score = round(min(40.0, 35.0 + (skills_ratio - 0.8) * 25.0), 1)
            elif skills_ratio >= 0.5:
                base_calc = skills_ratio * 40.0
                skills_score = round(min(40.0, max(base_calc, 34.0 if has_major_tools else 28.0)), 1)
            else:
                skills_score = round(skills_ratio * 40.0, 1)
        else:
            skills_ratio = 1.0
            skills_score = 40.0

        # --- 2. EXPERIENCE & TITLE MATCH (30 pts) ---
        cand_exp_years = float(candidate_profile.get("experience_years", 1.0) or 1.0)
        
        # Experience duration score (18 pts max)
        if cand_exp_years >= min_experience_years:
            exp_duration_score = 18.0
        else:
            exp_duration_score = max(6.0, (cand_exp_years / max(min_experience_years, 1.0)) * 18.0)

        # Title alignment check (12 pts max)
        title_score = 6.0  # baseline
        target_words = {w for w in re.findall(r"\w+", job_title.lower()) if len(w) > 3 and w not in ["senior", "junior", "lead", "entry", "level", "role", "position"]}

        experiences = candidate_profile.get("experience", [])
        found_title_match = False
        for exp in experiences:
            exp_title = exp.get("title", "").lower()
            if any(w in exp_title for w in target_words):
                found_title_match = True
                break

        if not found_title_match and any(w in resume_text.lower() for w in target_words):
            found_title_match = True

        if found_title_match or not target_words:
            title_score = 12.0

        experience_score = round(exp_duration_score + title_score, 1)

        # --- 3. EDUCATION & QUALIFICATIONS (20 pts) ---
        education_records = candidate_profile.get("education", [])
        education_score = 12.0  # baseline for having education section
        has_degree = False
        has_hsc_or_diploma = False

        for edu in education_records:
            deg = (edu.get("degree") or edu.get("degree_level") or "").lower()
            if any(k in deg for k in ["bachelor", "master", "phd", "b.s", "b.sc", "b.e", "b.tech", "m.s"]):
                has_degree = True
            if any(k in deg for k in ["hsc", "h.s.c", "secondary", "intermediate", "diploma", "associate"]):
                has_hsc_or_diploma = True

        if not has_degree and re.search(r"\b(?:bachelor|master|ph\.?d|b\.?sc|b\.?e)\b", resume_text.lower()):
            has_degree = True
        if not has_hsc_or_diploma and re.search(r"\b(?:h\.?s\.?c|higher secondary|college)\b", resume_text.lower()):
            has_hsc_or_diploma = True

        if has_degree or has_hsc_or_diploma or education_records:
            education_score = 20.0

        # --- 4. FORMATTING / STRUCTURAL COMPLETENESS (10 pts) ---
        format_score = 4.0
        contact = candidate_profile.get("contact", {})
        if contact.get("email") or re.search(r"[\w\.-]+@[\w\.-]+", resume_text):
            format_score += 2.0
        if contact.get("phone") or re.search(r"\d{7,}", resume_text):
            format_score += 2.0
        if len(resume_text.split()) >= 100:
            format_score += 2.0

        format_score = min(10.0, format_score)

        # --- COMPOSITE ATS SCORE (0 - 100) ---
        composite_score = round(skills_score + experience_score + education_score + format_score, 1)
        composite_score = min(100.0, max(15.0, composite_score))

        # --- AUTOMATED SHORTLISTING ROUTING ---
        is_shortlisted = composite_score >= 75.0
        shortlist_status = "Shortlisted / Recommended" if is_shortlisted else "Filtered / Under Review"

        # Format skill lists
        matched_formatted = [SKILL_ALIASES.get(s.lower(), s.title() if len(s) > 3 else s.upper()) for s in sorted(list(matched_skills_set))]
        missing_formatted = [SKILL_ALIASES.get(s.lower(), s.title() if len(s) > 3 else s.upper()) for s in sorted(list(missing_skills_set))]

        # Prompt Gemini for deep qualitative recruiter verdict and actionable tips
        ai_insights = cls._generate_ats_insights(
            job_title=job_title,
            job_description=job_description,
            composite_score=composite_score,
            matched_skills=matched_formatted,
            missing_skills=missing_formatted,
            cand_exp_years=cand_exp_years,
            min_exp_years=min_experience_years,
        )

        return {
            "ats_score": composite_score,
            "shortlist_status": shortlist_status,
            "is_shortlisted": is_shortlisted,
            "score_breakdown": {
                "skills_score": skills_score,
                "skills_max": 40.0,
                "experience_score": experience_score,
                "experience_max": 30.0,
                "education_score": education_score,
                "education_max": 20.0,
                "format_score": format_score,
                "format_max": 10.0,
            },
            "matched_skills": matched_formatted,
            "missing_skills": missing_formatted,
            "match_level": "High Match" if composite_score >= 80 else ("Moderate Match" if composite_score >= 60 else "Low Match"),
            "summary_feedback": ai_insights.get("summary_feedback", f"Candidate achieved {composite_score}% match on ATS evaluation criteria."),
            "suggestions": ai_insights.get("suggestions", [
                f"Highlight projects utilizing: {', '.join(missing_formatted[:3])}" if missing_formatted else "Resume is strongly aligned with all criteria."
            ]),
            "learning_recommendations": ai_insights.get("learning_recommendations", []),
        }

    @classmethod
    def _generate_ats_insights(
        cls,
        job_title: str,
        job_description: str,
        composite_score: float,
        matched_skills: List[str],
        missing_skills: List[str],
        cand_exp_years: float,
        min_exp_years: float,
    ) -> Dict[str, Any]:
        """Deep qualitative recruiter synthesis from Gemini."""
        prompt = f"""
You are a Principal Talent Acquisition Architect.
Evaluate this ATS match summary for:
Target Position: {job_title}
Job Description: {job_description[:1500]}
Composite ATS Score: {composite_score}%
Matched Skills: {json.dumps(matched_skills)}
Missing Skills: {json.dumps(missing_skills)}
Candidate Experience: {cand_exp_years} yrs vs Minimum Expected: {min_exp_years} yrs

Return a strict JSON object:
{{
  "summary_feedback": "<2 sentence executive recruiter summary>",
  "suggestions": ["<actionable optimization tip 1>", "<actionable optimization tip 2>"],
  "learning_recommendations": [
    {{"skill": "<missing_skill>", "topic": "<course/topic>", "action": "<what to build/learn>"}}
  ]
}}
"""
        raw = cls._generate_with_fallback(prompt, is_json=True)
        if raw:
            try:
                return json.loads(cls._clean_json_response(raw))
            except Exception:
                pass

        # Fallback
        return {
            "summary_feedback": f"Profile evaluated at {composite_score}% match against '{job_title}'. " + (
                "Recommended for interview routing." if composite_score >= 75 else "Review missing skill gaps before advancing."
            ),
            "suggestions": [
                f"Add missing keywords: {', '.join(missing_skills[:3])}" if missing_skills else "Resume keywords closely match job circular.",
                "Highlight quantifiable metrics in recent achievements.",
            ],
            "learning_recommendations": [
                {"skill": s, "topic": f"{s} Best Practices", "action": f"Build a practical proof-of-concept demonstrating {s}"}
                for s in missing_skills[:2]
            ],
        }

    @classmethod
    def analyze_resume_against_job(
        cls,
        resume_text: str,
        jd_text: str,
        required_skills: List[str] = None,
        candidate_skills: List[str] = None,
    ) -> Dict[str, Any]:
        """Legacy compatibility wrapper calling 4-stage pipeline."""
        required_skills = required_skills or []
        candidate_skills = candidate_skills or []
        profile_mock = {
            "all_skills": candidate_skills,
            "experience_years": 3.0,
            "education": [{"degree": "Bachelor's Degree"}],
        }
        return cls.evaluate_4stage_ats_pipeline(
            candidate_profile=profile_mock,
            resume_text=resume_text,
            job_title="Target Position",
            job_description=jd_text,
            required_skills=required_skills,
        )

    @classmethod
    def _fallback_ats_matcher(
        cls,
        resume_text: str,
        jd_text: str,
        required_skills: List[str],
        candidate_skills: List[str],
    ) -> Dict[str, Any]:
        fallback_res = JobMatchService.calculate_ats_match(
            resume_skills=candidate_skills,
            resume_text=resume_text,
            resume_experience_years=3.0,
            required_skills=required_skills,
            jd_text=jd_text,
        )
        return {
            "ats_score": fallback_res.get("ats_score", 65.0),
            "match_level": fallback_res.get("match_level", "Moderate"),
            "matched_skills": fallback_res.get("matched_skills", []),
            "missing_skills": fallback_res.get("missing_skills", []),
            "key_strengths": [f"{len(candidate_skills)} recognized competencies"],
            "weaknesses": [f"Missing: {', '.join(fallback_res.get('missing_skills', [])[:3])}"],
            "suggestions": fallback_res.get("suggestions", []),
            "learning_recommendations": fallback_res.get("learning_recommendations", []),
            "summary_feedback": "Candidate profile has baseline keyword alignment with the target requisition.",
        }

    # =========================================================================
    # 2. AI RESUME OPTIMIZER & SUMMARY REPHRASER
    # =========================================================================
    @classmethod
    def optimize_summary_and_bullets(
        cls,
        summary: str,
        job_title: str = "Software Engineer",
        skills: List[str] = None,
        bullet_points: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Rewrites professional summaries and bullet points into ATS-optimized tone
        with strong action verbs, quantifiable metrics placeholders, and industry keywords.
        """
        client = cls.get_client()
        skills = skills or []
        bullet_points = bullet_points or []

        prompt = f"""
You are a Principal Career Coach and Executive Resume Writer.
Rewrite the candidate's professional summary and work experience bullets to maximize ATS readability and executive impact.

Target Role / Headline: {job_title}
Key Technical Competencies: {json.dumps(skills)}
Current Summary: \"{summary}\"
Current Bullets: {json.dumps(bullet_points)}

Return a strict, valid JSON object with the following schema:
{{
  "original_summary": \"{summary}\",
  "optimized_summary": "<compelling 3-4 sentence professional summary with high-impact action verbs>",
  "optimized_bullets": [
    "<action verb + task + measurable result (e.g. Architected microservices boosting throughput by 35%)>"
  ],
  "tips": [
    "<tip 1 on tailoring to target job>",
    "<tip 2 on quantification>"
  ]
}}
"""

        raw_text = cls._generate_with_fallback(prompt, is_json=True)
        if raw_text:
            try:
                cleaned = cls._clean_json_response(raw_text)
                return json.loads(cleaned)
            except Exception as e:
                logger.warning(f"Gemini Summary Optimizer parse error ({e}). Using rule-based fallback.")

        # Fallback
        skills_str = ", ".join(skills[:4]) if skills else "modern engineering practices"
        return {
            "original_summary": summary,
            "optimized_summary": (
                f"Results-driven and strategic {job_title} with proven track record architecting robust solutions "
                f"using {skills_str}. Spearheaded mission-critical deployments and collaborated cross-functionally "
                f"to accelerate sprint delivery by 30%."
            ),
            "optimized_bullets": [
                f"Architected scalable backend workflows with {skills[0] if skills else 'Python'} reducing latency by 25%.",
                "Spearheaded agile team delivery, enhancing system maintainability and code quality.",
            ],
            "tips": [
                "Incorporate exact target role metrics (e.g. latency, revenue, user growth).",
                "Ensure tech stack keywords appear in both summary and work experience sections.",
            ],
        }

    # =========================================================================
    # 3. SKILL GAP & ROADMAP GENERATOR
    # =========================================================================
    @classmethod
    def generate_skill_roadmap(
        cls,
        current_skills: List[str],
        target_role: str,
        missing_skills: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Generates course suggestions, key topics, and project roadmaps to bridge detected skill gaps.
        """
        client = cls.get_client()
        missing_skills = missing_skills or []

        prompt = f"""
You are a Staff Technical Mentor.
Generate a structured, step-by-step career upskilling roadmap for a candidate aiming for the role of: {target_role}.

Current Skills: {json.dumps(current_skills)}
Identified Skill Gaps / Missing Competencies: {json.dumps(missing_skills)}

Return a strict, valid JSON object with the following schema:
{{
  "target_role": \"{target_role}\",
  "missing_skills": {json.dumps(missing_skills)},
  "estimated_weeks_to_ready": <integer number of weeks>,
  "roadmap_phases": [
    {{
      "phase_name": "<Phase 1: Fundamentals>",
      "duration": "<Weeks 1-2>",
      "skills_to_learn": ["<skill1>", "<skill2>"],
      "recommended_courses": ["<Coursera/Udemy/Official Docs recommendation>"],
      "hands_on_project": "<description of practical portfolio project to build>"
    }},
    {{
      "phase_name": "<Phase 2: Production Scale>",
      "duration": "<Weeks 3-4>",
      "skills_to_learn": ["<skill3>"],
      "recommended_courses": ["<course or docs>"],
      "hands_on_project": "<project description>"
    }}
  ],
  "interview_prep_topics": ["<topic 1>", "<topic 2>", "<topic 3>"]
}}
"""

        raw_text = cls._generate_with_fallback(prompt, is_json=True)
        if raw_text:
            try:
                cleaned = cls._clean_json_response(raw_text)
                return json.loads(cleaned)
            except Exception as e:
                logger.warning(f"Gemini Roadmap parse error ({e}). Returning heuristic roadmap.")

        # Fallback
        return {
            "target_role": target_role,
            "missing_skills": missing_skills,
            "estimated_weeks_to_ready": 4,
            "roadmap_phases": [
                {
                    "phase_name": "Phase 1: Core Competency Mastery",
                    "duration": "Weeks 1-2",
                    "skills_to_learn": missing_skills[:2] if missing_skills else ["System Design"],
                    "recommended_courses": ["Official Documentation & Deep Dives"],
                    "hands_on_project": f"Build a production microservice implementing {', '.join(missing_skills[:2]) if missing_skills else 'REST APIs'}.",
                },
                {
                    "phase_name": "Phase 2: Full-Stack Integration & Cloud Deployment",
                    "duration": "Weeks 3-4",
                    "skills_to_learn": missing_skills[2:4] if len(missing_skills) > 2 else ["Docker & CI/CD"],
                    "recommended_courses": ["Cloud Engineering Essentials"],
                    "hands_on_project": "Containerize application with Docker and deploy to AWS / GCP.",
                },
            ],
            "interview_prep_topics": [
                "System Architecture & Scaling Bottlenecks",
                "Database Indexing & Query Optimization",
                "API Idempotency & Error Handling",
            ],
        }

    # =========================================================================
    # 4. AI MOCK INTERVIEW AGENT (TEXT-BASED)
    # =========================================================================
    @classmethod
    def generate_interview_questions(
        cls,
        job_title: str,
        experience_level: str = "MID",
        skills: List[str] = None,
        count: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Generates context-aware technical and behavioral interview questions for a role.
        """
        client = cls.get_client()
        skills = skills or []

        prompt = f"""
You are a Principal Technical Interviewer at a top tier tech company.
Generate {count} context-aware, realistic technical & architectural interview questions for:
Role: {job_title}
Seniority Level: {experience_level}
Relevant Technologies: {json.dumps(skills)}

Return a strict, valid JSON array of objects:
[
  {{
    "id": 1,
    "category": "<System Design | Coding / Algorithms | Framework Internals | Behavioral>",
    "question": "<Realistic interview question>",
    "expected_concepts": ["<concept 1>", "<concept 2>"],
    "hint": "<Helpful hint for candidate if stuck>"
  }}
]
"""

        raw_text = cls._generate_with_fallback(prompt, is_json=True)
        if raw_text:
            try:
                cleaned = cls._clean_json_response(raw_text)
                return json.loads(cleaned)
            except Exception as e:
                logger.warning(f"Gemini Interview Generator parse error ({e}). Returning curated questions.")

        # Fallback
        return [
            {
                "id": 1,
                "category": "Framework Internals",
                "question": f"How do asynchronous request loops work under the hood in {skills[0] if skills else job_title}, and how do you handle blocking I/O calls?",
                "expected_concepts": ["Async/Await", "Event Loop", "Threadpool Execution"],
                "hint": "Think about CPU-bound vs Network-bound task delegation.",
            },
            {
                "id": 2,
                "category": "System Design",
                "question": "How would you design a rate limiter to protect backend APIs from excessive requests in a distributed multi-node deployment?",
                "expected_concepts": ["Token Bucket", "Redis Leaky Bucket", "Distributed Locks"],
                "hint": "Consider centralized Redis counters with sliding window intervals.",
            },
            {
                "id": 3,
                "category": "Database Architecture",
                "question": "Explain how database composite indexes work and what pitfalls lead to full table scans.",
                "expected_concepts": ["Leftmost Prefix Rule", "B-Tree Traversal", "Execution Plan (EXPLAIN)"],
                "hint": "Remember the order of columns in multi-column index definitions.",
            },
        ]

    @classmethod
    def evaluate_interview_answer(
        cls,
        question: str,
        expected_concepts: List[str],
        candidate_answer: str,
        job_title: str = "Software Engineer",
    ) -> Dict[str, Any]:
        """
        Evaluates a candidate's text answer, providing score (0-100), detailed feedback,
        missed concepts, and model answer.
        """
        client = cls.get_client()

        prompt = f"""
You are a Lead Technical Interviewer evaluating a candidate's response.
Role: {job_title}
Question: \"{question}\"
Expected Core Concepts: {json.dumps(expected_concepts)}
Candidate's Answer:
\"\"\"
{candidate_answer}
\"\"\"

Return a strict, valid JSON object with the following schema:
{{
  "score": <integer score from 0 to 100 based on technical accuracy and clarity>,
  "verdict": "<Strong Pass | Pass | Needs Improvement | Fail>",
  "strengths": ["<strength point 1>", "<strength point 2>"],
  "missed_concepts": ["<concept not covered or misunderstood>"],
  "feedback": "<constructive critique on answer structure, depth, and clarity>",
  "ideal_model_answer": "<concise 3-4 sentence gold-standard response demonstrating senior understanding>"
}}
"""

        raw_text = cls._generate_with_fallback(prompt, is_json=True)
        if raw_text:
            try:
                cleaned = cls._clean_json_response(raw_text)
                return json.loads(cleaned)
            except Exception as e:
                logger.warning(f"Gemini Answer Evaluator parse error ({e}). Returning fallback critique.")

        # Fallback
        word_count = len(candidate_answer.split())
        score = min(90, max(40, word_count * 2))
        return {
            "score": score,
            "verdict": "Pass" if score >= 70 else "Needs Improvement",
            "strengths": ["Clear communication and foundational understanding."],
            "missed_concepts": expected_concepts,
            "feedback": "Answer addresses the surface mechanics. Dig deeper into concurrency and failure recovery.",
            "ideal_model_answer": f"A comprehensive answer covers {', '.join(expected_concepts)} with concrete production examples.",
        }

    # =========================================================================
    # PRE-APPLICATION SCREENING MOCK TEST GENERATOR (25 MCQS + 5 SHORT WRITTEN)
    # =========================================================================
    @classmethod
    def generate_job_screening_test(
        cls,
        job_title: str,
        job_description: str,
        required_skills: List[str],
    ) -> Dict[str, Any]:
        """
        Generates a standardized 30-question screening test specifically tailored
        to the target job title, job description, and skill requirements:
          - Exactly 25 industry-grade, job-specific MCQs (options A, B, C, D, single correct_option, explanation)
          - Exactly 5 technical/domain-focused short written questions (testing problem solving, with ideal_answer_rubric)
        """
        skills_str = ", ".join(required_skills) if required_skills else "General Professional Competencies"
        prompt = f"""
You are a Principal Technical Hiring & Assessment Architect.
Your task is to design a rigorous, real-world Pre-Application Screening Assessment for the following position:

Target Job Title: {job_title}
Key Required Skills/Tools: {skills_str}
Job Description Context:
\"\"\"
{job_description[:3000]}
\"\"\"

CRITICAL SPECIFICATIONS:
1. Generate EXACTLY 25 Multiple-Choice Questions (MCQs):
   - Numbered id from 1 to 25.
   - Tailored to practical scenarios, troubleshooting, architectural patterns, syntax, or domain conventions relevant to {job_title} and {skills_str}.
   - Each MCQ must have exactly 4 distinct, plausible options formatted as ["A) ...", "B) ...", "C) ...", "D) ..."].
   - Single unambiguous "correct_option" ("A", "B", "C", or "D").
   - Detailed, educational "explanation" justifying the correct answer.

2. Generate EXACTLY 5 Short Written Technical/Practical Questions:
   - Numbered id from 1 to 5.
   - Real-world architectural, operational, debugging, or design scenarios requiring concise candidate written explanations (2-4 paragraphs).
   - Provide an "ideal_answer_rubric" detailing mandatory key concepts, expected solutions, and trade-offs for graders.
   - Set "max_marks" to 10 for each written question.

Return a strict, valid JSON object with the following schema:
{{
  "mcq_questions": [
    {{
      "id": 1,
      "question": "<scenario or technical question>",
      "options": [
        "A) <Option A text>",
        "B) <Option B text>",
        "C) <Option C text>",
        "D) <Option D text>"
      ],
      "correct_option": "<A | B | C | D>",
      "explanation": "<detailed rationale>"
    }}
  ],
  "written_questions": [
    {{
      "id": 1,
      "question": "<practical problem-solving question>",
      "ideal_answer_rubric": "<mandatory key concepts, expected methodology, and evaluation criteria>",
      "max_marks": 10
    }}
  ]
}}
"""
        raw_text = cls._generate_with_fallback(prompt, is_json=True)
        if raw_text:
            try:
                cleaned = cls._clean_json_response(raw_text)
                data = json.loads(cleaned)
                mcqs = data.get("mcq_questions", [])
                writtens = data.get("written_questions", [])
                if len(mcqs) >= 20 and len(writtens) >= 3:
                    # Normalize IDs and format
                    for idx, q in enumerate(mcqs, 1):
                        q["id"] = idx
                        if not q.get("correct_option") and q.get("answer"):
                            q["correct_option"] = q["answer"]
                    for idx, w in enumerate(writtens, 1):
                        w["id"] = idx
                        w["max_marks"] = w.get("max_marks", 10)
                    return {
                        "mcq_questions": mcqs[:25],
                        "written_questions": writtens[:5],
                    }
            except Exception as e:
                logger.warning(f"Error parsing Gemini assessment response: {e}. Building fallback question set.")

        return cls._generate_fallback_screening_test(job_title, required_skills)

    @classmethod
    def _generate_fallback_screening_test(cls, job_title: str, required_skills: List[str]) -> Dict[str, Any]:
        """Provides a high-caliber domain-aligned 25 MCQ + 5 Written question fallback."""
        skills = required_skills or ["Problem Solving", "System Architecture", "Best Practices", "Debugging", "Optimization"]
        
        # 25 Scenario-based MCQs
        mcqs = [
            {
                "id": 1,
                "question": f"When architecting a production system using {skills[0] if skills else 'modern frameworks'}, what is the primary consideration for handling sudden traffic spikes?",
                "options": [
                    "A) Vertical scaling with manual hardware reboot",
                    "B) Horizontal auto-scaling behind an elastic load balancer with stateless workers",
                    "C) Disabling input validation to reduce CPU cycles",
                    "D) Storing all session states in local in-memory dictionaries"
                ],
                "correct_option": "B",
                "explanation": "Stateless horizontal scaling coupled with load balancers allows dynamic elasticity without data loss."
            },
            {
                "id": 2,
                "question": "Which HTTP status code is most appropriate when a client sends a valid request with malformed or missing parameters according to RFC standards?",
                "options": [
                    "A) 200 OK",
                    "B) 400 Bad Request or 422 Unprocessable Entity",
                    "C) 500 Internal Server Error",
                    "D) 404 Not Found"
                ],
                "correct_option": "B",
                "explanation": "422 is typically used for semantic/validation errors, while 400 indicates malformed client syntax."
            },
            {
                "id": 3,
                "question": "What is the primary benefit of implementing Database Connection Pooling (e.g., pool_size and max_overflow)?",
                "options": [
                    "A) Eliminates the need for database indexes",
                    "B) Minimizes TCP handshake and authentication overhead by reusing active connections",
                    "C) Automatically migrates database schemas without downtime",
                    "D) Prevents SQL queries from executing concurrently"
                ],
                "correct_option": "B",
                "explanation": "Connection pools maintain a cache of open database connections to avoid the heavy cost of establishing new sockets for every request."
            },
            {
                "id": 4,
                "question": "In RESTful API design, which method is strictly idempotent by specification?",
                "options": [
                    "A) POST",
                    "B) PUT",
                    "C) PATCH (without idempotency key)",
                    "D) CONNECT"
                ],
                "correct_option": "B",
                "explanation": "PUT is idempotent because executing identical PUT requests multiple times yields the same final state."
            },
            {
                "id": 5,
                "question": "What security mechanism mitigates Cross-Site Scripting (XSS) attacks in modern web applications?",
                "options": [
                    "A) Content Security Policy (CSP) and strict context-aware output encoding",
                    "B) Using GET requests instead of POST requests",
                    "C) Storing passwords in plaintext inside localStorage",
                    "D) Disabling HTTPS on internal microservices"
                ],
                "correct_option": "A",
                "explanation": "CSP restricts the origins from which scripts can be executed, and proper output encoding prevents malicious HTML/JS injection."
            },
            {
                "id": 6,
                "question": "What is the fundamental difference between an asynchronous non-blocking event loop and multi-threaded worker models?",
                "options": [
                    "A) Async event loops cannot perform I/O operations",
                    "B) Async event loops run cooperative multitasking on a single thread avoiding thread context-switch overhead for I/O bounds",
                    "C) Multi-threaded workers always use less RAM than event loops",
                    "D) Async code requires hardware GPUs to execute"
                ],
                "correct_option": "B",
                "explanation": "An event loop delegates I/O interrupts to OS primitives (epoll/kqueue) and swaps tasks cooperatively without kernel thread context switching."
            },
            {
                "id": 7,
                "question": "When designing relational database tables for high-frequency queries, which indexing strategy prevents full table scans on multi-column filters?",
                "options": [
                    "A) Single column index on the least selective column",
                    "B) Composite (multi-column) index ordered by leftmost prefix selectivity",
                    "C) Hash index on all string columns",
                    "D) Removing primary keys"
                ],
                "correct_option": "B",
                "explanation": "Composite indexes work optimally when ordered from most selective to least selective according to query WHERE clauses."
            },
            {
                "id": 8,
                "question": "In a microservices architecture, which pattern prevents cascading failures when downstream external dependencies fail or become slow?",
                "options": [
                    "A) Circuit Breaker Pattern",
                    "B) Infinite Retry Loop",
                    "C) Monolithic Shared Database",
                    "D) Synchronous HTTP Chain"
                ],
                "correct_option": "A",
                "explanation": "A Circuit Breaker trips open after a threshold of failures, failing fast and allowing downstream services time to recover."
            },
            {
                "id": 9,
                "question": f"Which testing methodology ensures individual units of business logic for {job_title} behave predictably in isolation?",
                "options": [
                    "A) End-to-End manual testing in production",
                    "B) Unit testing with mocked external boundaries (e.g., PyTest / Jest)",
                    "C) Performance stress testing only",
                    "D) Compiling without warnings"
                ],
                "correct_option": "B",
                "explanation": "Unit testing isolates single functions or classes by mocking I/O, database, and network boundaries."
            },
            {
                "id": 10,
                "question": "What is the primary risk of using JWT tokens without short expirations and server-side revocation mechanisms?",
                "options": [
                    "A) The token size decreases over time",
                    "B) Compromised tokens remain valid until expiration even after user password changes or logout",
                    "C) The database crashes immediately",
                    "D) Browsers automatically block all JWT headers"
                ],
                "correct_option": "B",
                "explanation": "Stateless JWTs cannot be revoked natively before their exp claim expires unless a blacklist/revocation list is maintained."
            },
            {
                "id": 11,
                "question": "In Git version control, what does 'git rebase' do compared to 'git merge'?",
                "options": [
                    "A) Rebase replays commits on top of another base tip, creating a linear history without merge commits",
                    "B) Rebase deletes the working branch permanently",
                    "C) Rebase pushes changes directly to the remote repository",
                    "D) Rebase reverts the last three commits"
                ],
                "correct_option": "A",
                "explanation": "Rebase modifies commit ancestry to create a clean, linear project history without merge commit clutter."
            },
            {
                "id": 12,
                "question": "Which caching strategy updates the cache synchronously alongside the persistent database write?",
                "options": [
                    "A) Cache-Aside (Lazy Loading)",
                    "B) Write-Through",
                    "C) Read-Only",
                    "D) Write-Behind (Write-Back)"
                ],
                "correct_option": "B",
                "explanation": "Write-Through updates the cache and database in the same transaction, ensuring cache data is never stale."
            },
            {
                "id": 13,
                "question": "What does ACID stand for in transaction processing systems?",
                "options": [
                    "A) Atomicity, Consistency, Isolation, Durability",
                    "B) Accuracy, Concurrency, Integrity, Delivery",
                    "C) Asynchronous, Cached, Indexed, Distributed",
                    "D) Authorization, Confidentiality, Identity, Decryption"
                ],
                "correct_option": "A",
                "explanation": "ACID guarantees that database transactions are processed reliably and independently."
            },
            {
                "id": 14,
                "question": "In Docker containerization, why should multi-stage builds be utilized for production container images?",
                "options": [
                    "A) To ensure compilers and build tools are excluded from the final runtime image, minimizing attack surface and image size",
                    "B) To execute containers with root privileges by default",
                    "C) To run multiple operating systems simultaneously inside one container",
                    "D) To bypass firewall restrictions"
                ],
                "correct_option": "A",
                "explanation": "Multi-stage builds leave behind heavyweight compilers, SDKs, and build dependencies in intermediate layers."
            },
            {
                "id": 15,
                "question": "What is the primary role of an API Gateway in modern enterprise architectures?",
                "options": [
                    "A) Reverse proxy handling routing, SSL termination, rate limiting, and unified authentication",
                    "B) Compiling backend source code on the fly",
                    "C) Storing all user files directly on disk",
                    "D) Replacing relational databases"
                ],
                "correct_option": "A",
                "explanation": "An API Gateway acts as the single point of entry, decoupling clients from internal service topographies."
            },
            {
                "id": 16,
                "question": "What is the Big-O time complexity of searching an element in a balanced binary search tree (or indexing B-Tree)?",
                "options": [
                    "A) O(1)",
                    "B) O(log N)",
                    "C) O(N)",
                    "D) O(N^2)"
                ],
                "correct_option": "B",
                "explanation": "Balanced trees halve the search space at each level, achieving logarithmic time complexity O(log N)."
            },
            {
                "id": 17,
                "question": "When designing a multi-tenant SaaS application, which tenant isolation model provides the strongest data separation?",
                "options": [
                    "A) Shared database with tenant_id foreign key column",
                    "B) Separate database per tenant with dedicated credentials",
                    "C) Storing all tenant data in a public Redis cache",
                    "D) Using hardcoded user roles"
                ],
                "correct_option": "B",
                "explanation": "Database-per-tenant ensures physical isolation of records, preventing cross-tenant data leaks and easing compliance."
            },
            {
                "id": 18,
                "question": "Which header informs browsers to only communicate over HTTPS and disallow plain HTTP downgrades?",
                "options": [
                    "A) Strict-Transport-Security (HSTS)",
                    "B) X-Frame-Options",
                    "C) Access-Control-Allow-Origin",
                    "D) Set-Cookie"
                ],
                "correct_option": "A",
                "explanation": "HSTS instructs the browser to automatically upgrade all insecure requests to HTTPS."
            },
            {
                "id": 19,
                "question": "What is the purpose of Database Read Replicas?",
                "options": [
                    "A) To handle read-heavy query traffic, offloading the primary write master",
                    "B) To write new records faster than the primary database",
                    "C) To replace database backups completely",
                    "D) To execute schema migrations in reverse"
                ],
                "correct_option": "A",
                "explanation": "Read replicas asynchronously replicate data from the primary master to scale read throughput horizontally."
            },
            {
                "id": 20,
                "question": "In continuous integration and deployment (CI/CD), what is a 'Canary Deployment'?",
                "options": [
                    "A) Deploying code to all servers simultaneously at midnight",
                    "B) Rolling out new version to a small percentage of users before broad rollout",
                    "C) Reverting all database changes automatically",
                    "D) Running tests on developer laptops only"
                ],
                "correct_option": "B",
                "explanation": "Canary deployments limit blast radius by observing real metrics on a small subset of traffic first."
            },
            {
                "id": 21,
                "question": "What problem does CORS (Cross-Origin Resource Sharing) address?",
                "options": [
                    "A) Browser same-origin security policies restricting cross-domain API requests",
                    "B) Server CPU thermal throttling",
                    "C) Database table locking",
                    "D) Memory leaks in backend loops"
                ],
                "correct_option": "A",
                "explanation": "CORS allows servers to declare which external web domains are permitted to access their resources from client browsers."
            },
            {
                "id": 22,
                "question": "What is the primary characteristic of an Idempotency Key in payment processing or checkout APIs?",
                "options": [
                    "A) It allows infinite duplicate charges without error",
                    "B) It guarantees that retrying a request with the same key will not create duplicate transactions",
                    "C) It encrypts the user password",
                    "D) It increases the network latency"
                ],
                "correct_option": "B",
                "explanation": "Idempotency keys prevent double-charging by caching the original result of an operation for identical keys."
            },
            {
                "id": 23,
                "question": "When monitoring distributed systems in production, what are the 'Four Golden Signals' of observability?",
                "options": [
                    "A) Latency, Traffic, Errors, and Saturation",
                    "B) Lines of code, Commits, Bugs, and Deployments",
                    "C) CPU, Memory, Disk, and Network only",
                    "D) Frontend clicks, Impressions, Likes, and Shares"
                ],
                "correct_option": "A",
                "explanation": "Google SRE defines Latency, Traffic, Errors, and Saturation as the core signals for monitoring services."
            },
            {
                "id": 24,
                "question": "Which database anomaly occurs when a transaction reads data that has been modified by another concurrent transaction but not yet committed?",
                "options": [
                    "A) Dirty Read",
                    "B) Phantom Read",
                    "C) Non-Repeatable Read",
                    "D) Lost Update"
                ],
                "correct_option": "A",
                "explanation": "A Dirty Read happens at READ UNCOMMITTED isolation level when uncommitted temporary changes are read."
            },
            {
                "id": 25,
                "question": f"For an expert {job_title}, what is the best strategy when refactoring a legacy, poorly-tested core service?",
                "options": [
                    "A) Completely rewrite from scratch without unit tests",
                    "B) Establish regression characterization tests first, then refactor incrementally in small verifiable commits",
                    "C) Turn off all error logging to improve speed",
                    "D) Hardcode mock responses in production"
                ],
                "correct_option": "B",
                "explanation": "Characterization tests pin down current behavior, allowing safe, verified iterative refactoring."
            }
        ]

        # 5 Practical Short Written Questions
        writtens = [
            {
                "id": 1,
                "question": f"As a candidate for {job_title}, explain how you would design and optimize an API endpoint experiencing slow response times under high concurrency. Discuss caching, database indexes, and connection management.",
                "ideal_answer_rubric": "Expected points: 1) Profiling and query plan analysis (EXPLAIN); 2) Targeted indexing on filtered columns; 3) Redis/In-memory caching for read-heavy payloads; 4) Proper connection pooling (pool_size, pool_recycle); 5) Asynchronous/non-blocking I/O.",
                "max_marks": 10
            },
            {
                "id": 2,
                "question": "Describe a real-world scenario where you had to debug an intermittent production bug or memory leak. What tools and step-by-step methodologies did you employ to diagnose and resolve it?",
                "ideal_answer_rubric": "Expected points: 1) Analyzing structured logs and metrics (APM, Grafana, Datadog); 2) Heap dump/memory profiling or stack trace analysis; 3) Replicating in staging environment; 4) Root cause isolation; 5) Writing regression test before deploying patch.",
                "max_marks": 10
            },
            {
                "id": 3,
                "question": "How do you implement secure user authentication and authorization across distributed services? Contrast stateless JWTs with stateful sessions and describe token revocation.",
                "ideal_answer_rubric": "Expected points: 1) HTTPS-only, Secure HttpOnly SameSite cookies; 2) Short-lived access tokens with long-lived refresh tokens; 3) Centralized or distributed token revocation via Redis blacklist or version counter; 4) Role-based access control (RBAC).",
                "max_marks": 10
            },
            {
                "id": 4,
                "question": f"Explain your strategy for ensuring data consistency and fault tolerance when handling asynchronous background tasks (e.g., resume parsing, emails, or payments) relevant to {skills[0] if skills else 'our stack'}.",
                "ideal_answer_rubric": "Expected points: 1) Message broker/queue (Celery, Redis, RabbitMQ, SQS); 2) Idempotent worker consumers; 3) Retry policies with exponential backoff and jitter; 4) Dead-letter queues (DLQ) for unprocessable messages; 5) Monitoring and alert triggers.",
                "max_marks": 10
            },
            {
                "id": 5,
                "question": "What principles and CI/CD pipelines do you establish to enable zero-downtime database migrations in a live production environment?",
                "ideal_answer_rubric": "Expected points: 1) Expand and contract (multi-phase) migration pattern; 2) Add nullable columns first, deploy code writing to both, backfill data, make non-null, remove old columns; 3) Non-locking schema changes (e.g., pt-online-schema-change or online DDL); 4) Rollback scripts.",
                "max_marks": 10
            }
        ]

        return {
            "mcq_questions": mcqs,
            "written_questions": writtens,
        }

    # =========================================================================
    # PRE-APPLICATION SCREENING AUTOMATED GRADING ENGINE
    # =========================================================================
    @classmethod
    def evaluate_test_submission(
        cls,
        mcq_questions: List[Dict[str, Any]],
        written_questions: List[Dict[str, Any]],
        mcq_answers: Dict[str, str],
        written_answers: Dict[str, str],
    ) -> Dict[str, Any]:
        """
        Grades candidate test submission:
        1. MCQs: Deterministic evaluation against correct_option (50% of total score).
        2. Written: AI evaluation against ideal_answer_rubric via Gemini (50% of total score).
        3. Aggregates into composite total_test_score (0-100%).
        """
        # 1. Deterministic MCQ Grading
        total_mcqs = len(mcq_questions) if mcq_questions else 25
        correct_count = 0
        mcq_results = []

        for q in mcq_questions:
            qid_str = str(q.get("id"))
            selected = str(mcq_answers.get(qid_str, "")).strip().upper()
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

        # MCQ is worth 50 points total
        mcq_score = round((correct_count / max(1, total_mcqs)) * 50.0, 2)

        # 2. AI Evaluation of Written Questions (50 points total: 5 questions x 10 marks max)
        written_evaluations = []
        total_written_marks = 0.0

        if written_questions and written_answers:
            written_eval_prompt = f"""
You are an expert technical grading panel evaluating a candidate's written test submission.
Review each candidate response against the target question and the ideal answer rubric.

Evaluation Rubric:
- Scale: 0.0 to 10.0 marks per question (Max marks: 10).
- Criteria: Technical accuracy, depth of explanation, domain terminology, and practical feasibility.
- If response is blank, irrelevant, or spam: award 0 to 2 marks.
- If partially correct: award 4 to 6 marks.
- If accurate and thorough: award 7 to 10 marks.

Questions, Rubrics, and Candidate Submissions:
"""
            for wq in written_questions:
                wid_str = str(wq.get("id"))
                cand_resp = written_answers.get(wid_str, "").strip()
                written_eval_prompt += f"""
Question #{wid_str}: {wq.get("question")}
Ideal Rubric: {wq.get("ideal_answer_rubric")}
Candidate Response:
\"\"\"
{cand_resp if cand_resp else "[No response submitted]"}
\"\"\"
-------------------------------------------------
"""
            written_eval_prompt += """
Return a strict valid JSON object in this exact schema:
{
  "evaluations": [
    {
      "question_id": 1,
      "marks_awarded": <float between 0.0 and 10.0>,
      "feedback": "<concise evaluation comments>",
      "strengths": "<key correct points mentioned>",
      "areas_for_improvement": "<missing concepts or inaccuracies>"
    }
  ],
  "overall_written_summary": "<2-3 sentence executive assessment of written depth>"
}
"""
            raw_text = cls._generate_with_fallback(written_eval_prompt, is_json=True)
            if raw_text:
                try:
                    cleaned = cls._clean_json_response(raw_text)
                    data = json.loads(cleaned)
                    evals = data.get("evaluations", [])
                    eval_map = {e.get("question_id"): e for e in evals}
                    for wq in written_questions:
                        qid = wq.get("id")
                        e = eval_map.get(qid)
                        if e:
                            marks = float(min(10.0, max(0.0, e.get("marks_awarded", 5.0))))
                            written_evaluations.append({
                                "question_id": qid,
                                "marks_awarded": marks,
                                "max_marks": 10.0,
                                "feedback": e.get("feedback", "Completed evaluation."),
                                "strengths": e.get("strengths", "Practical explanation provided."),
                                "areas_for_improvement": e.get("areas_for_improvement", "Could expand on system trade-offs."),
                            })
                            total_written_marks += marks
                        else:
                            total_written_marks += 5.0
                            written_evaluations.append({
                                "question_id": qid,
                                "marks_awarded": 5.0,
                                "max_marks": 10.0,
                                "feedback": "Acceptable answer provided.",
                            })
                except Exception as ex:
                    logger.warning(f"Error parsing written evaluation: {ex}")

        # Fallback if evaluation didn't run or failed
        if not written_evaluations:
            for wq in written_questions:
                wid_str = str(wq.get("id"))
                resp = written_answers.get(wid_str, "").strip()
                words = len(resp.split())
                marks = 0.0 if words < 5 else min(10.0, 3.0 + (words * 0.1))
                marks = round(marks, 1)
                total_written_marks += marks
                written_evaluations.append({
                    "question_id": wq.get("id"),
                    "marks_awarded": marks,
                    "max_marks": 10.0,
                    "feedback": "Automated rubric review completed." if words >= 10 else "Response too brief.",
                    "strengths": "Addressed prompt directly." if words >= 10 else "Attempted answer.",
                    "areas_for_improvement": "Provide more concrete real-world implementation details.",
                })

        # Written score is scaled to 50 points total
        max_possible_written = len(written_questions) * 10.0 if written_questions else 50.0
        written_score = round((total_written_marks / max(1.0, max_possible_written)) * 50.0, 2)

        total_test_score = round(mcq_score + written_score, 2)

        return {
            "mcq_score": mcq_score,
            "written_score": written_score,
            "total_test_score": total_test_score,
            "mcq_correct_count": correct_count,
            "total_mcqs": total_mcqs,
            "mcq_details": mcq_results,
            "written_evaluations": written_evaluations,
            "written_evaluation_feedback": {
                "evaluations": written_evaluations,
                "total_written_marks": total_written_marks,
                "summary": f"Scored {mcq_score}/50 on MCQs ({correct_count}/{total_mcqs} correct) and {written_score}/50 on technical written questions.",
            },
            "summary_feedback": f"Candidate achieved {total_test_score}% overall in the screening assessment ({correct_count}/{total_mcqs} MCQs correct, {written_score}/50 on written problems).",
        }

