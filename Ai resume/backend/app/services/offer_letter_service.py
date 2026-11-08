import json
import re
import uuid
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


class OfferLetterService:
    """
    1-Click AI Offer Letter & Employment Contract Generator.
    Utilizes Google Gemini Pro to draft formal, legally sound, and executive-ready
    corporate appointment letters and employment contracts.
    """

    _client: Optional[genai.Client] = None

    @classmethod
    def get_client(cls) -> Optional[genai.Client]:
        if cls._client is None and settings.GEMINI_API_KEY:
            try:
                cls._client = genai.Client(api_key=settings.GEMINI_API_KEY)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client for Offer Letter Generator: {e}")
                return None
        return cls._client

    @classmethod
    def _clean_markdown(cls, text: str) -> str:
        text = text.strip()
        if text.startswith("```html"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()

    @classmethod
    def generate_offer_letter_with_gemini(
        cls,
        candidate_name: str,
        company_name: str,
        job_title: str,
        salary_bdt: float,
        joining_date: str,
        workplace_type: str = "Remote",
        probation_months: int = 3,
        custom_perks: Optional[str] = None,
        department: Optional[str] = None,
        supervisor_title: Optional[str] = None,
        recruiter_name: Optional[str] = None,
    ) -> str:
        """
        Drafts a full corporate appointment letter in clean, styled HTML format.
        Tries Gemini models sequentially; falls back to an executive HTML template if needed.
        """
        client = cls.get_client()
        today_str = datetime.now(timezone.utc).strftime("%B %d, %Y")
        ref_code = f"OFFER-{company_name[:3].upper()}-{uuid.uuid4().hex[:6].upper()}"
        formatted_salary = f"৳{int(salary_bdt):,}"
        annual_salary = f"৳{int(salary_bdt * 12):,}"
        dept_str = department or "Technology & Engineering"
        supervisor_str = supervisor_title or "Engineering Director / VP of Technology"
        perks_str = custom_perks or "Performance bonus, annual festival allowances, healthcare coverage, and paid annual leave."
        recruiter_display = recruiter_name or "Talent Acquisition & Human Resources"

        prompt = f"""
You are an expert Corporate Legal Counsel and Chief People Officer.
Draft a complete, executive, and legally sound Employment Offer & Formal Appointment Letter in clean, self-contained HTML for an incoming hire.

KEY OFFER DETAILS:
- Reference Code: {ref_code}
- Issue Date: {today_str}
- Candidate Full Name: {candidate_name}
- Hiring Company: {company_name}
- Job Title: {job_title}
- Department: {dept_str}
- Reporting Line: {supervisor_str}
- Work Model: {workplace_type} (e.g., Remote / Hybrid / On-site)
- Monthly Gross Remuneration: {formatted_salary} BDT per month (Annualized: {annual_salary} BDT)
- Target Commencement Date (Joining Date): {joining_date}
- Probationary Period: {probation_months} months
- Additional Benefits & Perks: {perks_str}
- Authorized Signatory: {recruiter_display}, {company_name}

HTML FORMATTING SPECIFICATIONS:
1. Return ONLY pure HTML without markdown backticks.
2. Structure:
   - Header with Company Name, Official Offer Notice, Issue Date, and Reference Code.
   - Formal Personal Salutation addressing {candidate_name}.
   - Section 1: Position & Reporting (Scope of appointment, department, work arrangement).
   - Section 2: Compensation & Benefits (Structured table showing monthly gross, annual total, and perks).
   - Section 3: Probation & Performance Confirmation ({probation_months} months, evaluation terms).
   - Section 4: Confidentiality, Intellectual Property & Standard Business Ethics.
   - Section 5: Acceptance Protocol (instructions to accept via digital signature on the platform).
   - Section 6: Official Signature Block (Company Authorized Officer signature space + Candidate Acceptance signature and date line).
3. Styling: Use clean inline Tailwind-like or inline CSS styling (max-width: 800px, font-family: 'Inter', sans-serif, border, padding, neutral slate tones, high readability).
Do not truncate or summarize. Write the full comprehensive text of the formal agreement.
"""

        if client:
            config = types.GenerateContentConfig(
                temperature=0.2,
            )
            for model_name in GEMINI_MODELS:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=config,
                    )
                    if response and response.text and len(response.text.strip()) > 300:
                        cleaned = cls._clean_markdown(response.text)
                        return cleaned
                except Exception as e:
                    logger.warning(f"Gemini model {model_name} failed on offer letter generation: {e}")

        # Resilient Fallback Template
        logger.info("Using executive fallback offer letter template.")
        return cls._get_fallback_template(
            candidate_name=candidate_name,
            company_name=company_name,
            job_title=job_title,
            formatted_salary=formatted_salary,
            annual_salary=annual_salary,
            joining_date=joining_date,
            workplace_type=workplace_type,
            probation_months=probation_months,
            perks_str=perks_str,
            dept_str=dept_str,
            supervisor_str=supervisor_str,
            recruiter_display=recruiter_display,
            today_str=today_str,
            ref_code=ref_code,
        )

    @classmethod
    def _get_fallback_template(
        cls,
        candidate_name: str,
        company_name: str,
        job_title: str,
        formatted_salary: str,
        annual_salary: str,
        joining_date: str,
        workplace_type: str,
        probation_months: int,
        perks_str: str,
        dept_str: str,
        supervisor_str: str,
        recruiter_display: str,
        today_str: str,
        ref_code: str,
    ) -> str:
        return f"""
<div style="max-width: 780px; margin: 0 auto; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; color: #1e293b; line-height: 1.6; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; padding: 48px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
  <!-- Corporate Header -->
  <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start;">
    <div>
      <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">{company_name}</h1>
      <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">Corporate Headquarters • People & Talent Operations</p>
    </div>
    <div style="text-align: right;">
      <span style="display: inline-block; background: #e0e7ff; color: #3730a3; font-size: 11px; font-weight: 700; padding: 4px 10px; rounded: 6px; text-transform: uppercase; border-radius: 6px;">Official Appointment</span>
      <p style="font-size: 12px; color: #64748b; margin: 6px 0 0 0; font-family: monospace;">Ref: {ref_code}</p>
      <p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">Date: {today_str}</p>
    </div>
  </div>

  <!-- Salutation -->
  <div style="margin-bottom: 24px;">
    <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">Dear {candidate_name},</p>
    <p style="font-size: 14px; color: #334155; margin: 0;">
      Following our evaluation and technical screening rounds, we are thrilled to formally offer you the position of <strong>{job_title}</strong> with <strong>{company_name}</strong>. Your skills, demonstrated expertise, and problem-solving abilities align exceptionally well with our strategic goals.
    </p>
  </div>

  <!-- Section 1: Appointment & Role Details -->
  <div style="margin-bottom: 24px;">
    <h3 style="font-size: 14px; font-weight: 700; color: #3730a3; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0; border-left: 3px solid #4f46e5; padding-left: 8px;">1. Position & Reporting Structure</h3>
    <ul style="font-size: 13px; color: #334155; margin: 0; padding-left: 20px;">
      <li style="margin-bottom: 6px;"><strong>Position Title:</strong> {job_title}</li>
      <li style="margin-bottom: 6px;"><strong>Department:</strong> {dept_str}</li>
      <li style="margin-bottom: 6px;"><strong>Reporting Authority:</strong> {supervisor_str}</li>
      <li style="margin-bottom: 6px;"><strong>Workplace Arrangement:</strong> {workplace_type}</li>
      <li style="margin-bottom: 6px;"><strong>Commencement Date:</strong> {joining_date}</li>
    </ul>
  </div>

  <!-- Section 2: Compensation & Package -->
  <div style="margin-bottom: 24px;">
    <h3 style="font-size: 14px; font-weight: 700; color: #3730a3; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0; border-left: 3px solid #4f46e5; padding-left: 8px;">2. Remuneration & Benefits</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 12px; background: #f8fafc; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: #e2e8f0; color: #1e293b; text-align: left;">
          <th style="padding: 10px 14px; font-weight: 700;">Remuneration Component</th>
          <th style="padding: 10px 14px; font-weight: 700; text-align: right;">Amount (BDT)</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 14px; color: #334155;">Monthly Gross Remuneration</td>
          <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: #0f172a;">{formatted_salary}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 14px; color: #334155;">Annualized Total Compensation (CTC)</td>
          <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: #4338ca;">{annual_salary}</td>
        </tr>
      </tbody>
    </table>
    <p style="font-size: 13px; color: #475569; margin: 0;">
      <strong>Additional Benefits:</strong> {perks_str}
    </p>
  </div>

  <!-- Section 3: Probationary Period -->
  <div style="margin-bottom: 24px;">
    <h3 style="font-size: 14px; font-weight: 700; color: #3730a3; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0; border-left: 3px solid #4f46e5; padding-left: 8px;">3. Probationary Period & Confirmation</h3>
    <p style="font-size: 13px; color: #334155; margin: 0;">
      You will be on a probationary period of <strong>{probation_months} months</strong> starting from your date of joining. Upon successful completion of probation and performance review, your employment will be confirmed in writing.
    </p>
  </div>

  <!-- Section 4: Proprietary Information & Ethics -->
  <div style="margin-bottom: 28px;">
    <h3 style="font-size: 14px; font-weight: 700; color: #3730a3; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0; border-left: 3px solid #4f46e5; padding-left: 8px;">4. Confidentiality & Non-Disclosure</h3>
    <p style="font-size: 13px; color: #334155; margin: 0;">
      During and following your tenure, you agree to safeguard all confidential, proprietary, and trade secret information of {company_name}. All inventions, code, designs, and intellectual property developed during employment remain the sole property of {company_name}.
    </p>
  </div>

  <!-- Section 5: Signature Blocks -->
  <div style="border-top: 2px solid #e2e8f0; padding-top: 24px; display: flex; justify-content: space-between; align-items: flex-end; gap: 32px;">
    <div style="flex: 1;">
      <p style="font-size: 12px; color: #64748b; margin: 0 0 32px 0;">Issued on behalf of <strong>{company_name}</strong>:</p>
      <div style="border-bottom: 1px dashed #94a3b8; width: 100%; margin-bottom: 6px;"></div>
      <p style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 0;">{recruiter_display}</p>
      <p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">Authorized Signatory, {company_name}</p>
    </div>

    <div style="flex: 1;">
      <p style="font-size: 12px; color: #64748b; margin: 0 0 32px 0;">Candidate Formal Acceptance:</p>
      <div style="border-bottom: 1px dashed #94a3b8; width: 100%; margin-bottom: 6px;"></div>
      <p style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 0;">{candidate_name}</p>
      <p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">Digital Signature & Acceptance Date</p>
    </div>
  </div>
</div>
"""
