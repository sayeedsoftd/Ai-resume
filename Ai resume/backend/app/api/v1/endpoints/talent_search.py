import json
import re
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.enums import UserRole
from app.models.profile import UserProfile
from app.models.resume import Resume
from app.models.job import Job
from app.models.application import JobApplication
from app.models.interview import Interview
from app.models.candidate_message import CandidateMessage
from app.models.notification import Notification
from app.models.daily_quiz import DailyQuizSession, UserSkillProgress
from app.schemas.talent_search import (
    TalentSearchRequest,
    TalentSearchResponse,
    CandidateDossierItem,
    ParsedQueryFilters,
    InstantInterviewInviteRequest,
    InstantInterviewInviteResponse,
)
from app.services.gemini_service import GeminiService
from app.services.notification_gateway_service import NotificationGatewayService
from app.utils.logger import logger

router = APIRouter()

COMMON_TECH_SKILLS = [
    "Python", "FastAPI", "Django", "Flask", "React", "Next.js", "Vue", "Angular",
    "Node.js", "Express", "TypeScript", "JavaScript", "Docker", "Kubernetes", "AWS",
    "Azure", "GCP", "PostgreSQL", "MySQL", "MongoDB", "Redis", "GraphQL", "REST API",
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "NLP", "Pandas",
    "NumPy", "Scikit-Learn", "Tailwind CSS", "HTML5", "CSS3", "Git", "GitHub",
    "CI/CD", "Linux", "Java", "Spring Boot", "C++", "C#", ".NET", "Golang", "Rust",
    "PHP", "Laravel", "Swift", "Flutter", "React Native", "Android", "Kotlin"
]


def extract_filters_rule_based(query_str: str) -> ParsedQueryFilters:
    """
    High-fidelity regex & semantic keyword parser for natural language recruiter queries.
    Handles phrases like:
    - 'FastAPI and React developer with skill score > 80% and expected salary <= 50,000 BDT'
    - 'Python engineer 3+ years experience budget 60k'
    """
    filters = ParsedQueryFilters()
    if not query_str:
        return filters

    q_lower = query_str.lower()

    # 1. Extract Score (e.g. > 80%, score >= 75, 80%+ score, assessment score 85)
    score_match = re.search(r"(?:score|assessment|rating|marks?)\s*(?:>=|>|above|over|minimum|min|at\s*least|of)?\s*(\d{1,3})%?", q_lower)
    if not score_match:
        score_match = re.search(r"(\d{1,3})%\s*(?:score|assessment|marks?)?", q_lower)
    if score_match:
        try:
            val = float(score_match.group(1))
            if 0 <= val <= 100:
                filters.extracted_min_score = val
        except Exception:
            pass

    # 2. Extract Salary (e.g. salary <= 50,000, 50k bdt, <= 60000, budget 45000 tk)
    salary_match = re.search(
        r"(?:salary|budget|remuneration|expected\s*salary|tk|bdt|৳|\$)\s*(?:<=|<|under|below|maximum|max|up\s*to)?\s*([0-9]{1,3}(?:,[0-9]{3})*|\d+)\s*(k|thousand)?",
        q_lower,
    )
    if not salary_match:
        salary_match = re.search(
            r"([0-9]{1,3}(?:,[0-9]{3})*|\d+)\s*(k|thousand)?\s*(?:bdt|tk|৳|\$|salary|budget)",
            q_lower,
        )

    if salary_match:
        try:
            raw_num = salary_match.group(1).replace(",", "")
            num = float(raw_num)
            multiplier = salary_match.group(2)
            if multiplier and multiplier in ["k", "thousand"]:
                num *= 1000
            elif num < 200:  # e.g., '50k' without k or entered as 50
                num *= 1000
            filters.extracted_max_salary = num
        except Exception:
            pass

    # 3. Extract Experience (e.g. 3+ years, 2 yrs experience, 5 years of experience)
    exp_match = re.search(r"(\d+)\+?\s*(?:years?|yrs?)(?:\s*(?:of\s*)?experience)?", q_lower)
    if not exp_match:
        exp_match = re.search(r"(?:experience|exp)\s*(?:>=|>|of)?\s*(\d+)\+?\s*(?:years?|yrs?)?", q_lower)
    if exp_match:
        try:
            filters.extracted_experience_years = int(exp_match.group(1))
        except Exception:
            pass

    # 4. Extract Known Tech Skills
    found_skills = []
    for skill in COMMON_TECH_SKILLS:
        # Match as word boundary
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, q_lower):
            found_skills.append(skill)
    filters.extracted_skills = found_skills

    # 5. Extract residual keywords
    words = [w.strip() for w in re.split(r"[\s,]+", query_str) if len(w.strip()) > 2]
    stopwords = {"and", "with", "the", "for", "with", "who", "has", "developer", "engineer", "candidate", "talent", "score", "salary", "expected", "bdt", "than", "more", "less", "under"}
    filters.extracted_keywords = [w for w in words if w.lower() not in stopwords]

    return filters


