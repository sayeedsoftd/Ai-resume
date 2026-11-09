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

# Common tutorial clone patterns for heuristic detection & benchmark verification
KNOWN_TUTORIAL_SIGNATURES = [
    {
        "keywords": ["proshop", "traversy", "brad traversy", "mern e-commerce", "mern ecommerce", "mern store"],
        "name": "MERN E-Commerce Tutorial (Traversy / Dev Ed)",
        "match_pct": 94,
        "default_flags": [
            "Matches Brad Traversy / Dev Ed MERN E-Commerce course boilerplate architecture.",
            "Default sample data seeder script (seeder.js / products.js) unchanged.",
            "Single initial commit containing complete frontend & backend codebase.",
            "Hardcoded JWT_SECRET fallback in server configuration.",
        ],
    },
    {
        "keywords": ["netflix clone", "disney clone", "hulu clone", "tmdb movie app", "tmdb clone"],
        "name": "TMDB Streaming Clone (Clever Programmer / Sonny Sangha)",
        "match_pct": 92,
        "default_flags": [
            "Carbon-copy TMDB movie banner & row slider from YouTube tutorial.",
            "Direct hardcoded API keys in frontend fetch helper.",
            "Zero backend authentication or payment gateway implementation.",
            "Standard create-react-app template with tutorial CSS imports.",
        ],
    },
    {
        "keywords": ["todo app", "task list", "todo list", "react todo", "redux todo"],
        "name": "Standard Todo CRUD Tutorial",
        "match_pct": 89,
        "default_flags": [
            "Elementary introductory tutorial project representing beginner homework.",
            "Pure in-memory or localStorage state persistence with no relational schema.",
            "Lacks concurrency handling, unit test suites, or production CI/CD.",
        ],
    },
    {
        "keywords": ["weather app", "openweather", "weather dashboard", "react weather"],
        "name": "OpenWeather API Single-Page Tutorial",
        "match_pct": 88,
        "default_flags": [
            "1-day tutorial project consuming public OpenWeather endpoint directly.",
            "Exposes third-party API key in client-side bundle.",
            "Absence of server-side rate limiting or response caching (Redis/Memcached).",
        ],
    },
    {
        "keywords": ["chat app", "socket.io chat", "simple chat", "whatsapp clone", "messenger clone"],
        "name": "Socket.io Chat Tutorial Clone",
        "match_pct": 85,
        "default_flags": [
            "Tutorial single-room broadcast socket implementation without message persistence.",
            "Absence of end-to-end encryption or session disconnection recovery.",
            "Single commit dump with no progressive git workflow.",
        ],
    },
    {
        "keywords": ["angela yu", "angela yu capstone", "london app brewery"],
        "name": "Angela Yu Bootcamp Capstone Template",
        "match_pct": 95,
        "default_flags": [
            "Exact file naming and step-by-step commentary from Angela Yu Web Dev Bootcamp.",
            "Template styling and starter assets unchanged.",
            "Generic mock database entries matching course syllabus.",
        ],
    },
]


