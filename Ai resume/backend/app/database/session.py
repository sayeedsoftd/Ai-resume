from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

# MySQL SQLAlchemy Engine with connection pool tuning for production robustness
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,       # Test connections on checkout to avoid stale MySQL connections
    pool_recycle=3600,        # Recycle connections every hour (prevents MySQL "server has gone away")
    pool_size=10,             # Base number of pooled connections
    max_overflow=20,          # Maximum overflow connections during traffic bursts
    echo=settings.DEBUG,      # SQL logging enabled in development mode
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a database session and safely closes it
    upon request completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
