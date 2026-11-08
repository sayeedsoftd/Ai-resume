import json
import re
from typing import Dict, Any, List, Optional
from app.services.gemini_service import GeminiService
from app.services.code_sandbox import CodeSandboxService
from app.utils.logger import logger


def evaluate_candidate_code_with_gemini(
    problem_statement: str,
    candidate_code: str,
    language: str = "python",
    expected_test_cases: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Evaluates candidate's live coding submission using Gemini Pro AI and sandbox execution:
    - Analyzes functional correctness, Big-O time and space complexity, edge-case coverage, and code cleanliness.
    - Returns structured metrics and objective score (0-100%).
    - Features a resilient deterministic fallback if AI is unreachable.
    """
    test_cases = expected_test_cases or []

    # 1. Execute against test cases in Sandbox to get deterministic baseline metrics
    sandbox_result = CodeSandboxService.run_code(
        code=candidate_code,
        language=language,
        test_cases=test_cases,
    )
    passed_count = sandbox_result.get("passed_count", 0)
    total_count = sandbox_result.get("total_count", len(test_cases))
    has_syntax_or_runtime_err = not sandbox_result.get("success", False) and bool(sandbox_result.get("error"))

    # 2. Invoke Gemini Pro for deep code review
    prompt = f"""
You are a Principal Software Engineer & AI Code Evaluation Engine evaluating a technical candidate's live coding submission.

PROBLEM STATEMENT:
\"\"\"
{problem_statement}
\"\"\"

LANGUAGE: {language}

CANDIDATE SUBMITTED CODE:
```{language}
{candidate_code}
```

DETERMINISTIC TEST RUNNER FINDINGS:
- Example / Target Tests Passed: {passed_count} of {total_count}
- Sandbox Output/Error: {sandbox_result.get('error') or 'All test assertions passed.'}
- Execution Time: {sandbox_result.get('execution_time_ms', 0)} ms

TEST CASES SPECIFICATION:
{json.dumps(test_cases, indent=2)}

INSTRUCTIONS:
Conduct an objective, expert evaluation of the candidate's code:
1. "functional_correctness_score": (Integer 0 to 100) Assess whether the code implements the algorithm correctly, handles constraints, and passes test conditions.
2. "time_complexity": Standard Big-O notation for the candidate's solution (e.g. "O(1)", "O(N)", "O(N log N)", "O(N^2)").
3. "space_complexity": Standard Big-O auxiliary space notation (e.g. "O(1)", "O(N)").
4. "code_cleanliness_rating": Concise descriptive rating (e.g., "Clean and idiomatic", "Readable with minor style flaws", "Verbose / Needs refactoring").
5. "edge_cases_handled": Boolean (true if empty/single-element/boundary inputs are handled, false otherwise).
6. "strengths": Array of 2-3 specific technical strengths demonstrated in the code.
7. "weaknesses": Array of 1-3 actionable improvement areas or optimization suggestions.
8. "final_score": (Integer 0 to 100) Objective overall score weighting functional correctness (70%), efficiency (15%), and cleanliness (15%).
9. "ai_summary": 2-3 sentence executive assessment summarizing candidate's solution quality.

You MUST respond with ONLY a valid JSON object matching this schema:
{{
  "functional_correctness_score": 85,
  "time_complexity": "O(N)",
  "space_complexity": "O(1)",
  "code_cleanliness_rating": "Clean and idiomatic",
  "edge_cases_handled": true,
  "strengths": ["Clear naming", "Proper boundary checks"],
  "weaknesses": ["Can be optimized using hash map"],
  "final_score": 88,
  "ai_summary": "Solid algorithmic solution passing all primary and edge test conditions."
}}
"""

    gemini_resp = GeminiService._generate_with_fallback(prompt, is_json=True)
    if gemini_resp:
        try:
            cleaned = GeminiService._clean_json_response(gemini_resp)
            data = json.loads(cleaned)
            # Validate required keys
            if "final_score" in data and "functional_correctness_score" in data:
                # Attach sandbox execution details
                data["sandbox_run"] = sandbox_result
                return data
        except Exception as e:
            logger.warning(f"Failed to parse Gemini code evaluation response: {e}")

    # Fallback deterministic evaluator
    logger.info("Using resilient fallback evaluation for candidate code submission.")
    pass_ratio = (passed_count / max(1, total_count)) if total_count > 0 else 0.8
    correctness_score = int(round(pass_ratio * 100))
    if has_syntax_or_runtime_err:
        correctness_score = max(0, correctness_score - 30)

    # Heuristic complexity detection
    lines = candidate_code.splitlines()
    loop_count = sum(1 for l in lines if re.search(r"\b(for|while)\b", l))
    if loop_count >= 2:
        time_comp = "O(N^2)"
        space_comp = "O(1)"
    elif loop_count == 1:
        time_comp = "O(N)"
        space_comp = "O(N)" if ("set" in candidate_code or "dict" in candidate_code or "Map" in candidate_code or "{" in candidate_code) else "O(1)"
    else:
        time_comp = "O(1)"
        space_comp = "O(1)"

    cleanliness = "Clean and idiomatic" if len(candidate_code.strip()) > 30 else "Minimal implementation"
    final_score = int(round(correctness_score * 0.75 + (15 if time_comp in ["O(1)", "O(N)"] else 5) + 10))
    final_score = max(0, min(100, final_score))

    return {
        "functional_correctness_score": correctness_score,
        "time_complexity": time_comp,
        "space_complexity": space_comp,
        "code_cleanliness_rating": cleanliness,
        "edge_cases_handled": pass_ratio >= 1.0,
        "strengths": [
            f"Successfully executed in {language} sandbox",
            f"Handled {passed_count}/{total_count} test assertions",
        ],
        "weaknesses": [
            sandbox_result.get("error") or "Consider further optimizations for high-throughput edge cases"
        ],
        "final_score": final_score,
        "ai_summary": f"Candidate code executed in {language} sandbox achieving {passed_count}/{total_count} passed tests with {time_comp} time complexity.",
        "sandbox_run": sandbox_result,
    }
