from datetime import datetime, timezone, date
from sqlalchemy import Column, Integer, Date, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.base import Base


class UserSkillProgress(Base):
    __tablename__ = "user_skill_progress"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    current_streak_days = Column(Integer, default=0, nullable=False)
    last_quiz_completed_date = Column(Date, nullable=True)
    total_xp = Column(Integer, default=0, nullable=False)
    completed_quizzes_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", backref="skill_progress")

    def __repr__(self) -> str:
        return f"<UserSkillProgress user_id={self.user_id} streak={self.current_streak_days} xp={self.total_xp}>"


class DailyQuizSession(Base):
    __tablename__ = "daily_quiz_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    quiz_date = Column(Date, default=date.today, nullable=False, index=True)
    questions_payload = Column(JSON, nullable=False, default=list)
    candidate_answers = Column(JSON, nullable=True, default=list)
    score_achieved = Column(Integer, nullable=True)
    xp_earned = Column(Integer, default=0, nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", backref="daily_quiz_sessions")

    def __repr__(self) -> str:
        return f"<DailyQuizSession id={self.id} user_id={self.user_id} date={self.quiz_date} completed={self.is_completed}>"
