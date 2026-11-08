import hmac
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.models.job import Job
from app.models.application import JobApplication
from app.models.assessment import CandidateTestSubmission
from app.models.verified_badge import VerifiedBadge
from app.models.notification import Notification
from app.models.enums import NotificationType
from app.utils.logger import logger


class BadgeService:
    @staticmethod
    def generate_verification_token(candidate_id: int, badge_id: str, score: float, timestamp: str) -> str:
        """
        Generates a tamper-proof HMAC-SHA256 signature combining the server secret key,
        candidate identifier, public badge slug, and exact score achieved.
        """
        secret = settings.SECRET_KEY.encode("utf-8")
        payload = f"{candidate_id}:{badge_id}:{score:.2f}:{timestamp}:{settings.PROJECT_NAME}".encode("utf-8")
        return hmac.new(secret, payload, hashlib.sha256).hexdigest()

    @staticmethod
    def issue_badge_if_eligible(
        db: Session,
        candidate_id: int,
        score: float,
        skill_domain: str,
        job_id: Optional[int] = None,
        application_id: Optional[int] = None,
        submission_id: Optional[int] = None,
        verified_skills: Optional[List[str]] = None,
    ) -> Optional[VerifiedBadge]:
        """
        Evaluates eligibility (score >= 80%). If eligible and not already issued,
        persists a VerifiedBadge record with cryptographic token and in-app alert.
        """
        if score < 80.0:
            return None

        # Check if badge already issued for this candidate and specific job / skill domain
        query = db.query(VerifiedBadge).filter(
            VerifiedBadge.candidate_id == candidate_id,
            VerifiedBadge.is_active == True,
        )
        if job_id:
            query = query.filter(VerifiedBadge.job_id == job_id)
        else:
            query = query.filter(VerifiedBadge.skill_domain == skill_domain)

        existing = query.first()
        if existing:
            # Update score if new score is higher
            if score > existing.score_achieved:
                existing.score_achieved = round(score, 1)
                existing.percentile_rank = min(99.0, max(85.0, round(score + 8.5, 1)))
                existing.verification_token = BadgeService.generate_verification_token(
                    candidate_id=candidate_id,
                    badge_id=existing.badge_id,
                    score=existing.score_achieved,
                    timestamp=existing.issued_at.isoformat(),
                )
                if verified_skills:
                    current_skills = set(existing.verified_skills or [])
                    current_skills.update(verified_skills)
                    existing.verified_skills = list(current_skills)
                db.commit()
                db.refresh(existing)
            return existing

        # Generate unique badge slug e.g. BADGE-2026-A8F2K9M1
        year = datetime.now(timezone.utc).year
        slug = uuid.uuid4().hex[:8].upper()
        badge_id = f"BADGE-{year}-{slug}"

        # Resolve verified skills
        skills = list(verified_skills or [])
        if not skills and job_id:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job and job.required_skills:
                skills = job.required_skills

        if not skills:
            skills = ["Technical Problem Solving", "Analytical Reasoning", "Core Domain Competence"]

        now_utc = datetime.now(timezone.utc)
        percentile = min(99.0, max(85.0, round(score + 8.5, 1)))
        token = BadgeService.generate_verification_token(
            candidate_id=candidate_id,
            badge_id=badge_id,
            score=score,
            timestamp=now_utc.isoformat(),
        )

        badge = VerifiedBadge(
            badge_id=badge_id,
            candidate_id=candidate_id,
            job_id=job_id,
            application_id=application_id,
            submission_id=submission_id,
            skill_domain=skill_domain or "Full-Stack Software Development",
            score_achieved=round(score, 1),
            percentile_rank=percentile,
            verified_skills=skills,
            verification_token=token,
            issued_at=now_utc,
            is_active=True,
        )
        db.add(badge)

        # Notify Candidate
        try:
            cand_user = db.query(User).filter(User.id == candidate_id).first()
            name = cand_user.full_name if cand_user else "Candidate"
            notif = Notification(
                user_id=candidate_id,
                title="🏅 Verified Talent Badge Issued!",
                message=(
                    f"Outstanding performance, {name}! You scored {round(score, 1)}% in {skill_domain}. "
                    f"Your cryptographically verified credential ({badge_id}) has been added to your profile."
                ),
                type=NotificationType.SYSTEM,
                is_read=False,
            )
            db.add(notif)
        except Exception as e:
            logger.warning(f"Could not dispatch badge notification: {e}")

        db.commit()
        db.refresh(badge)
        logger.info(f"VerifiedBadge created: {badge.badge_id} for candidate {candidate_id} (Score: {score}%)")
        return badge

    @staticmethod
    def sync_candidate_eligible_badges(db: Session, candidate_id: int) -> List[VerifiedBadge]:
        """
        Scans all candidate test submissions and applications.
        If any assessment or test score is >= 80% and not yet badged,
        automatically creates and returns the badge.
        """
        # 1. Check candidate test submissions
        submissions = (
            db.query(CandidateTestSubmission)
            .filter(
                CandidateTestSubmission.candidate_id == candidate_id,
                CandidateTestSubmission.total_test_score >= 80.0,
                CandidateTestSubmission.is_suspicious == False,
            )
            .all()
        )
        for sub in submissions:
            job = db.query(Job).filter(Job.id == sub.job_id).first() if sub.job_id else None
            domain = job.title if job else "Technical Assessment Track"
            skills = job.required_skills if job and job.required_skills else ["Technical Problem Solving"]
            BadgeService.issue_badge_if_eligible(
                db=db,
                candidate_id=candidate_id,
                score=sub.total_test_score,
                skill_domain=domain,
                job_id=sub.job_id,
                application_id=sub.application_id,
                submission_id=sub.id,
                verified_skills=skills,
            )

        # 2. Check candidate applications where test_score >= 80%
        apps = (
            db.query(JobApplication)
            .filter(
                JobApplication.user_id == candidate_id,
                JobApplication.test_score >= 80.0,
                JobApplication.is_suspicious == False,
            )
            .all()
        )
        for app in apps:
            job = db.query(Job).filter(Job.id == app.job_id).first() if app.job_id else None
            domain = job.title if job else "Software Engineering Assessment"
            skills = job.required_skills if job and job.required_skills else ["Software Engineering"]
            BadgeService.issue_badge_if_eligible(
                db=db,
                candidate_id=candidate_id,
                score=app.test_score,
                skill_domain=domain,
                job_id=app.job_id,
                application_id=app.id,
                verified_skills=skills,
            )

        # Return all active badges
        return (
            db.query(VerifiedBadge)
            .filter(
                VerifiedBadge.candidate_id == candidate_id,
                VerifiedBadge.is_active == True,
            )
            .order_by(VerifiedBadge.issued_at.desc())
            .all()
        )