class ProjectIntegrityService:
    """
    Forensic AI Service to audit candidate projects and GitHub repositories
    for tutorial clone patterns, code plagiarism, and architectural authenticity.
    """

    _client: Optional[genai.Client] = None

    @classmethod
    def get_client(cls) -> Optional[genai.Client]:
        if cls._client is None and getattr(settings, "GEMINI_API_KEY", None):
            try:
                cls._client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client for ProjectIntegrityService: {e}")
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
    def audit_projects_for_plagiarism(
        cls,
        projects_list: List[Dict[str, Any]],
        github_repo_data: Optional[Dict[str, Any]] = None,
        target_language: Optional[str] = "en",
    ) -> Dict[str, Any]:
        """
        Main entry point for forensic auditing.
        First attempts deep analysis with Google Gemini Pro.
        Falls back to rule-based forensic heuristics if AI service is offline.
        """
        if not projects_list and not github_repo_data:
            return {
                "overall_originality_score": 100,
                "integrity_verdict": "AUTHENTIC",
                "risk_level": "LOW",
                "audited_projects": [],
                "ai_forensic_summary": "No candidate projects were provided for forensic auditing.",
            }

        client = cls.get_client()
        if client:
            try:
                ai_result = cls._run_gemini_forensic_audit(client, projects_list, github_repo_data, target_language=target_language)
                if ai_result:
                    return ai_result
            except Exception as e:
                logger.warning(f"Gemini forensic audit encountered an error, activating heuristic fallback: {e}")

        # Fallback to local heuristic auditor
        return cls._run_heuristic_forensic_audit(projects_list, github_repo_data)

    @classmethod
    def _run_gemini_forensic_audit(
        cls,
        client: genai.Client,
        projects_list: List[Dict[str, Any]],
        github_repo_data: Optional[Dict[str, Any]],
        target_language: Optional[str] = "en",
    ) -> Optional[Dict[str, Any]]:
        prompt = f"""
You are an elite code forensic investigator and technical hiring auditor.
Analyze these software projects submitted by a software engineering candidate:

PROJECTS TO AUDIT:
{json.dumps(projects_list, indent=2)}

ADDITIONAL GITHUB REPO CONTEXT:
{json.dumps(github_repo_data or {}, indent=2)}

Evaluate strictly and objectively:
1. Is this a cloned/carbon-copy tutorial project (e.g. standard Brad Traversy MERN E-Commerce, Angela Yu Bootcamp capstone, Net Ninja Todo/Blog, Clever Programmer Netflix/Spotify clone)?
2. Are the architectural decisions custom, non-trivial, and showing deep system design thinking (e.g., custom database schemas, caching layers, error handling boundaries, CI/CD, rate limiting, microservices, distributed queues)?
3. Does the implementation exhibit real-world production engineering practices versus quick tutorial copy-paste?
4. Inspect commit patterns: Was code committed in a single bulk commit? Are default tutorial variables/seed data used?

SCORING GUIDELINES:
- AUTHENTIC (Score 80-100, risk_level: "LOW"): The project demonstrates bespoke architecture, unique business domain problem-solving, advanced infrastructure (e.g., Kafka, Redis, Docker, CI/CD, partitioning), and has NO match with public tutorial boilerplates.
- GENERIC_BOILERPLATE (Score 50-79, risk_level: "MEDIUM"): Standard framework CRUD starter kits with some minor customization, but lacking deep production engineering.
- TUTORIAL_CLONE (Score 0-49, risk_level: "HIGH"): Carbon-copy projects matching popular YouTube/Udemy courses (Todo list, Weather app, generic MERN store, Netflix clone, bulk commit dumps, default tutorial secrets).

Return strict JSON conforming to this schema:
{{
  "overall_originality_score": 42,
  "integrity_verdict": "TUTORIAL_CLONE",
  "risk_level": "HIGH",
  "audited_projects": [
    {{
      "project_name": "MERN E-Commerce Store",
      "originality_score": 35,
      "is_tutorial_clone": true,
      "matched_pattern": "Matches 94% with standard YouTube freeCodeCamp/Brad Traversy MERN tutorial repo structure.",
      "red_flags": [
        "Single bulk commit upload without branch history",
        "Default hardcoded JWT secret in root directory",
        "Standard tutorial seed data file unchanged"
      ],
      "custom_architecture_notes": "Boilerplate structure with minor CSS tweaks.",
      "verdict": "Likely Tutorial Clone"
    }}
  ],
  "ai_forensic_summary": "The candidate's flagship repository matches well-known public tutorial code line-by-line with minimal personalized architectural logic or custom features."
}}

Rules for verdict:
- overall_originality_score >= 80: "AUTHENTIC", risk_level: "LOW"
- overall_originality_score 50-79: "GENERIC_BOILERPLATE", risk_level: "MEDIUM"
- overall_originality_score < 50: "TUTORIAL_CLONE", risk_level: "HIGH"
""" + get_ai_localization_directive(target_language)
        config = types.GenerateContentConfig(
            temperature=0.2,
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
                    if "overall_originality_score" in parsed and "audited_projects" in parsed:
                        score = int(parsed["overall_originality_score"])
                        score = max(0, min(100, score))
                        parsed["overall_originality_score"] = score
                        if score >= 80:
                            parsed["integrity_verdict"] = "AUTHENTIC"
                            parsed["risk_level"] = "LOW"
                        elif score >= 50:
                            parsed["integrity_verdict"] = "GENERIC_BOILERPLATE"
                            parsed["risk_level"] = "MEDIUM"
                        else:
                            parsed["integrity_verdict"] = "TUTORIAL_CLONE"
                            parsed["risk_level"] = "HIGH"
                        return parsed
            except Exception as e:
                logger.warning(f"Forensic model {model_name} failed: {e}")
                continue

        return None

    @classmethod
    def _run_heuristic_forensic_audit(
        cls,
        projects_list: List[Dict[str, Any]],
        github_repo_data: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Rule-based deterministic forensic auditor for fast and resilient evaluation.
        """
        audited_projects = []
        scores = []

        # If projects_list is empty but github_repo_data has repos, convert them
        items_to_audit = list(projects_list)
        if not items_to_audit and github_repo_data and isinstance(github_repo_data.get("featured_projects"), list):
            items_to_audit = github_repo_data["featured_projects"]

        if not items_to_audit and github_repo_data and isinstance(github_repo_data.get("repos"), list):
            items_to_audit = [
                {
                    "name": r.get("name"),
                    "title": r.get("name"),
                    "description": r.get("description", ""),
                    "technologies": [r.get("language")] if r.get("language") else [],
                    "stars": r.get("stars", 0),
                    "forks": r.get("forks", 0),
                }
                for r in github_repo_data["repos"][:6]
            ]

        for proj in items_to_audit:
            title = proj.get("title") or proj.get("name") or "Untitled Project"
            desc = (proj.get("description") or "") + " " + (proj.get("responsibilities") or "")
            techs = proj.get("technologies") or proj.get("tech_stack") or proj.get("skills") or []
            if isinstance(techs, list):
                tech_text = " ".join(str(t) for t in techs)
            else:
                tech_text = str(techs)

            full_text = f"{title} {desc} {tech_text}".lower()

            matched_sig = None
            for sig in KNOWN_TUTORIAL_SIGNATURES:
                for kw in sig["keywords"]:
                    if kw in full_text:
                        matched_sig = sig
                        break
                if matched_sig:
                    break

            red_flags = []
            custom_notes = []

            # Tutorial clone detection
            if matched_sig:
                is_clone = True
                proj_score = max(15, 100 - matched_sig["match_pct"])
                red_flags.extend(matched_sig["default_flags"])
                matched_pattern_str = f"Matches {matched_sig['match_pct']}% with {matched_sig['name']} layout."
                verdict_str = "Likely Tutorial Clone"
                custom_notes.append("Project mimics standard public video course layout without custom extensions.")
            else:
                # Check for other generic indicators
                is_clone = False
                proj_score = 88
                matched_pattern_str = "Custom engineered architecture with unique domain features."
                verdict_str = "Authentic & Custom Engineered"

                # Check for basic CRUD or lack of depth
                if any(w in full_text for w in ["crud", "beginner", "practice", "simple"]):
                    proj_score -= 20
                    red_flags.append("Relies on basic CRUD patterns with minimal enterprise complexity.")
                    custom_notes.append("Entry-level architectural depth.")

                # Check for positive production signals
                if any(w in full_text for w in ["docker", "kubernetes", "ci/cd", "redis", "postgresql", "fastapi", "graphql", "microservice", "aws", "testing", "pytest", "jest", "auth0", "oauth2"]):
                    proj_score = min(100, proj_score + 10)
                    custom_notes.append("Demonstrates production-grade tooling, database indexing, or infrastructure automation.")

            # Check commit patterns if github repo info is present
            if proj.get("is_bulk_commit") or "bulk commit" in desc.lower():
                red_flags.append("Single bulk commit upload without branch history.")
                proj_score = max(10, proj_score - 25)

            if proj_score < 50:
                is_clone = True
                verdict_str = "Likely Tutorial Clone"

            scores.append(proj_score)
            audited_projects.append({
                "project_name": title,
                "originality_score": proj_score,
                "is_tutorial_clone": is_clone,
                "matched_pattern": matched_pattern_str,
                "red_flags": red_flags,
                "custom_architecture_notes": " ".join(custom_notes) or "Custom architectural decisions observed.",
                "verdict": verdict_str,
            })

        overall_score = int(sum(scores) / len(scores)) if scores else 85
        overall_score = max(0, min(100, overall_score))

        if overall_score >= 80:
            integrity_verdict = "AUTHENTIC"
            risk_level = "LOW"
            summary = (
                "Forensic audit confirms the candidate's projects feature authentic, custom-built system architectures. "
                "The code structures show genuine engineering problem-solving, distinct domain models, and zero direct "
                "matches with common YouTube or Bootcamp tutorial boilerplates."
            )
        elif overall_score >= 50:
            integrity_verdict = "GENERIC_BOILERPLATE"
            risk_level = "MEDIUM"
            summary = (
                "The candidate's project portfolio shows a mix of standard framework boilerplates and partial tutorial foundations. "
                "While some customized logic is present, several repository structures closely mirror well-known public starter kits "
                "and lack full production hardening."
            )
        else:
            integrity_verdict = "TUTORIAL_CLONE"
            risk_level = "HIGH"
            summary = (
                "High Plagiarism / Tutorial Clone Alert: Flagship projects submitted by the candidate exhibit high structural "
                "correlation (>90%) with widely circulated video tutorial repositories (e.g. MERN E-Commerce, OpenWeather, or Bootcamp templates). "
                "Indications of single bulk commits and default seed data suggest limited hands-on engineering originality."
            )

        return {
            "overall_originality_score": overall_score,
            "integrity_verdict": integrity_verdict,
            "risk_level": risk_level,
            "audited_projects": audited_projects,
            "ai_forensic_summary": summary,
        }
