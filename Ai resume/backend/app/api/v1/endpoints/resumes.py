import re
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.resume import Resume
from app.models.job import Job
from app.schemas.resume import (
    ResumeResponse,
    ResumeUploadResponse,
    ResumeAnalysisResult,
    ATSScoreResponse,
    AnalyzeAgainstJobRequest,
    ResumeBuilderSaveRequest,
)
from app.services.extractor import TextExtractorService
from app.services.parser import ResumeParserService
from app.services.matcher import JobMatchService
from app.services.job_matcher import background_match_resume_task
from app.services.gemini_service import GeminiService
from app.utils.constants import ALLOWED_RESUME_EXTENSIONS
from app.utils.file_helpers import save_uploaded_file
from app.utils.logger import logger

router = APIRouter()


@router.post("/upload", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
def upload_and_parse_resume(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Resume document (.pdf, .docx, .txt)"),
    job_description: Optional[str] = Form(None, description="Optional target job description to match against"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload resume file, perform hybrid digital/OCR text extraction,
    structure NLP metadata, optionally perform instant ATS comparison against a target JD,
    persist in database, and trigger background matching across active jobs.
    """
    # 1. Stage 1: Ensure upload directory exists and save uploaded file
    try:
        settings.resume_upload_dir.mkdir(parents=True, exist_ok=True)
        relative_path = save_uploaded_file(file, settings.resume_upload_dir, ALLOWED_RESUME_EXTENSIONS)
        abs_path = settings.BASE_DIR / relative_path
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save uploaded file {file.filename}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage error while saving '{file.filename}': {str(e)}",
        )

    # 2. Stage 1: File Ingestion & Pure Raw Text Conversion (pdfplumber + pypdf + sanitization)
    try:
        extracted_text = TextExtractorService.extract_text(abs_path)
    except Exception as e:
        logger.error(f"Failed to extract text from {file.filename}: {e}", exc_info=True)
        extracted_text = f"Resume document: {file.filename}\nExtracted content placeholder."

    # 3. Stage 2: Structured Information Categorization via Gemini AI Entity Extraction
    try:
        structured_entities = GeminiService.extract_structured_entities(extracted_text)
    except Exception as e:
        logger.error(f"Gemini entity extraction error for {file.filename}: {e}", exc_info=True)
        structured_entities = {}

    # Merge heuristic signals with AI structured output
    heuristic_parsed = ResumeParserService.parse_document_text(extracted_text)
    all_skills = structured_entities.get("all_skills") or []
    if not all_skills:
        ai_skills = structured_entities.get("skills", {})
        if isinstance(ai_skills, dict):
            for sublist in ai_skills.values():
                if isinstance(sublist, list):
                    all_skills.extend(sublist)
        elif isinstance(ai_skills, list):
            all_skills = ai_skills

    combined_skills = sorted(list(set(all_skills + heuristic_parsed.get("skills", []))))
    exp_years = float(structured_entities.get("experience_years") or heuristic_parsed.get("experience_years", 1.0))

    # Stage 4 baseline scoring
    baseline_score = ResumeParserService.calculate_base_ats_score({"skills": combined_skills, "experience_years": exp_years}, extracted_text)

    # Evaluate against custom Target Job Description if provided (Scenario A), otherwise fallback to baseline audit (Scenario B)
    custom_jd_match = None
    matched_skills = None
    missing_skills = None
    suggestions = None
    learning_recommendations = None
    target_jd_text = job_description.strip() if (job_description and job_description.strip()) else None

    default_breakdown = {
        "skills_score": round((len(combined_skills) / max(len(combined_skills), 8)) * 40.0, 1) if combined_skills else 15.0,
        "skills_max": 40.0,
        "experience_score": min(30.0, round(exp_years * 5.0 + 10.0, 1)),
        "experience_max": 30.0,
        "education_score": 20.0 if structured_entities.get("education") else 10.0,
        "education_max": 20.0,
        "format_score": 10.0,
        "format_max": 10.0,
    }

    if target_jd_text:
        jd_requirements = GeminiService.extract_job_requirements(target_jd_text)
        target_skills = jd_requirements.get("required_skills") or ResumeParserService.extract_skills(target_jd_text)
        target_title = jd_requirements.get("job_title") or "Target Job Posting"
        min_exp_years = float(jd_requirements.get("experience_years") or 1.0)
        try:
            custom_jd_match = GeminiService.evaluate_4stage_ats_pipeline(
                candidate_profile=structured_entities or {"skills": combined_skills, "experience_years": exp_years},
                resume_text=extracted_text,
                job_title=target_title,
                job_description=target_jd_text,
                required_skills=target_skills,
                experience_level="MID",
                min_experience_years=min_exp_years,
            )
            final_ats_score = float(custom_jd_match.get("ats_score", baseline_score))
            is_shortlisted = bool(custom_jd_match.get("is_shortlisted", final_ats_score >= 75.0))
            shortlist_status = str(custom_jd_match.get("shortlist_status", "Shortlisted / Recommended" if is_shortlisted else "Filtered / Under Review"))
            score_breakdown = custom_jd_match.get("score_breakdown") or default_breakdown
            matched_skills = custom_jd_match.get("matched_skills", [])
            missing_skills = custom_jd_match.get("missing_skills", [])
            suggestions = custom_jd_match.get("suggestions", [])
            learning_recommendations = custom_jd_match.get("learning_recommendations", [])
        except Exception as e:
            logger.error(f"Error evaluating resume against custom JD: {e}", exc_info=True)
            final_ats_score = baseline_score
            is_shortlisted = baseline_score >= 75.0
            shortlist_status = "Shortlisted / Recommended" if is_shortlisted else "Filtered / Under Review"
            score_breakdown = default_breakdown
    else:
        final_ats_score = baseline_score
        is_shortlisted = baseline_score >= 75.0
        shortlist_status = "Shortlisted / Recommended" if is_shortlisted else "Filtered / Under Review"
        score_breakdown = default_breakdown

    parsed_data = {
        "candidate_name": structured_entities.get("candidate_name") or current_user.full_name,
        "contact": structured_entities.get("contact") or heuristic_parsed.get("contact", {}),
        "summary": structured_entities.get("summary") or "",
        "experience": structured_entities.get("experience") or [],
        "education": structured_entities.get("education") or heuristic_parsed.get("education", []),
        "skills": combined_skills,
        "skills_inventory": structured_entities.get("skills") or {},
        "certifications": structured_entities.get("certifications") or [],
        "experience_years": exp_years,
        "ats_score": final_ats_score,
        "shortlist_status": shortlist_status,
        "is_shortlisted": is_shortlisted,
        "pipeline_stage": "Stage 4: Complete",
        "score_breakdown": score_breakdown,
        "custom_jd_match": custom_jd_match,
        "target_job_description": target_jd_text,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "suggestions": suggestions,
        "word_count": len(extracted_text.split()),
    }

    # 4. Sync Structured Profile into Database linked to User Profile
    try:
        from app.models.profile import UserProfile
        profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
        if not profile:
            profile = UserProfile(user_id=current_user.id)
            db.add(profile)

        if structured_entities.get("summary"):
            profile.bio = structured_entities.get("summary")
        if structured_entities.get("contact"):
            profile.contact_info = structured_entities.get("contact")
        if structured_entities.get("experience"):
            profile.experience = structured_entities.get("experience")
        if structured_entities.get("education"):
            profile.education = structured_entities.get("education")
        if combined_skills:
            profile.skills = combined_skills
        if structured_entities.get("certifications"):
            profile.certifications = structured_entities.get("certifications")
    except Exception as e:
        logger.warning(f"Could not sync resume entities to user_profile: {e}")

    # 5. Manage resume versions and primary flag
    try:
        previous_count = db.query(Resume).filter(Resume.user_id == current_user.id).count()
        version = previous_count + 1

        # Demote previous primary resumes
        db.query(Resume).filter(Resume.user_id == current_user.id).update({"is_primary": False})

        resume = Resume(
            user_id=current_user.id,
            file_path=relative_path,
            extracted_text=extracted_text,
            parsed_data=parsed_data,
            version=version,
            is_primary=True,
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)
    except Exception as e:
        db.rollback()
        logger.error(f"Database error while creating resume record: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction error while persisting resume: {str(e)}",
        )

    # 6. Trigger asynchronous background job compatibility matching
    try:
        background_tasks.add_task(background_match_resume_task, resume.id)
    except Exception as e:
        logger.warning(f"Could not enqueue background matching task: {e}")

    return ResumeUploadResponse(
        id=resume.id,
        user_id=resume.user_id,
        file_path=resume.file_path,
        version=resume.version,
        is_primary=resume.is_primary,
        ats_score=final_ats_score,
        extracted_skills=combined_skills,
        experience_years=exp_years,
        pipeline_stage="Stage 4: Completed",
        shortlist_status=shortlist_status,
        score_breakdown=score_breakdown,
        structured_entities=structured_entities,
        custom_jd_match=custom_jd_match,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        suggestions=suggestions,
        learning_recommendations=learning_recommendations,
        target_job_description=target_jd_text,
        created_at=resume.created_at,
        message="Resume ingested, sanitized, AI-categorized into profile, and evaluated.",
    )


@router.post("/analyze-against-job", response_model=ATSScoreResponse)
def analyze_resume_against_job(
    request: AnalyzeAgainstJobRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Stage 3 & 4: Deep Job Description & Criteria Matching Engine.
    Executes 4-factor deterministic scoring:
      - Skills Match: 40%
      - Experience & Title Match: 30%
      - Education & Qualifications: 20%
      - Formatting & Structure: 10%
    Computes Shortlisting Routing (Score >= 75% -> Shortlisted / Recommended).
    """
    # 1. Resolve Resume
    if request.resume_id:
        resume = (
            db.query(Resume)
            .filter(Resume.id == request.resume_id, Resume.user_id == current_user.id)
            .first()
        )
    else:
        resume = (
            db.query(Resume)
            .filter(Resume.user_id == current_user.id, Resume.is_primary == True)
            .order_by(Resume.created_at.desc())
            .first()
        )

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No valid resume found. Please upload a resume first.",
        )

    parsed = resume.parsed_data or {}
    resume_text = resume.extracted_text or ""

    # 2. Resolve Target Job Requirements
    target_title = "Target Position"
    target_skills = request.required_skills or []
    target_jd = request.job_description_text or ""
    expected_exp_level = "MID"
    min_exp_years = 2.0

    if request.job_id:
        job = db.query(Job).filter(Job.id == request.job_id).first()
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target job not found.")
        target_title = job.title
        target_skills = job.required_skills or target_skills
        target_jd = job.description or target_jd
        expected_exp_level = (
            job.experience_level.value
            if hasattr(job.experience_level, "value")
            else str(job.experience_level)
        )
        exp_map = {"ENTRY": 1.0, "MID": 3.0, "SENIOR": 5.0, "LEAD": 8.0}
        min_exp_years = exp_map.get(expected_exp_level.upper(), 2.0)

    if not target_skills and not target_jd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either a job_id or job_description_text / required_skills to match against.",
        )

    # 3. Calculate 4-Stage ATS Match via GeminiService
    ai_result = GeminiService.evaluate_4stage_ats_pipeline(
        candidate_profile=parsed,
        resume_text=resume_text,
        job_title=target_title,
        job_description=target_jd,
        required_skills=target_skills,
        experience_level=expected_exp_level,
        min_experience_years=min_exp_years,
    )

    return ATSScoreResponse(
        ats_score=float(ai_result.get("ats_score", 70.0)),
        match_level=str(ai_result.get("match_level", "Moderate Match")),
        shortlist_status=str(ai_result.get("shortlist_status", "Filtered / Under Review")),
        is_shortlisted=bool(ai_result.get("is_shortlisted", False)),
        score_breakdown=ai_result.get("score_breakdown", {}),
        matched_skills=ai_result.get("matched_skills", []),
        missing_skills=ai_result.get("missing_skills", []),
        suggestions=ai_result.get("suggestions", []),
        learning_recommendations=ai_result.get("learning_recommendations", []),
        summary_feedback=ai_result.get("summary_feedback"),
    )



@router.get("/my-resumes", response_model=List[ResumeResponse])
def get_my_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch list of all resumes uploaded by the current user with parsed data and primary flag."""
    return (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
        .all()
    )


@router.get("/", response_model=List[ResumeResponse])
def list_resumes_alias(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Alias for /my-resumes."""
    return get_my_resumes(current_user, db)


@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume_by_id(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full details of a specific resume."""
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
    return resume


@router.get("/{resume_id}/analysis", response_model=ResumeAnalysisResult)
def get_resume_analysis(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get ATS analysis and heuristic recommendations for a specific resume."""
    resume = (
        db.query(Resume)
        .filter(Resume.id == resume_id, Resume.user_id == current_user.id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")

    parsed = resume.parsed_data or {}
    skills = parsed.get("skills", [])
    ats_score = parsed.get("ats_score", 50.0)
    exp = float(parsed.get("experience_years", 1.0))

    recommendations = []
    if len(skills) < 6:
        recommendations.append("Expand technology keywords with specific database, backend, or cloud tools.")
    if ats_score < 75:
        recommendations.append("Ensure your contact info and degree titles use standardized headers (Education, Experience, Skills).")
    if not recommendations:
        recommendations.append("Resume has solid section formatting and tech skill density.")

    strengths = [
        f"{len(skills)} identified technical competencies",
        f"~{exp} years estimated professional experience",
    ]
    custom_jd_match = parsed.get("custom_jd_match")
    matched_skills = parsed.get("matched_skills")
    missing_skills = parsed.get("missing_skills")
    target_job_description = parsed.get("target_job_description")
    if custom_jd_match and custom_jd_match.get("suggestions"):
        recommendations = custom_jd_match.get("suggestions") + [r for r in recommendations if r not in custom_jd_match.get("suggestions")]

    weaknesses = [r for r in recommendations if "Expand" in r or "Ensure" in r or "missing" in r.lower()]
    if missing_skills:
        weaknesses.extend([f"Missing skill: {s}" for s in missing_skills[:3]])

    return ResumeAnalysisResult(
        resume_id=resume.id,
        extracted_skills=skills,
        experience_years=exp,
        ats_score=ats_score,
        shortlist_status=parsed.get("shortlist_status", "Shortlisted / Recommended" if ats_score >= 75.0 else "Filtered / Under Review"),
        score_breakdown=parsed.get("score_breakdown"),
        recommendations=recommendations,
        strengths=strengths,
        weaknesses=weaknesses,
        education_detected=parsed.get("education"),
        structured_profile=parsed,
        word_count=parsed.get("word_count"),
        custom_jd_match=custom_jd_match,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        target_job_description=target_job_description,
    )


@router.post("/builder/save", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
def save_builder_resume(
    payload: ResumeBuilderSaveRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Save resume created or edited directly from the Split-Screen Resume Builder.
    Generates structured plain text for ATS parsing & vector matching, persists in database,
    and enqueues background job matching.
    """
    p = payload.personal_info or {}
    name = p.get("fullName", current_user.full_name or "Professional")
    job_title = p.get("jobTitle", "Professional")
    email = p.get("email", current_user.email or "")
    phone = p.get("phone", "")
    location = p.get("location", "")
    linkedin = p.get("linkedin", "")
    github = p.get("github", "")
    portfolio = p.get("portfolio", "")

    # Construct synthesized ATS text from builder data
    lines = [
        f"{name}",
        f"{job_title}",
        f"Email: {email} | Phone: {phone} | Location: {location}",
    ]
    if linkedin or github or portfolio:
        lines.append(f"Profiles: {linkedin} {github} {portfolio}")
    
    if payload.summary:
        lines.append("\nPROFESSIONAL SUMMARY")
        lines.append(payload.summary)

    if payload.experiences:
        lines.append("\nWORK EXPERIENCE")
        for exp in payload.experiences:
            title = exp.get("title", "")
            comp = exp.get("company", "")
            dates = f"{exp.get('startDate', '')} - {exp.get('endDate', 'Present')}"
            lines.append(f"{title} at {comp} ({dates})")
            desc = exp.get("description", "")
            if desc:
                lines.append(desc)

    if payload.education:
        lines.append("\nEDUCATION & CREDENTIALS")
        for edu in payload.education:
            degree = edu.get("degree", "")
            inst = edu.get("institution", "")
            year = edu.get("year", "")
            gpa = edu.get("gpa", "")
            lines.append(f"{degree} - {inst} ({year}) {f'GPA: {gpa}' if gpa else ''}")

    # Skills aggregation
    all_skills = []
    if isinstance(payload.skills, dict):
        for cat, sk_list in payload.skills.items():
            if isinstance(sk_list, list):
                all_skills.extend(sk_list)
    elif isinstance(payload.skills, list):
        all_skills.extend(payload.skills)

    if all_skills:
        lines.append("\nTECHNICAL & PROFESSIONAL SKILLS")
        lines.append(", ".join(all_skills))

    if payload.projects:
        lines.append("\nKEY PROJECTS")
        for proj in payload.projects:
            lines.append(f"{proj.get('title', '')} | Tech: {proj.get('technologies', '')}")
            if proj.get("description"):
                lines.append(proj.get("description"))

    combined_text = "\n".join(lines)

    # NLP parse and structure
    parsed_data = ResumeParserService.parse_document_text(combined_text)
    # Merge explicit skills from builder with parsed skills
    parsed_skills = list(set(parsed_data.get("skills", []) + all_skills))
    parsed_data["skills"] = parsed_skills
    parsed_data["builder_state"] = payload.model_dump()

    # Save pseudo file or text file in upload directory
    save_filename = f"builder_{current_user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    dest_path = settings.resume_upload_dir / save_filename
    with open(dest_path, "w", encoding="utf-8") as f:
        f.write(combined_text)

    rel_path = f"uploads/resumes/{save_filename}"

    # Handle versions and primary flag
    count = db.query(Resume).filter(Resume.user_id == current_user.id).count()
    if payload.is_primary:
        db.query(Resume).filter(Resume.user_id == current_user.id).update({"is_primary": False})

    new_resume = Resume(
        user_id=current_user.id,
        file_path=rel_path,
        extracted_text=combined_text,
        parsed_data=parsed_data,
        version=count + 1,
        is_primary=payload.is_primary,
    )
    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)

    # Enqueue background job matching
    background_tasks.add_task(background_match_resume_task, new_resume.id)

    return ResumeUploadResponse(
        id=new_resume.id,
        user_id=new_resume.user_id,
        file_path=new_resume.file_path,
        version=new_resume.version,
        is_primary=new_resume.is_primary,
        ats_score=parsed_data.get("ats_score", 75.0),
        extracted_skills=parsed_skills,
        experience_years=parsed_data.get("experience_years", 1.0),
        created_at=new_resume.created_at,
        message="Builder resume saved and active. Automated job matching running in background.",
    )


@router.post("/builder/optimize-summary")
def optimize_summary(
    payload: dict,
    current_user: User = Depends(get_current_user),
):
    """
    AI Gemini optimization for professional summary and bullet points.
    Enhances impact verbs, quantifiable metrics, and ATS keyword presence.
    """
    summary = payload.get("summary", "").strip()
    job_title = payload.get("jobTitle", "Professional")
    skills = payload.get("skills", [])
    bullets = payload.get("bullets", [])

    gemini_result = GeminiService.optimize_summary_and_bullets(
        summary=summary,
        job_title=job_title,
        skills=skills,
        bullet_points=bullets,
    )

    return {
        "original": gemini_result.get("original_summary", summary),
        "optimized": gemini_result.get("optimized_summary", ""),
        "optimized_bullets": gemini_result.get("optimized_bullets", []),
        "tips": gemini_result.get("tips", [
            "Include 1-2 quantified metrics.",
            "Tailor keywords directly to your target role.",
        ]),
    }