def parse_query_with_gemini(query_str: str) -> ParsedQueryFilters:
    """
    Uses Gemini AI if configured to perform deep semantic query parsing,
    with seamless fallback to rule-based regex parsing.
    """
    rule_filters = extract_filters_rule_based(query_str)
    client = GeminiService.get_client()
    if not client:
        return rule_filters

    prompt = f"""You are a Talent Headhunting Query Parser.
Extract recruitment search facets from this natural language query:
"{query_str}"

Return strictly a JSON object:
{{
  "skills": ["list of exact skills"],
  "min_score": float or null,
  "max_salary": float or null,
  "experience_years": int or null,
  "keywords": ["additional keywords"]
}}
"""
    try:
        raw_text = GeminiService._generate_with_fallback(prompt, is_json=True)
        if raw_text:
            cleaned = GeminiService._clean_json_response(raw_text)
            data = json.loads(cleaned)
            res = ParsedQueryFilters(
                extracted_skills=data.get("skills") or rule_filters.extracted_skills,
                extracted_min_score=data.get("min_score") if data.get("min_score") is not None else rule_filters.extracted_min_score,
                extracted_max_salary=data.get("max_salary") if data.get("max_salary") is not None else rule_filters.extracted_max_salary,
                extracted_experience_years=data.get("experience_years") if data.get("experience_years") is not None else rule_filters.extracted_experience_years,
                extracted_keywords=data.get("keywords") or rule_filters.extracted_keywords,
            )
            return res
    except Exception as e:
        logger.warning(f"Gemini query parsing failed, falling back to rule-based: {e}")

    return rule_filters


