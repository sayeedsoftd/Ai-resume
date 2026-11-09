from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.base import Base


class ProjectIntegrityAudit(Base):
    """
    Forensic Code & Project Plagiarism Audit:
    Detects whether candidate projects are authentic, custom-engineered systems
    or copied tutorial clones (YouTube/Udemy/Bootcamp boilerplates).
    """
    __tablename__ = "project_integrity_audits"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(
        Integer,
        ForeignKey("job_applications.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    candidate_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 0 to 100 score indicating originality & authenticity
    overall_originality_score = Column(Integer, nullable=False, default=100)
    
    # "AUTHENTIC", "GENERIC_BOILERPLATE", "TUTORIAL_CLONE"
    integrity_verdict = Column(String(50), nullable=False, default="AUTHENTIC")
    
    # "LOW", "MEDIUM", "HIGH"
    risk_level = Column(String(20), nullable=False, default="LOW")

    # Detailed list of analyzed projects with clone risk flags, evidence, and architectural notes
    audited_projects = Column(JSON, nullable=True)

    # In-depth AI forensic evaluation commentary
    ai_forensic_summary = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    application = relationship("JobApplication", back_populates="project_integrity_audit")
    candidate = relationship("User", back_populates="project_integrity_audits")

    def __repr__(self) -> str:
        return (
            f"<ProjectIntegrityAudit id={self.id} app_id={self.application_id} "
            f"score={self.overall_originality_score} verdict={self.integrity_verdict}>"
        )
