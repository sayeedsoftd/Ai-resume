import json
from typing import Dict, Any, List, Optional
from app.services.gemini_service import GeminiService
from app.utils.logger import logger


class SalaryBenchmarkService:
    """
    AI Salary Benchmark & Employer Budget Fit Predictor.
    Utilizes Google Gemini Pro and tech market compensation models to analyze:
    - Candidate salary fit vs. employer budget
    - Market compensation bands in Bangladesh / Tech ecosystems
    - Skill justification & counter-offer recommendations
    """

    @classmethod
    def analyze_salary_and_budget_fit(
        cls,
        job_title: str,
        experience_required: int = 0,
        min_salary: Optional[float] = None,
        max_salary: Optional[float] = None,
        candidate_experience_years: float = 1.0,
        candidate_skills: Optional[List[str]] = None,
        candidate_test_score: Optional[float] = None,
        expected_salary: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Analyzes candidate's expected monthly salary against employer's budget and market rates.
        Returns structured analysis with fit status, market estimation, justification, and advice.
        """
        skills_str = ", ".join(candidate_skills or []) if candidate_skills else "General technical skills"
        exp_req = int(experience_required or 0)
        cand_exp = float(candidate_experience_years or 1.0)
        test_score = float(candidate_test_score) if candidate_test_score is not None else 75.0
        exp_salary = float(expected_salary) if expected_salary is not None and expected_salary > 0 else 0.0

        min_sal_display = f"৳{int(min_salary):,}" if min_salary else "Negotiable / Undisclosed"
        max_sal_display = f"৳{int(max_salary):,}" if max_salary else "Undisclosed"
        budget_context = f"{min_sal_display} to {max_sal_display}" if (min_salary or max_salary) else "Open / Negotiable"

        prompt = f"""
You are an expert Compensation Analyst and Technical Talent Recruiter specialized in software and IT salaries.
Analyze the following candidate's salary expectation against the employer's circular budget and current industry benchmarks in Bangladesh (BDT).

POSITION DETAILS:
- Role Title: {job_title}
- Required Experience: {exp_req} years
- Employer Disclosed Budget: {budget_context} (Min: {min_salary}, Max: {max_salary})

CANDIDATE PROFILE:
- Parsed Experience: {cand_exp} years
- Extracted Core Skills: {skills_str}
- Pre-Screening Assessment Test Score: {test_score}%
- Candidate Expected Monthly Salary: ৳{int(exp_salary):,} BDT

EVALUATION RULES:
1. "fit_status": Exactly one of:
   - "WITHIN_BUDGET" (expected salary <= max employer budget)
   - "SLIGHTLY_ABOVE" (expected salary is 1% to 20% above max employer budget)
   - "SIGNIFICANTLY_ABOVE" (expected salary is > 20% above max employer budget)
   - "BELOW_BUDGET" (expected salary is substantially below min budget)
   If budget is undisclosed, evaluate against market standard.
2. "salary_delta_percentage": Percentage delta relative to employer's max budget (positive if above, negative if below, 0.0 if within/undisclosed).
3. "market_rate_estimation": Local monthly benchmark range string in BDT (e.g. "৳45,000 - ৳60,000").
4. "is_justified_by_skills": Boolean. True if the candidate's test score (>= 80%), proven skill stack, or surplus experience warrants their demanded compensation.
5. "ai_rationale": 2-3 sentence recruiter-facing justification explaining whether the candidate's expected compensation is justified by their technical performance, verified skills, and market demand.
6. "recommended_counter_offer": Actionable counter-offer range string in BDT (e.g. "৳48,000 - ৳50,000").

Respond with ONLY a strict JSON object with this EXACT schema:
{{
  "fit_status": "WITHIN_BUDGET",
  "salary_delta_percentage": 10.0,
  "market_rate_estimation": "৳40,000 - ৳52,000",
  "is_justified_by_skills": true,
  "ai_rationale": "Candidate asks for ৳55,000 (+10% above max budget), but their screening exam score is 92% and they possess verified expertise, making this demand competitive and well-justified.",
  "recommended_counter_offer": "৳48,000 - ৳50,000"
}}
"""

        gemini_text = GeminiService._generate_with_fallback(prompt, is_json=True)
        if gemini_text:
            try:
                cleaned = GeminiService._clean_json_response(gemini_text)
                data = json.loads(cleaned)
                if "fit_status" in data and "ai_rationale" in data:
                    data["expected_salary"] = exp_salary
                    data["max_salary"] = max_salary
                    data["min_salary"] = min_salary
                    return data
            except Exception as e:
                logger.warning(f"Error parsing Gemini salary benchmark output: {e}")

        # Deterministic Fallback Evaluator
        logger.info("Using resilient fallback salary fit calculation.")
        max_b = max_salary if max_salary and max_salary > 0 else (exp_salary if exp_salary > 0 else 50000.0)
        min_b = min_salary if min_salary and min_salary > 0 else max_b * 0.75

        delta_pct = 0.0
        if max_salary and max_salary > 0 and exp_salary > 0:
            delta_pct = round(((exp_salary - max_salary) / max_salary) * 100.0, 1)

        if not max_salary or exp_salary == 0:
            fit_status = "WITHIN_BUDGET"
        elif exp_salary <= max_salary:
            if min_salary and exp_salary < min_salary * 0.8:
                fit_status = "BELOW_BUDGET"
            else:
                fit_status = "WITHIN_BUDGET"
        elif delta_pct <= 20.0:
            fit_status = "SLIGHTLY_ABOVE"
        else:
            fit_status = "SIGNIFICANTLY_ABOVE"

        is_justified = (test_score >= 80.0) or (cand_exp >= exp_req + 1)

        market_est = f"৳{int(min_b):,} - ৳{int(max_b * 1.15):,}"

        if fit_status == "WITHIN_BUDGET":
            ai_rationale = (
                f"Candidate's expected salary of ৳{int(exp_salary):,} is fully within the company's disclosed budget of ৳{int(max_b):,} max. "
                f"With a {test_score}% assessment score and {cand_exp} yrs experience, this candidate represents high hiring value."
            )
            counter_offer = f"৳{int(exp_salary):,}"
        elif fit_status == "SLIGHTLY_ABOVE":
            ai_rationale = (
                f"Candidate requests ৳{int(exp_salary):,} (+{delta_pct}% above employer budget). "
                + (
                    f"Their strong screening score ({test_score}%) and skill mastery ({skills_str[:50]}...) justify this premium."
                    if is_justified
                    else "This expectation is slightly above budget; consider negotiating closer to the upper threshold."
                )
            )
            counter_offer = f"৳{int(max_b * 0.95):,} - ৳{int(max_b):,}"
        elif fit_status == "SIGNIFICANTLY_ABOVE":
            ai_rationale = (
                f"Candidate requests ৳{int(exp_salary):,} (+{delta_pct}% over company cap). "
                "Significant gap with employer budget. Counter-offer or alignment required prior to scheduling interviews."
            )
            counter_offer = f"৳{int(max_b):,}"
        else:
            ai_rationale = f"Candidate's salary expectation is modest (৳{int(exp_salary):,}), offering strong cost-efficiency."
            counter_offer = f"৳{int(min_b):,}"

        return {
            "fit_status": fit_status,
            "salary_delta_percentage": delta_pct,
            "market_rate_estimation": market_est,
            "is_justified_by_skills": is_justified,
            "ai_rationale": ai_rationale,
            "recommended_counter_offer": counter_offer,
            "expected_salary": exp_salary,
            "max_salary": max_salary,
            "min_salary": min_salary,
        }
