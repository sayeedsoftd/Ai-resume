from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.application import JobApplication
from app.models.resume import Resume
from app.models.profile import UserProfile
from app.models.job import Job
from app.models.project_integrity import ProjectIntegrityAudit
from app.schemas.project_integrity import (
    ProjectIntegrityAuditResponse,
    ProjectAuditRequest,
)
from app.services.project_integrity_service import ProjectIntegrityService
from app.utils.logger import logger

router = APIRouter()


def _extract_projects_from_sources(
    candidate: User,
    resume: Resume | None,
    profile: UserProfile | None,
) -> tuple[List[Dict[str, Any]], Dict[str, Any] | None]:
    """Helper to aggregate candidate projects from Resume parsed data, Profile, and GitHub sync."""
    projects: List[Dict[str, Any]] = []

    # 1. Projects from Candidate Profile
    if profile and profile.projects and isinstance(profile.projects, list):
        projects.extend(profile.projects)

    # 2. Projects from Parsed Resume
    if resume and resume.parsed_data and isinstance(resume.parsed_data, dict):
        resume_projects = resume.parsed_data.get("projects") or resume.parsed_data.get("featured_projects")
        if resume_projects and isinstance(resume_projects, list):
            for rp in resume_projects:
                rp_title = rp.get("title") or rp.get("name") or ""
                # Avoid duplicate title entries
                if not any((p.get("title") or p.get("name") or "").lower() == rp_title.lower() for p in projects):
                    projects.append(rp)

    # 3. GitHub repository info
    github_data = None
    if profile and profile.github_data and isinstance(profile.github_data, dict):
        github_data = profile.github_data

    return projects, github_data


@router.post(
    "/applications/{application_id}/audit-projects",
    response_model=ProjectIntegrityAuditResponse,
    summary="Run forensic tutorial clone & plagiarism audit on application projects",
)
def audit_application_projects(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recruiter Command:
    Audits the candidate's projects (from CV and GitHub) for tutorial clone signatures,
    boilerplates, and code plagiarism. Saves or updates the ProjectIntegrityAudit record.
    """
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job application not found.",
        )

    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated job not found.",
        )

    # Permission check: Job poster, recruiter, or the candidate themselves
    is_poster = job.posted_by_user_id == current_user.id
    is_candidate = application.user_id == current_user.id
    is_admin = current_user.role.value in ["SUPER_ADMIN", "ADMIN"]

    if not (is_poster or is_candidate or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to audit projects for this application.",
        )

    candidate = db.query(User).filter(User.id == application.user_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate user record not found.",
        )

    resume = db.query(Resume).filter(Resume.id == application.resume_id).first()
    profile = db.query(UserProfile).filter(UserProfile.user_id == candidate.id).first()

    projects_list, github_data = _extract_projects_from_sources(candidate, resume, profile)

    # If no structured projects found, build sample representations from skills/resume
    if not projects_list:
        cand_skills = []
        if resume and resume.parsed_data:
            cand_skills = resume.parsed_data.get("skills", [])
        elif profile and profile.skills:
            cand_skills = profile.skills

        projects_list = [
            {
                "title": f"Candidate Core Portfolio ({' / '.join(cand_skills[:4]) or 'Software Engineering'})",
                "description": "Custom full-stack web applications and services submitted in candidate portfolio.",
                "technologies": cand_skills[:6],
            }
        ]

    # Perform forensic AI audit
    audit_data = ProjectIntegrityService.audit_projects_for_plagiarism(
        projects_list=projects_list,
        github_repo_data=github_data,
    )

    # Check if an audit already exists for this application
    existing_audit = (
        db.query(ProjectIntegrityAudit)
        .filter(ProjectIntegrityAudit.application_id == application.id)
        .first()
    )

    if existing_audit:
        existing_audit.overall_originality_score = audit_data["overall_originality_score"]
        existing_audit.integrity_verdict = audit_data["integrity_verdict"]
        existing_audit.risk_level = audit_data["risk_level"]
        existing_audit.audited_projects = audit_data["audited_projects"]
        existing_audit.ai_forensic_summary = audit_data["ai_forensic_summary"]
        db.add(existing_audit)
        db.commit()
        db.refresh(existing_audit)
        audit_record = existing_audit
    else:
        new_audit = ProjectIntegrityAudit(
            application_id=application.id,
            candidate_id=candidate.id,
            overall_originality_score=audit_data["overall_originality_score"],
            integrity_verdict=audit_data["integrity_verdict"],
            risk_level=audit_data["risk_level"],
            audited_projects=audit_data["audited_projects"],
            ai_forensic_summary=audit_data["ai_forensic_summary"],
        )
        db.add(new_audit)
        db.commit()
        db.refresh(new_audit)
        audit_record = new_audit

    return audit_record


@router.get(
    "/applications/{application_id}/integrity-audit",
    response_model=ProjectIntegrityAuditResponse,
    summary="Retrieve project integrity and clone audit for an application",
)
def get_application_integrity_audit(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve existing forensic project audit for an application.
    If no audit exists yet, automatically performs the initial audit and returns it.
    """
    application = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job application not found.",
        )

    job = db.query(Job).filter(Job.id == application.job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated job not found.",
        )

    is_poster = job.posted_by_user_id == current_user.id
    is_candidate = application.user_id == current_user.id
    is_admin = current_user.role.value in ["SUPER_ADMIN", "ADMIN"]

    if not (is_poster or is_candidate or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to inspect the integrity audit for this application.",
        )

    audit = (
        db.query(ProjectIntegrityAudit)
        .filter(ProjectIntegrityAudit.application_id == application_id)
        .first()
    )

    if not audit:
        # Run automatic initial audit
        return audit_application_projects(
            application_id=application_id,
            current_user=current_user,
            db=db,
        )

    return audit


@router.post(
    "/analyze",
    response_model=ProjectIntegrityAuditResponse,
    summary="Ad-hoc analysis of project list for plagiarism",
)
def analyze_custom_projects(
    payload: ProjectAuditRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Ad-hoc forensic auditor endpoint to test and verify arbitrary project lists.
    """
    projects = payload.projects or []
    audit_data = ProjectIntegrityService.audit_projects_for_plagiarism(
        projects_list=projects,
        github_repo_data=payload.github_data,
    )

    return ProjectIntegrityAuditResponse(
        id=None,
        application_id=None,
        candidate_id=current_user.id,
        overall_originality_score=audit_data["overall_originality_score"],
        integrity_verdict=audit_data["integrity_verdict"],
        risk_level=audit_data["risk_level"],
        audited_projects=audit_data["audited_projects"],
        ai_forensic_summary=audit_data["ai_forensic_summary"],
        created_at=None,
    )
