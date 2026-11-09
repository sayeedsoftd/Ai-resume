import json
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


class DailyQuizService:
    """
    AI Daily 5-Question Micro-Drill Generator using Google Gemini Pro.
    Generates tailored, high-yield conceptual questions mapped to candidate verified skills.
    """

    _client: Optional[genai.Client] = None

    @classmethod
    def get_client(cls) -> Optional[genai.Client]:
        if cls._client is None and settings.GEMINI_API_KEY:
            try:
                cls._client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client for Daily Quiz Service: {e}")
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
    def generate_daily_micro_quiz(
        cls,
        candidate_skills: Optional[List[str]] = None,
        difficulty: str = "Intermediate",
        target_language: Optional[str] = "en",
    ) -> List[Dict[str, Any]]:
        """
        Generates 5 conceptual multiple-choice questions via Gemini Pro.
        """
        skills_str = ", ".join(candidate_skills) if candidate_skills else "Python, FastAPI, React, SQL, Docker"

        prompt = f"""
You are a Staff Software Engineer and Senior Technical Examiner.
Generate a Daily 5-Question Micro-Skill Drill for a software developer.
Target Skills: {skills_str}
Difficulty Level: {difficulty}

Generate EXACTLY 5 practical, conceptual multiple-choice questions focusing on real-world engineering concepts (e.g. concurrency, database indexing, React state lifecycle, API design, containerization).

Return STRICT JSON as an array of 5 objects matching this schema exactly:
[
  {{
    "id": 1,
    "skill": "FastAPI",
    "question": "What is the primary architectural advantage of using `async def` endpoints over regular `def` in FastAPI?",
    "options": [
      "A) It automatically parallelizes CPU-bound math calculations across multiple CPU cores.",
      "B) It handles I/O-bound tasks concurrently within a single event loop without blocking threads.",
      "C) It encrypts incoming payload requests at the transport layer.",
      "D) It bypasses Pydantic schema validation for higher throughput."
    ],
    "correct_option_index": 1,
    "concise_explanation": "In FastAPI, `async def` runs on the main asyncio event loop, allowing high concurrency during I/O waits without spawning OS threads."
  }}
]

Rules:
1. Each question must have exactly 4 options labeled with "A) ", "B) ", "C) ", "D) ".
2. `correct_option_index` must be an integer from 0 to 3 corresponding to the correct answer.
3. `concise_explanation` must be 1-2 punchy, educational sentences explaining why the answer is correct and why other options are incorrect.
4. Distribute questions across the candidate's skills: {skills_str}.
5. Return ONLY the JSON array. Do not include markdown or conversational commentary outside the JSON.
""" + get_ai_localization_directive(target_language)

        client = cls.get_client()
        if client:
            for model_name in GEMINI_MODELS:
                try:
                    logger.info(f"Generating daily micro-quiz using Gemini model: {model_name}")
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            temperature=0.4,
                            response_mime_type="application/json",
                        ),
                    )
                    if response and response.text:
                        raw_json = cls._clean_json_markdown(response.text)
                        parsed = json.loads(raw_json)
                        if isinstance(parsed, list) and len(parsed) >= 5:
                            logger.info(f"Successfully generated 5 daily questions with {model_name}")
                            return cls._normalize_questions(parsed[:5])
                except Exception as e:
                    logger.warning(f"Gemini {model_name} quiz generation failed: {e}. Trying fallback model...")

        logger.info("Using intelligent curated question bank fallback for daily micro-drill")
        return cls._get_fallback_questions(candidate_skills)

    @classmethod
    def _normalize_questions(cls, questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        normalized = []
        for i, q in enumerate(questions):
            opts = q.get("options") or []
            if len(opts) != 4:
                opts = [
                    "A) First approach",
                    "B) Recommended industry practice",
                    "C) Legacy deprecated method",
                    "D) Anti-pattern",
                ]
            try:
                correct_idx = int(q.get("correct_option_index", 0))
            except Exception:
                correct_idx = 0
            correct_idx = min(3, max(0, correct_idx))

            normalized.append({
                "id": i + 1,
                "skill": q.get("skill") or "Software Engineering",
                "question": q.get("question") or "Which of the following is a recommended best practice?",
                "options": opts,
                "correct_option_index": correct_idx,
                "concise_explanation": q.get("concise_explanation") or "This represents the recommended modern architecture pattern.",
            })
        return normalized

    @classmethod
    def _get_fallback_questions(cls, skills: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Authentic, high-yield software engineering questions used if AI API is unavailable."""
        return [
            {
                "id": 1,
                "skill": "FastAPI",
                "question": "What is the primary architectural advantage of using `async def` endpoints over standard `def` in FastAPI?",
                "options": [
                  "A) It automatically parallelizes CPU-bound calculations across all host cores.",
                  "B) It handles I/O-bound tasks concurrently within a single event loop without blocking worker threads.",
                  "C) It encrypts incoming payload requests at the transport layer.",
                  "D) It disables Pydantic schema validation for higher throughput."
                ],
                "correct_option_index": 1,
                "concise_explanation": "In FastAPI, `async def` runs concurrently on the asyncio event loop, making it optimal for database queries, network requests, and file I/O."
            },
            {
                "id": 2,
                "skill": "React",
                "question": "Why should you avoid mutating state directly in React (e.g., `state.items.push(newItem)`)?",
                "options": [
                  "A) JavaScript throws a syntax error when mutating objects in functional components.",
                  "B) React relies on shallow reference equality (`Object.is`) to detect changes and schedule component re-renders.",
                  "C) Direct mutations immediately trigger infinite re-render loops in useEffect.",
                  "D) React state is frozen as read-only at the browser V8 engine level."
                ],
                "correct_option_index": 1,
                "concise_explanation": "React checks whether object references have changed. Direct mutations keep the exact same memory pointer, preventing React from detecting the update."
            },
            {
                "id": 3,
                "skill": "SQL / PostgreSQL",
                "question": "In PostgreSQL, what is the key difference between a `B-tree` index and a `GIN` (Generalized Inverted) index?",
                "options": [
                  "A) B-tree handles composite scalar comparisons (<, <=, =, >=), while GIN is optimized for indexing composite values like JSONB, full-text arrays, and tags.",
                  "B) GIN indexes are stored in memory only, whereas B-trees are persisted on disk.",
                  "C) B-trees can only index integer columns, while GIN only indexes strings.",
                  "D) GIN indexes do not support concurrency or foreign keys."
                ],
                "correct_option_index": 0,
                "concise_explanation": "B-tree is ideal for single-value equality and range queries, whereas GIN excels at composite items (JSONB attributes, array containment `@>`) where multiple keys point to one row."
            },
            {
                "id": 4,
                "skill": "Docker",
                "question": "What is the primary benefit of Multi-Stage Builds in a production Dockerfile?",
                "options": [
                  "A) They allow multiple containers to share the exact same IP address.",
                  "B) They isolate the build tools and compiler SDKs, producing a dramatically smaller, hardened final image containing only runtime artifacts.",
                  "C) They prevent Docker from caching intermediate layer images.",
                  "D) They run the build process across multiple physical Docker hosts simultaneously."
                ],
                "correct_option_index": 1,
                "concise_explanation": "Multi-stage builds allow compiling in a heavyweight environment (with compilers and devDependencies) and copying only the compiled artifacts into a lightweight distroless/alpine runtime container."
            },
            {
                "id": 5,
                "skill": "Python",
                "question": "In modern Python (3.9+), what is the primary purpose of `__slots__` inside a class definition?",
                "options": [
                  "A) It prevents subclasses from inheriting parent methods.",
                  "B) It optimizes memory usage by preventing the dynamic creation of an internal `__dict__` for each instance.",
                  "C) It automatically converts the class into a thread-safe asynchronous actor.",
                  "D) It enforces static type checking at Python interpreter startup."
                ],
                "correct_option_index": 1,
                "concise_explanation": "`__slots__` instructs Python to reserve a fixed set of attribute pointers in memory rather than maintaining a dynamic hash-map dictionary for every created instance."
            }
        ]
