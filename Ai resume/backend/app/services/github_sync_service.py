import json
import re
from typing import Dict, Any, List, Optional
import httpx
from fastapi import HTTPException, status
from google import genai
from google.genai import types
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.profile import UserProfile
from app.models.user import User
from app.utils.logger import logger

GEMINI_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-flash-latest",
]


def clean_github_username(raw: str) -> str:
    """Extract clean username from raw input or full profile URL."""
    if not raw:
        return ""
    cleaned = raw.strip()
    # Handle full URLs like https://github.com/username/ or github.com/username
    if "github.com/" in cleaned.lower():
        match = re.search(r"github\.com/([a-zA-Z0-9_\-]+)", cleaned, re.IGNORECASE)
        if match:
            return match.group(1)
    # Strip protocol and slashes
    cleaned = re.sub(r"^https?://", "", cleaned)
    cleaned = cleaned.strip("@/ ")
    return cleaned.split("/")[0]


class GitHubSyncService:
    """
    Service to fetch public developer profiles and repositories from GitHub REST API
    and enrich profile data (headline, bio, skills, featured projects) using Google Gemini Pro.
    """

    _client: Optional[genai.Client] = None

    @classmethod
    def get_client(cls) -> Optional[genai.Client]:
        if cls._client is None and settings.GEMINI_API_KEY:
            try:
                cls._client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client for GitHubSyncService: {e}")
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
    async def fetch_github_raw_data(cls, username: str) -> Dict[str, Any]:
        """
        Queries GitHub REST API asynchronously to retrieve user metadata and top repositories.
        """
        headers = {
            "User-Agent": "AiResume-Platform-Client/1.0",
            "Accept": "application/vnd.github.v3+json",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            user_url = f"https://api.github.com/users/{username}"
            user_res = await client.get(user_url, headers=headers)

            if user_res.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"GitHub account '{username}' was not found. Please verify the username or profile URL.",
                )
            elif user_res.status_code in (403, 429):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="GitHub API rate limit exceeded. Please try again shortly.",
                )
            elif user_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"GitHub API returned error (HTTP {user_res.status_code}).",
                )

            user_data = user_res.json()

            # Fetch top repositories sorted by recent push
            repos_url = f"https://api.github.com/users/{username}/repos?sort=pushed&per_page=15"
            repos_res = await client.get(repos_url, headers=headers)
            repos_data = repos_res.json() if repos_res.status_code == 200 else []

        # Aggregate language distribution, stars, forks
        language_counts: Dict[str, int] = {}
        total_stars = 0
        total_forks = 0
        filtered_repos: List[Dict[str, Any]] = []

        for r in repos_data:
            if not isinstance(r, dict):
                continue
            is_fork = r.get("fork", False)
            stars = r.get("stargazers_count", 0) or 0
            forks = r.get("forks_count", 0) or 0
            total_stars += stars
            total_forks += forks

            lang = r.get("language")
            if lang and lang.strip():
                language_counts[lang] = language_counts.get(lang, 0) + 1

            filtered_repos.append({
                "name": r.get("name", ""),
                "full_name": r.get("full_name", ""),
                "description": r.get("description") or "",
                "language": lang or "Other",
                "stars": stars,
                "forks": forks,
                "url": r.get("html_url", ""),
                "is_fork": is_fork,
                "topics": r.get("topics", []) or [],
                "updated_at": r.get("updated_at", ""),
            })

        # Rank repositories: non-forks prioritized, sorted by stars then forks
        ranked_repos = sorted(
            filtered_repos,
            key=lambda x: (not x["is_fork"], x["stars"], x["forks"]),
            reverse=True,
        )
        top_repos = ranked_repos[:5]

        # Sorted languages by frequency
        sorted_languages = sorted(
            language_counts.keys(),
            key=lambda l: language_counts[l],
            reverse=True,
        )

        return {
            "username": user_data.get("login", username),
            "name": user_data.get("name") or user_data.get("login", username),
            "avatar_url": user_data.get("avatar_url", ""),
            "profile_url": user_data.get("html_url", f"https://github.com/{username}"),
            "bio": user_data.get("bio") or "",
            "company": user_data.get("company") or "",
            "location": user_data.get("location") or "",
            "blog": user_data.get("blog") or "",
            "public_repos": user_data.get("public_repos", len(repos_data)),
            "followers": user_data.get("followers", 0),
            "total_stars": total_stars,
            "total_forks": total_forks,
            "detected_languages": sorted_languages,
            "top_repos": top_repos,
        }

    @classmethod
    def enrich_profile_with_gemini(
        cls,
        username: str,
        raw_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Uses Gemini Pro to analyze repository data and generate structured headline,
        impactful 3-sentence engineering bio, verified technical skills, and featured projects.
        """
        top_languages = raw_data.get("detected_languages", [])
        langs_str = ", ".join(top_languages[:6]) if top_languages else "Software Development"
        repos_summary = []
        for r in raw_data.get("top_repos", [])[:4]:
            topics_str = ", ".join(r.get("topics", [])[:4])
            repos_summary.append(
                f"- Name: {r.get('name')} | Language: {r.get('language')} | Stars: {r.get('stars')} | Description: {r.get('description')} | Topics: {topics_str} | URL: {r.get('url')}"
            )
        repos_text = "\n".join(repos_summary) if repos_summary else "No public repositories listed."

        user_bio = raw_data.get("bio", "")
        dev_name = raw_data.get("name", username)

        prompt = f"""
You are an expert technical recruiter and resume builder.
Analyze this raw GitHub developer profile data for '{dev_name}' (@{username}):

Developer GitHub Information:
- Full Name: {dev_name}
- GitHub Bio: {user_bio or 'N/A'}
- Primary Languages: {langs_str}
- Public Repositories: {raw_data.get('public_repos', 0)}
- Total Stars: {raw_data.get('total_stars', 0)}
- Top Repositories:
{repos_text}

Generate clean, structured JSON matching this EXACT schema:
{{
  "headline": "e.g., Full-Stack Software Engineer | Python, React, FastAPI",
  "bio": "Impactful 3-sentence engineering biography emphasizing core technical strengths, development philosophy, and repository contributions.",
  "extracted_skills": ["Python", "FastAPI", "React", "Docker", "PostgreSQL", "Tailwind CSS"],
  "featured_projects": [
    {{
      "name": "Project Name",
      "description": "2-sentence technical summary detailing architecture, features, and capabilities.",
      "tech_stack": ["Python", "FastAPI", "Docker"],
      "url": "https://github.com/..."
    }}
  ]
}}

Rules:
1. "headline" must be punchy, professional, and spotlight 2-3 dominant technologies from repos.
2. "bio" MUST be exactly 3 sentences long:
   - Sentence 1: Background, technical focus, and primary architectural stacks.
   - Sentence 2: Concrete development strengths, code craft, or problem-solving specialization.
   - Sentence 3: Value proposition, open-source passion, and enthusiasm for building scalable products.
3. "extracted_skills" should extract 6 to 12 relevant modern programming languages, frameworks, databases, and tools evident in the repos or common modern companion tools (e.g. Git, Docker, REST APIs, Tailwind CSS).
4. "featured_projects" must contain up to 3 best repositories from the list, with clear descriptions, tech stack lists, and GitHub URLs.
Return ONLY valid JSON.
"""

        client = cls.get_client()
        if client:
            for model_name in GEMINI_MODELS:
                try:
                    logger.info(f"Enriching GitHub profile using Gemini model: {model_name}")
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            temperature=0.3,
                            response_mime_type="application/json",
                        ),
                    )
                    if response and response.text:
                        clean_text = cls._clean_json_markdown(response.text)
                        parsed = json.loads(clean_text)
                        logger.info(f"Successfully generated profile enrichment with {model_name}")
                        return cls._normalize_ai_response(parsed, raw_data)
                except Exception as e:
                    logger.warning(f"Gemini {model_name} failed for GitHub sync: {e}. Trying next...")

        # Fallback if Gemini API fails
        logger.info("Using intelligent rule-based fallback for GitHub Profile Sync")
        return cls._generate_intelligent_fallback(raw_data)

    @classmethod
    def _normalize_ai_response(cls, data: Dict[str, Any], raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validates and guarantees non-empty fields."""
        top_langs = raw_data.get("detected_languages", [])
        primary_lang = top_langs[0] if top_langs else "Software"

        headline = data.get("headline")
        if not headline or len(headline) < 5:
            headline = f"Software Engineer | {', '.join(top_langs[:3]) or 'Full-Stack Development'}"

        bio = data.get("bio")
        if not bio or len(bio) < 20:
            bio = (
                f"Passionate software developer with public code repositories demonstrating expertise in {primary_lang}. "
                "Dedicated to engineering clean, maintainable systems and responsive user experiences. "
                "Active contributor committed to continuous learning and high-impact engineering solutions."
            )

        extracted_skills = data.get("extracted_skills") or []
        if not isinstance(extracted_skills, list) or len(extracted_skills) == 0:
            extracted_skills = list(set(top_langs + ["Git", "REST APIs", "SQL"]))

        featured_projects = data.get("featured_projects") or []
        if not isinstance(featured_projects, list) or len(featured_projects) == 0:
            featured_projects = []
            for r in raw_data.get("top_repos", [])[:3]:
                featured_projects.append({
                    "name": r.get("name", "Repository"),
                    "description": r.get("description") or f"Open-source repository created with {r.get('language')}.",
                    "tech_stack": [r.get("language")] if r.get("language") != "Other" else ["Software"],
                    "url": r.get("url", ""),
                })

        return {
            "headline": headline,
            "bio": bio,
            "extracted_skills": extracted_skills[:14],
            "featured_projects": featured_projects[:3],
        }

    @classmethod
    def _generate_intelligent_fallback(cls, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Provides a structured fallback when Gemini is offline."""
        top_langs = raw_data.get("detected_languages", [])
        dev_name = raw_data.get("name", "Software Developer")
        primary_lang = top_langs[0] if top_langs else "Software"
        secondary_langs = ", ".join(top_langs[:3]) if top_langs else "Modern Frameworks"

        headline = f"Full-Stack Developer | {secondary_langs}"
        bio = (
            f"{dev_name} is an active software developer with a portfolio of {raw_data.get('public_repos', 0)} public repositories specializing in {primary_lang}. "
            f"Focused on delivering high-quality, production-ready applications with strong attention to code maintainability and modern best practices. "
            "Passionate about open-source collaboration, continuous skill growth, and solving complex real-world engineering challenges."
        )

        skills = list(dict.fromkeys(top_langs + ["Git", "GitHub Actions", "RESTful APIs", "Docker", "Database Design"]))

        featured = []
        for r in raw_data.get("top_repos", [])[:3]:
            techs = [r.get("language")] if r.get("language") and r.get("language") != "Other" else []
            techs.extend(r.get("topics", [])[:2])
            featured.append({
                "name": r.get("name", "Project"),
                "description": r.get("description") or f"Software application built with {r.get('language') or 'modern web technologies'}.",
                "tech_stack": techs or ["Web Development"],
                "url": r.get("url", ""),
            })

        return {
            "headline": headline,
            "bio": bio,
            "extracted_skills": skills[:12],
            "featured_projects": featured,
        }

    @classmethod
    async def sync_github_for_user(
        cls,
        user: User,
        raw_username_or_url: str,
        db: Session,
        apply_to_profile: bool = True,
    ) -> Dict[str, Any]:
        """
        Executes full pipeline:
        1. Parse and validate GitHub username
        2. Query GitHub REST API
        3. Run Gemini Pro AI analysis
        4. Persist to UserProfile if apply_to_profile is True
        """
        username = clean_github_username(raw_username_or_url)
        if not username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please provide a valid GitHub username or profile URL.",
            )

        # 1. Fetch raw data from GitHub
        raw_data = await cls.fetch_github_raw_data(username)

        # 2. Enrich with Gemini Pro
        ai_data = cls.enrich_profile_with_gemini(username, raw_data)

        # 3. Save to UserProfile if requested
        if apply_to_profile:
            profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
            if not profile:
                profile = UserProfile(user_id=user.id)
                db.add(profile)

            # Update headline & bio if empty or replace with enriched version
            profile.headline = ai_data["headline"]
            profile.bio = ai_data["bio"]

            # Merge skills cleanly
            existing_skills = profile.skills or []
            if isinstance(existing_skills, list):
                combined = list(existing_skills)
                for s in ai_data["extracted_skills"]:
                    if not any(es.lower() == s.lower() for es in combined):
                        combined.append(s)
                profile.skills = combined
            else:
                profile.skills = ai_data["extracted_skills"]

            # Save featured projects
            profile.projects = ai_data["featured_projects"]

            # Update contact info with GitHub link
            contact = dict(profile.contact_info or {})
            contact["github"] = raw_data["profile_url"]
            profile.contact_info = contact

            # Cache GitHub sync data
            profile.github_username = username
            profile.github_data = {
                "raw_stats": {
                    "public_repos": raw_data["public_repos"],
                    "total_stars": raw_data["total_stars"],
                    "total_forks": raw_data["total_forks"],
                    "detected_languages": raw_data["detected_languages"],
                    "avatar_url": raw_data["avatar_url"],
                    "profile_url": raw_data["profile_url"],
                },
                "ai_synthesis": ai_data,
            }

            # If user has no photo, auto-fill avatar from GitHub
            if not profile.photo_url and raw_data.get("avatar_url"):
                profile.photo_url = raw_data["avatar_url"]

            db.commit()
            db.refresh(profile)

        return {
            "success": True,
            "username": username,
            "avatar_url": raw_data.get("avatar_url"),
            "profile_url": raw_data.get("profile_url"),
            "raw_stats": {
                "name": raw_data.get("name"),
                "bio": raw_data.get("bio"),
                "company": raw_data.get("company"),
                "location": raw_data.get("location"),
                "public_repos": raw_data.get("public_repos"),
                "total_stars": raw_data.get("total_stars"),
                "total_forks": raw_data.get("total_forks"),
                "detected_languages": raw_data.get("detected_languages"),
            },
            "headline": ai_data["headline"],
            "bio": ai_data["bio"],
            "extracted_skills": ai_data["extracted_skills"],
            "featured_projects": ai_data["featured_projects"],
            "profile_applied": apply_to_profile,
        }
