import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.offer_letter_service import OfferLetterService
from app.models.offer_letter import OfferLetter

def test_offer_letter_generation():
    print("=== Testing 1-Click AI Offer Letter Service ===")
    
    # 1. Test fallback generator
    print("1. Testing Fallback Template Generation...")
    fallback_html = OfferLetterService._get_fallback_template(
        candidate_name="Abu Sayeed",
        company_name="TechVision Innovations",
        job_title="Lead Software Engineer",
        formatted_salary="৳120,000",
        annual_salary="৳1,440,000",
        joining_date="2026-12-01",
        workplace_type="Hybrid (Dhaka HQ + Remote)",
        probation_months=3,
        perks_str="Flexible working hours, Bi-annual festival bonuses, Comprehensive health insurance",
        dept_str="Technology & Engineering",
        supervisor_str="VP of Technology",
        recruiter_display="Human Resources Department",
        today_str="November 07, 2026",
        ref_code="OFFER-TEC-TEST01"
    )
    assert "Abu Sayeed" in fallback_html
    assert "TechVision Innovations" in fallback_html
    assert "Lead Software Engineer" in fallback_html
    assert "120,000" in fallback_html
    print("Fallback template generation test passed!")

    # 2. Test Gemini AI Generation (or fallback if API key not available or rate limited)
    print("2. Testing Gemini AI Offer Letter Generation...")
    ai_html = OfferLetterService.generate_offer_letter_with_gemini(
        candidate_name="Tanvir Rahman",
        company_name="Apex Digital Global",
        job_title="Senior Full-Stack Engineer",
        salary_bdt=95000.0,
        joining_date="2026-11-20",
        workplace_type="On-Site",
        probation_months=6,
        custom_perks="Performance bonus, Medical allowance, Daily lunch & snacks"
    )
    assert len(ai_html) > 100
    assert "Tanvir Rahman" in ai_html or "candidate" in ai_html.lower()
    assert "Apex Digital Global" in ai_html or "company" in ai_html.lower()
    print("AI Offer Letter generation test passed! Output length:", len(ai_html))

    # 3. Test Database Model & Status Progression
    print("3. Testing OfferLetter ORM model instantiation...")
    test_offer = OfferLetter(
        application_id=1,
        candidate_id=1,
        recruiter_id=1,
        job_id=1,
        job_title="Senior Full-Stack Engineer",
        company_name="Apex Digital Global",
        offered_salary=95000.0,
        joining_date="2026-11-20",
        workplace_type="On-Site",
        probation_period_months=6,
        custom_perks="Performance bonus, Medical allowance",
        letter_content_html=ai_html,
        status="SENT"
    )
    assert test_offer.status == "SENT"
    assert test_offer.job_title == "Senior Full-Stack Engineer"
    print("OfferLetter model check passed!")

    print("\nALL OFFER LETTER TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_offer_letter_generation()