@router.post("", response_model=TalentSearchResponse)
@router.post("/", response_model=TalentSearchResponse)
def search_talent_pool(
    payload: TalentSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Reverse Headhunting & Talent Search Engine:
    Recruiters search across all registered candidates using natural language or structured facets.
    Ranks talent by skill relevancy, assessment score, and verified profile completeness.
    """
    if current_user.role.value not in ["RECRUITER", "SUPER_ADMIN", "SUBSCRIBER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to recruiters and hiring managers.",
        )

    # 1. Parse natural language query if present
    parsed_filters: Optional[ParsedQueryFilters] = None
    if payload.query and payload.query.strip():
        parsed_filters = parse_query_with_gemini(payload.query.strip())

    # Merge explicit parameters with parsed filters (explicit params take priority)
    target_skills: List[str] = payload.skills or (parsed_filters.extracted_skills if parsed_filters else [])
    target_min_score: Optional[float] = payload.min_score if payload.min_score is not None else (parsed_filters.extracted_min_score if parsed_filters else None)
    target_max_salary: Optional[float] = payload.max_salary if payload.max_salary is not None else (parsed_filters.extracted_max_salary if parsed_filters else None)
    target_exp_years: Optional[int] = payload.experience_years if payload.experience_years is not None else (parsed_filters.extracted_experience_years if parsed_filters else None)
    verified_github_only: bool = payload.verified_github_only or False

    target_skills_lower = [s.strip().lower() for s in target_skills if s.strip()]

    # 2. Query candidate users
    candidates_query = (
        db.query(User)
        .filter(User.role == UserRole.NORMAL_USER)
    )
    candidate_users = candidates_query.all()

    matched_dossiers: List[Dict[str, Any]] = []

    for user in candidate_users:
        profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
        resume = (
            db.query(Resume)
            .filter(Resume.user_id == user.id)
            .order_by(desc(Resume.is_primary), desc(Resume.created_at))
            .first()
        )

        # Candidate details aggregation
        user_skills: List[str] = []
        if profile and profile.skills and isinstance(profile.skills, list):
            user_skills.extend(profile.skills)
        if resume and resume.parsed_data and isinstance(resume.parsed_data, dict):
            res_skills = resume.parsed_data.get("skills", [])
            if isinstance(res_skills, list):
                user_skills.extend(res_skills)

        # Deduplicate skills preserving casing
        seen_lower = set()
        clean_skills = []
        for s in user_skills:
            if isinstance(s, str) and s.strip():
                low = s.strip().lower()
                if low not in seen_lower:
                    seen_lower.add(low)
                    clean_skills.append(s.strip())

        headline = (
            (profile.headline if profile and profile.headline else None)
            or (resume.parsed_data.get("headline") if resume and resume.parsed_data else None)
            or "Software Engineer"
        )
        bio = (profile.bio if profile and profile.bio else "") or (
            resume.parsed_data.get("summary") if resume and resume.parsed_data else ""
        )
        profile_picture = (profile.photo_url if profile else None)

        contact_info = (profile.contact_info if profile and isinstance(profile.contact_info, dict) else {})
        res_contact = (
            resume.parsed_data.get("contact_info", {})
            if resume and isinstance(resume.parsed_data, dict) and isinstance(resume.parsed_data.get("contact_info"), dict)
            else {}
        )
        phone = contact_info.get("phone") or res_contact.get("phone") or contact_info.get("mobile")

        location = (
            contact_info.get("location")
            or contact_info.get("city")
            or res_contact.get("location")
            or "Dhaka, Bangladesh"
        )

        # Assessment Score Calculation
        quiz_sessions = (
            db.query(DailyQuizSession)
            .filter(DailyQuizSession.user_id == user.id, DailyQuizSession.is_completed == True)
            .all()
        )
        quiz_scores = [q.score_achieved for q in quiz_sessions if q.score_achieved is not None]

        app_scores = (
            db.query(JobApplication.test_score)
            .filter(JobApplication.user_id == user.id, JobApplication.test_score != None)
            .all()
        )
        test_scores = [a[0] for a in app_scores if a[0] is not None]

        all_scores = quiz_scores + test_scores
        if all_scores:
            avg_assessment_score = round(sum(all_scores) / len(all_scores), 1)
        else:
            # Fallback to ATS score or baseline verified score
            avg_assessment_score = 0.0

        ats_score = None
        if resume and resume.parsed_data and isinstance(resume.parsed_data, dict):
            ats_score = resume.parsed_data.get("ats_score")
        if ats_score is None and resume and hasattr(resume, "ats_score"):
            ats_score = getattr(resume, "ats_score", None)

        # Expected Salary Extraction
        expected_salary: Optional[float] = None
        if contact_info.get("expected_salary"):
            try:
                expected_salary = float(contact_info.get("expected_salary"))
            except Exception:
                pass
        if expected_salary is None and resume and isinstance(resume.parsed_data, dict):
            res_sal = resume.parsed_data.get("expected_salary")
            if res_sal:
                try:
                    expected_salary = float(res_sal)
                except Exception:
                    pass
        if expected_salary is None:
            # Check applications
            latest_app = (
                db.query(JobApplication)
                .filter(JobApplication.user_id == user.id)
                .order_by(desc(JobApplication.id))
                .first()
            )
            if latest_app and hasattr(latest_app, "expected_salary") and getattr(latest_app, "expected_salary", None):
                try:
                    expected_salary = float(getattr(latest_app, "expected_salary"))
                except Exception:
                    pass

        # GitHub Data & Stars
        github_username = profile.github_username if profile else None
        github_data = profile.github_data if profile and isinstance(profile.github_data, dict) else {}
        github_stars = 0
        if github_data:
            github_stars = int(github_data.get("total_stars") or github_data.get("stars") or 0)
            if not github_username and github_data.get("login"):
                github_username = github_data.get("login")

        is_github_verified = bool(github_username) or user.is_verified_badge

        # Experience & Education
        experience_list = (
            (profile.experience if profile and isinstance(profile.experience, list) else [])
            or (resume.parsed_data.get("experience", []) if resume and isinstance(resume.parsed_data, dict) else [])
        )
        education_list = (
            (profile.education if profile and isinstance(profile.education, list) else [])
            or (resume.parsed_data.get("education", []) if resume and isinstance(resume.parsed_data, dict) else [])
        )
        projects_list = (
            (profile.projects if profile and isinstance(profile.projects, list) else [])
            or (resume.parsed_data.get("projects", []) if resume and isinstance(resume.parsed_data, dict) else [])
        )

        experience_years = len(experience_list)
        if profile and contact_info.get("years_of_experience"):
            try:
                experience_years = max(experience_years, int(contact_info.get("years_of_experience")))
            except Exception:
                pass

        # Match Evaluation & Relevancy Scoring
        match_reasons: List[str] = []
        relevancy_score = 0.0

        # Skill matching
        matched_skills = []
        user_skills_lower = [s.lower() for s in clean_skills]
        for target in target_skills_lower:
            for actual in user_skills_lower:
                if target in actual or actual in target:
                    matched_skills.append(target)
                    break

        if matched_skills:
            match_reasons.append(f"Matches skills: {', '.join(set(matched_skills[:4]))}")
            relevancy_score += len(set(matched_skills)) * 25.0

        # Score filter & matching
        if target_min_score is not None:
            if avg_assessment_score > 0 and avg_assessment_score < target_min_score:
                # Failed score filter
                continue
            elif avg_assessment_score >= target_min_score:
                match_reasons.append(f"Assessment score {avg_assessment_score}% meets requirement (>= {target_min_score}%)")
                relevancy_score += 30.0

        if avg_assessment_score > 0:
            relevancy_score += (avg_assessment_score / 100.0) * 20.0

        # Salary filter & matching
        if target_max_salary is not None:
            if expected_salary is not None and expected_salary > target_max_salary:
                # Failed salary filter
                continue
            elif expected_salary is not None:
                match_reasons.append(f"Expected salary ৳{int(expected_salary):,} within budget (<= ৳{int(target_max_salary):,})")
                relevancy_score += 25.0

        # Experience filter
        if target_exp_years is not None:
            if experience_years < target_exp_years:
                continue
            else:
                match_reasons.append(f"{experience_years}+ years relevant experience")
                relevancy_score += 15.0

        # Verified GitHub filter
        if verified_github_only and not is_github_verified:
            continue

        if is_github_verified:
            relevancy_score += 10.0
            if github_stars > 0:
                match_reasons.append(f"Verified GitHub ({github_stars} repository stars)")
            else:
                match_reasons.append("Verified GitHub profile linked")

        # Natural language keyword search against headline, bio, and projects
        if payload.query and parsed_filters and parsed_filters.extracted_keywords:
            text_corpus = f"{headline} {bio} {' '.join(clean_skills)} {user.full_name}".lower()
            keyword_matches = [kw for kw in parsed_filters.extracted_keywords if kw.lower() in text_corpus]
            if keyword_matches:
                relevancy_score += len(keyword_matches) * 10.0
                match_reasons.append(f"Matched keywords: {', '.join(keyword_matches[:3])}")

        if not match_reasons:
            if clean_skills:
                match_reasons.append(f"Skilled in {', '.join(clean_skills[:3])}")
            else:
                match_reasons.append("Candidate active in talent pool")

        item = CandidateDossierItem(
            id=user.id,
            full_name=user.full_name or "Anonymous Candidate",
            email=user.email,
            headline=headline,
            bio=bio,
            profile_picture=profile_picture,
            skills=clean_skills,
            avg_assessment_score=avg_assessment_score,
            ats_score=ats_score,
            expected_salary=expected_salary,
            salary_currency="BDT",
            location=location,
            github_username=github_username,
            github_stars=github_stars,
            is_github_verified=is_github_verified,
            experience_years=experience_years,
            match_reasons=match_reasons,
            featured_projects=projects_list,
            phone=phone,
            education=education_list,
            experience=experience_list,
        )

        matched_dossiers.append({
            "dossier": item,
            "relevancy_score": relevancy_score,
        })

    # Sort candidates by relevancy score descending
    matched_dossiers.sort(key=lambda x: x["relevancy_score"], reverse=True)

    page = max(1, payload.page or 1)
    limit = max(1, payload.limit or 20)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit

    paged_candidates = [m["dossier"] for m in matched_dossiers[start_idx:end_idx]]

    return TalentSearchResponse(
        success=True,
        total=len(matched_dossiers),
        candidates=paged_candidates,
        parsed_filters=parsed_filters,
    )


@router.post("/{candidate_id}/instant-invite", response_model=InstantInterviewInviteResponse)
def dispatch_instant_interview_invite(
    candidate_id: int,
    payload: InstantInterviewInviteRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Direct 1-Click Reverse Headhunting Interview Invite:
    Dispatches formal interview invitation directly to candidate, creates Interview record,
    sends In-App Recruiter Inquiry message, and fires instant WhatsApp & SMS alerts.
    """
    if current_user.role.value not in ["RECRUITER", "SUPER_ADMIN", "SUBSCRIBER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to recruiters.",
        )

    candidate = db.query(User).filter(User.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate with ID {candidate_id} not found.",
        )

    # 1. Resolve Target Job
    target_job: Optional[Job] = None
    if payload.job_id:
        target_job = db.query(Job).filter(Job.id == payload.job_id).first()

    if not target_job:
        # Pick recruiter's most recent active job
        target_job = (
            db.query(Job)
            .filter(Job.posted_by_user_id == current_user.id, Job.is_active == True)
            .order_by(desc(Job.created_at))
            .first()
        )

    if not target_job:
        # Fallback to any job posted by recruiter or any system job
        target_job = db.query(Job).filter(Job.posted_by_user_id == current_user.id).first()

    if not target_job:
        # Create a placeholder direct headhunting job so DB foreign key is satisfied
        company_name = current_user.company_name or "Talent Acquisition Team"
        target_job = Job(
            posted_by_user_id=current_user.id,
            title=payload.interview_title,
            company_name=company_name,
            description="Direct Reverse Headhunting Interview Invitation",
            required_skills=[],
            location="Remote / Hybrid",
            is_active=True,
        )
        db.add(target_job)
        db.commit()
        db.refresh(target_job)

    company_title = current_user.company_name or "Hiring Team"

    # 2. Create Interview Record
    interview = Interview(
        candidate_id=candidate.id,
        recruiter_id=current_user.id,
        job_id=target_job.id,
        interview_title=payload.interview_title,
        meeting_link=payload.meeting_link,
        scheduled_at=payload.scheduled_at,
        duration_minutes=payload.duration_minutes or 45,
        timezone="Asia/Dhaka",
        notes=payload.personal_note,
        status="SCHEDULED",
        notification_sent=True,
        notification_channel="WHATSAPP_AND_SMS",
        notification_sent_at=datetime.now(timezone.utc),
        whatsapp_status="SENT",
        sms_status="SENT",
    )
    db.add(interview)

    # 3. Create Candidate Message Record (Appears in Recruiter Inquiries on Candidate Hub)
    cand_msg = CandidateMessage(
        candidate_id=candidate.id,
        recruiter_id=current_user.id,
        job_id=target_job.id,
        recruiter_name=current_user.full_name or "Recruiter",
        recruiter_company=company_title,
        recruiter_email=current_user.email,
        job_title=payload.interview_title,
        subject=f"Exclusive Interview Invitation: {payload.interview_title}",
        body=(
            f"Dear {candidate.full_name},\n\n"
            f"We discovered your profile in the talent directory and are highly impressed with your experience.\n\n"
            f"We would love to invite you for a direct interview:\n"
            f"• Position: {payload.interview_title}\n"
            f"• Scheduled Time: {payload.scheduled_at.strftime('%Y-%m-%d %I:%M %p')}\n"
            f"• Video Meeting Link: {payload.meeting_link}\n\n"
            f"Personal Note: {payload.personal_note or 'Looking forward to speaking with you!'}\n\n"
            f"Best regards,\n{current_user.full_name}\n{company_title}"
        ),
        is_read=False,
    )
    db.add(cand_msg)

    # 4. Create Notification
    notif = Notification(
        user_id=candidate.id,
        title=f"Direct Interview Invitation: {payload.interview_title}",
        message=f"{company_title} ({current_user.full_name}) has invited you to an interview scheduled for {payload.scheduled_at.strftime('%Y-%m-%d %I:%M %p')}.",
        type="INTERVIEW_SCHEDULED",
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(interview)

    # 5. Candidate Phone Lookup & Automated Instant WhatsApp & SMS Alerts
    profile = db.query(UserProfile).filter(UserProfile.user_id == candidate.id).first()
    candidate_phone = None
    if profile and isinstance(profile.contact_info, dict):
        candidate_phone = profile.contact_info.get("phone") or profile.contact_info.get("mobile")

    if not candidate_phone:
        resume = db.query(Resume).filter(Resume.user_id == candidate.id).order_by(desc(Resume.created_at)).first()
        if resume and isinstance(resume.parsed_data, dict):
            cand_contact = resume.parsed_data.get("contact_info", {})
            if isinstance(cand_contact, dict):
                candidate_phone = cand_contact.get("phone") or cand_contact.get("mobile")

    if candidate_phone:
        formatted_time = payload.scheduled_at.strftime("%b %d, %Y at %I:%M %p")
        background_tasks.add_task(
            NotificationGatewayService.dispatch_interview_alerts,
            phone_number=candidate_phone,
            candidate_name=candidate.full_name or "Candidate",
            job_title=payload.interview_title,
            company_name=company_title,
            interview_time=formatted_time,
            meeting_url=payload.meeting_link,
        )
        logger.info(f"Dispatched WhatsApp & SMS alerts to {candidate_phone} for instant invite ID {interview.id}")

    return InstantInterviewInviteResponse(
        success=True,
        message=f"Exclusive interview invitation successfully sent to {candidate.full_name}.",
        interview_id=interview.id,
        scheduled_at=payload.scheduled_at.isoformat(),
        candidate_name=candidate.full_name or "Candidate",
        meeting_link=payload.meeting_link,
        notification_dispatched=True,
    )
