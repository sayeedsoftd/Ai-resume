import json
import re
import uuid
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

TIER_MULTIPLIERS = {
    "EASY": 1.0,
    "MEDIUM": 1.5,
    "HARD": 2.2,
    "EXPERT": 3.0,
}

TIER_ORDER = ["EASY", "MEDIUM", "HARD", "EXPERT"]


class AdaptiveExamService:
    """
    Dynamic AI Adaptive Testing Engine:
    - Item Response Theory (IRT) & Latent Ability (Theta) scoring
    - Dynamic tier progression: EASY (1.0x) -> MEDIUM (1.5x) -> HARD (2.2x) -> EXPERT (3.0x)
    - Consecutive streak analysis & real-time recalibration
    - Demonstrated Skill Ceiling classification (Junior/Foundational -> Mid -> Senior -> Expert)
    - Resilient multi-tiered question pools and on-demand Gemini Pro generation
    """

    _client: Optional[genai.Client] = None

    @classmethod
    def get_client(cls) -> Optional[genai.Client]:
        if cls._client is None and settings.GEMINI_API_KEY:
            try:
                cls._client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client for Adaptive Testing: {e}")
                return None
        return cls._client

    @classmethod
    def _clean_json_response(cls, text: str) -> str:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
        if match:
            return match.group(0)
        return text

    @classmethod
    def compute_next_tier(cls, current_tier: str, is_correct: bool, streak: int) -> str:
        """
        Dynamically adjusts difficulty tier based on correctness and streak.
        """
        idx = TIER_ORDER.index(current_tier) if current_tier in TIER_ORDER else 1

        if is_correct:
            # Upgrade tier if candidate has 2 consecutive correct answers or solved a HARD/EXPERT problem
            if streak >= 2 or current_tier in ["HARD", "EXPERT"]:
                idx = min(len(TIER_ORDER) - 1, idx + 1)
        else:
            # Step down tier on failure
            if streak <= -1 or current_tier in ["HARD", "EXPERT"]:
                idx = max(0, idx - 1)

        return TIER_ORDER[idx]

    @classmethod
    def update_theta_score(cls, current_theta: float, current_tier: str, is_correct: bool, streak: int) -> float:
        """
        Updates latent ability estimate (Theta) on a 0.0 - 100.0 scale.
        """
        multiplier = TIER_MULTIPLIERS.get(current_tier, 1.5)

        if is_correct:
            gain = 4.0 * multiplier + min(6.0, max(0, streak) * 1.5)
            new_theta = min(100.0, current_theta + gain)
        else:
            loss = 3.5 * (1.0 / multiplier) * 2.0
            new_theta = max(5.0, current_theta - loss)

        return round(new_theta, 1)

    @classmethod
    def calculate_skill_ceiling(cls, final_theta: float, tier_dist: Dict[str, Dict[str, int]]) -> str:
        """
        Identifies candidate's demonstrated skill ceiling.
        """
        expert_stats = tier_dist.get("EXPERT", {"attempted": 0, "correct": 0})
        hard_stats = tier_dist.get("HARD", {"attempted": 0, "correct": 0})
        med_stats = tier_dist.get("MEDIUM", {"attempted": 0, "correct": 0})

        if expert_stats["correct"] >= 2 or (expert_stats["attempted"] > 0 and final_theta >= 85.0):
            return "EXPERT_ARCHITECTURE"
        elif hard_stats["correct"] >= 3 or final_theta >= 70.0:
            return "SENIOR_LEAD"
        elif med_stats["correct"] >= 3 or final_theta >= 50.0:
            return "MID_LEVEL_APPLIED"
        else:
            return "FOUNDATIONAL_JUNIOR"

    @classmethod
    def generate_adaptive_pool(cls, job_title: str, required_skills: List[str]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Generates a balanced multi-tiered pool: 6 Easy, 8 Medium, 8 Hard, 6 Expert MCQs.
        """
        skills_str = ", ".join(required_skills[:5]) if required_skills else job_title
        client = cls.get_client()

        prompt = f"""You are an elite principal technical examiner and psychometrician.
Generate a comprehensive, role-tailored adaptive MCQ question pool for:
Job Title: {job_title}
Core Skills: {skills_str}

Create exactly:
- 4 "EASY" questions (Basic syntax, fundamental definitions, core terminology)
- 6 "MEDIUM" questions (Practical usage, component design, state management, SQL queries, debugging)
- 6 "HARD" questions (Concurrency, race conditions, memory profiling, system architecture, performance optimization)
- 4 "EXPERT" questions (Deep internals, distributed consensus, low-level mechanics, edge-case failure modes)

RETURN STRICT JSON matching this exact structure:
{{
  "EASY": [
    {{
      "id": 1,
      "tier": "EASY",
      "question": "What is the primary purpose of...",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct_option": "A",
      "explanation": "Why A is correct...",
      "topic": "Fundamentals"
    }}
  ],
  "MEDIUM": [ ... ],
  "HARD": [ ... ],
  "EXPERT": [ ... ]
}}
Ensure each question has exactly 4 options prefixed with "A)", "B)", "C)", "D)" and exactly one correct_option letter ("A", "B", "C", or "D").
"""
        config = types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json",
        )

        if client:
            for model_name in GEMINI_MODELS:
                try:
                    logger.info(f"Generating adaptive pool with model '{model_name}' for '{job_title}'...")
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[prompt],
                        config=config,
                    )
                    if response and response.text:
                        cleaned = cls._clean_json_response(response.text)
                        data = json.loads(cleaned)
                        if isinstance(data, dict) and any(t in data for t in TIER_ORDER):
                            cls._assign_weights_and_ids(data)
                            return data
                except Exception as err:
                    logger.warning(f"Adaptive pool generation failed with {model_name}: {err}")

        logger.info(f"Using standard resilient adaptive question generator for {job_title}.")
        return cls._build_fallback_adaptive_pool(job_title, required_skills)

    @classmethod
    def _assign_weights_and_ids(cls, pool: Dict[str, List[Dict[str, Any]]]):
        qid = 1
        for tier in TIER_ORDER:
            q_list = pool.get(tier, [])
            for q in q_list:
                q["id"] = qid
                q["tier"] = tier
                q["weight"] = TIER_MULTIPLIERS.get(tier, 1.5)
                qid += 1

    @classmethod
    def _build_fallback_adaptive_pool(cls, job_title: str, required_skills: List[str]) -> Dict[str, List[Dict[str, Any]]]:
        """Provides a complete resilient fallback question pool across all 4 tiers."""
        skills = required_skills or ["Python", "FastAPI", "React", "PostgreSQL", "Docker"]
        s1 = skills[0] if len(skills) > 0 else "Python"
        s2 = skills[1] if len(skills) > 1 else "Database"
        s3 = skills[2] if len(skills) > 2 else "API Design"

        return {
            "EASY": [
                {
                    "id": 101,
                    "tier": "EASY",
                    "weight": 1.0,
                    "topic": f"{s1} Basics",
                    "question": f"In {s1}, what is the primary benefit of immutability in data structures?",
                    "options": [
                        "A) Prevents unintended side effects during concurrent execution",
                        "B) Increases memory consumption exponentially",
                        "C) Eliminates the need for any unit tests",
                        "D) Disables garbage collection entirely"
                    ],
                    "correct_option": "A",
                    "explanation": "Immutability guarantees thread-safety and prevents accidental mutations across different application scopes."
                },
                {
                    "id": 102,
                    "tier": "EASY",
                    "weight": 1.0,
                    "topic": f"{s2} Fundamentals",
                    "question": "What is the primary purpose of a database index on a frequently searched column?",
                    "options": [
                        "A) Speeds up query retrieval by avoiding sequential table scans",
                        "B) Automatically encrypts the column data at rest",
                        "C) Ensures the column value can never be updated",
                        "D) Compresses table records into text files"
                    ],
                    "correct_option": "A",
                    "explanation": "Indexes maintain an organized data structure (like B-Trees) allowing logarithmic search time instead of full table scans."
                },
                {
                    "id": 103,
                    "tier": "EASY",
                    "weight": 1.0,
                    "topic": "HTTP Status Codes",
                    "question": "Which HTTP status code is most appropriate when a requested resource is created successfully?",
                    "options": ["A) 200 OK", "B) 201 Created", "C) 204 No Content", "D) 301 Moved Permanently"],
                    "correct_option": "B",
                    "explanation": "HTTP 201 Created signifies that the request has succeeded and resulted in the creation of a new resource."
                },
            ],
            "MEDIUM": [
                {
                    "id": 201,
                    "tier": "MEDIUM",
                    "weight": 1.5,
                    "topic": f"{s1} Async / Concurrency",
                    "question": f"When executing asynchronous coroutines in {s1}, what happens if a blocking I/O operation (like time.sleep) is invoked inside an async function?",
                    "options": [
                        "A) It blocks the entire event loop thread, starving other concurrent tasks",
                        "B) The runtime automatically spawns a separate OS process",
                        "C) The blocking call is immediately cancelled with a TimeoutError",
                        "D) Coroutines run faster because the GIL is released"
                    ],
                    "correct_option": "A",
                    "explanation": "In single-threaded event loop models, synchronous blocking calls monopolize the thread and halt all cooperative multi-tasking."
                },
                {
                    "id": 202,
                    "tier": "MEDIUM",
                    "weight": 1.5,
                    "topic": f"{s2} Query Optimization",
                    "question": f"In {s2}, what is the 'N+1 query problem' and how is it most effectively mitigated in Object-Relational Mappers (ORMs)?",
                    "options": [
                        "A) Executing 1 query for parents followed by N queries for each child; solved with eager loading (JOIN or IN queries)",
                        "B) Inserting N+1 duplicate records; solved with database triggers",
                        "C) Indexing more than N columns; solved with composite keys",
                        "D) Exceeding max connection pool limits; solved with exponential backoff"
                    ],
                    "correct_option": "A",
                    "explanation": "N+1 query issue occurs when lazy loading fetches associated child records individually; eager loading solves it in bulk."
                },
                {
                    "id": 203,
                    "tier": "MEDIUM",
                    "weight": 1.5,
                    "topic": f"{s3} Security & Idempotency",
                    "question": "How can an API guarantee idempotency for critical POST transactions like payment processing?",
                    "options": [
                        "A) By accepting a client-generated Idempotency-Key and caching previous responses",
                        "B) By changing the HTTP method from POST to GET",
                        "C) By disabling CORS entirely on the payment gateway",
                        "D) By compressing the request payload with GZIP"
                    ],
                    "correct_option": "A",
                    "explanation": "Unique idempotency keys ensure retry requests return cached results without re-executing state-changing operations."
                },
            ],
            "HARD": [
                {
                    "id": 301,
                    "tier": "HARD",
                    "weight": 2.2,
                    "topic": "Distributed Concurrency",
                    "question": "In a distributed microservices architecture, how do you prevent race conditions and double-spending across multiple API replicas?",
                    "options": [
                        "A) Distributed locks with Redis Redlock or database row-level locking (SELECT FOR UPDATE) within an ACID transaction",
                        "B) Relying solely on client-side button disabling and debounce timers",
                        "C) Enabling HTTP/2 multiplexing between backend nodes",
                        "D) Increasing the thread pool count on the web application server"
                    ],
                    "correct_option": "A",
                    "explanation": "Distributed locks or transactional pessimistic locking guarantee mutual exclusion across horizontally scaled worker nodes."
                },
                {
                    "id": 302,
                    "tier": "HARD",
                    "weight": 2.2,
                    "topic": "High-Volume Database Architecture",
                    "question": "When a table exceeds tens of millions of rows, write latency spikes, and queries slow down. What is the optimal architectural pattern?",
                    "options": [
                        "A) Horizontal partitioning / sharding, range partitioning by date/tenant, and read-replica routing",
                        "B) Storing the entire database inside a JSON file in memory",
                        "C) Replacing all foreign keys with raw string UUIDs",
                        "D) Disabling write-ahead logging (WAL) completely"
                    ],
                    "correct_option": "A",
                    "explanation": "Table partitioning reduces index tree heights and separates hot/cold data, while read replicas offload analytical reads."
                },
                {
                    "id": 303,
                    "tier": "HARD",
                    "weight": 2.2,
                    "topic": "Resilience & Circuit Breaking",
                    "question": "What is the primary function of the Circuit Breaker pattern (e.g., Netflix Hystrix, Resilience4j) in upstream service failures?",
                    "options": [
                        "A) Fails fast when failure thresholds are crossed, preventing cascading failures and allowing downstream services to recover",
                        "B) Reboots the physical server whenever an HTTP 500 status is returned",
                        "C) Discards all incoming network packets silently until CPU usage drops",
                        "D) Automatically converts REST calls into SOAP XML calls"
                    ],
                    "correct_option": "A",
                    "explanation": "Circuit breakers open after consecutive errors, immediately returning fallbacks to avoid resource exhaustion."
                },
            ],
            "EXPERT": [
                {
                    "id": 401,
                    "tier": "EXPERT",
                    "weight": 3.0,
                    "topic": "Distributed Consensus & PACELC",
                    "question": "Under the PACELC theorem, if a distributed database system experiences network partitioning, how does a CP system differ from an AP system during normal operations?",
                    "options": [
                        "A) Even when there is no partition, an PC/EC system must trade off Latency vs Consistency, whereas AP prioritizes Availability and Latency",
                        "B) CP systems guarantee zero latency across all geographic zones regardless of distance",
                        "C) PACELC states that network partitions never occur in modern optical networks",
                        "D) AP systems guarantee strict serializable isolation at zero consistency cost"
                    ],
                    "correct_option": "A",
                    "explanation": "PACELC states that if there is a Partition (P), trade off Availability (A) vs Consistency (C); Else (E), trade off Latency (L) vs Consistency (C)."
                },
                {
                    "id": 402,
                    "tier": "EXPERT",
                    "weight": 3.0,
                    "topic": "Kernel & Memory Architecture",
                    "question": "When building an ultra-low-latency backend, what causes CPU cache thrashing (False Sharing) in multi-threaded architectures, and how is it resolved?",
                    "options": [
                        "A) Threads on different cores modifying independent variables that reside on the same 64-byte cache line; resolved via cache-line padding",
                        "B) Exceeding virtual memory page limits; resolved by deleting swap partitions",
                        "C) Using too many integers in function arguments; resolved by using floats",
                        "D) Running software on 64-bit kernels instead of 32-bit"
                    ],
                    "correct_option": "A",
                    "explanation": "False sharing invalidates L1/L2 cache lines repeatedly when adjacent variables on the same line are mutated by distinct cores; padding aligns variables to distinct lines."
                },
            ]
        }
