import os
from typing import List, Union
from pathlib import Path
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Resume Analyzer & Job Match System"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "supersecretjwtkeyforairesumeanalyzersystemchangeinproduction"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # MySQL Configuration
    MYSQL_SERVER: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_DB: str = "ai_resume_db"
    DATABASE_URL: str | None = None

    # Google OAuth & Gemini
    GOOGLE_CLIENT_ID: str = ""
    GEMINI_API_KEY: str = ""


    # Storage paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )

    @field_validator("UPLOAD_DIR", mode="before")
    def assemble_upload_dir(cls, v: Union[str, Path, None], info) -> Path:
        base = Path(__file__).resolve().parent.parent.parent
        if v:
            p = Path(v)
            if not p.is_absolute():
                return (base / p).resolve()
            return p.resolve()
        return (base / "uploads").resolve()

    @field_validator("DATABASE_URL", mode="before")
    def assemble_db_connection(cls, v: str | None, info) -> str:
        if isinstance(v, str) and v.strip():
            return v
        data = info.data
        user = data.get("MYSQL_USER", "root")
        password = data.get("MYSQL_PASSWORD", "")
        server = data.get("MYSQL_SERVER", "localhost")
        port = data.get("MYSQL_PORT", 3306)
        db = data.get("MYSQL_DB", "ai_resume_db")
        auth = f"{user}:{password}" if password else f"{user}"
        return f"mysql+pymysql://{auth}@{server}:{port}/{db}?charset=utf8mb4"

    @property
    def resume_upload_dir(self) -> Path:
        path = self.UPLOAD_DIR / "resumes"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def kyc_upload_dir(self) -> Path:
        path = self.UPLOAD_DIR / "kyc"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def avatar_upload_dir(self) -> Path:
        path = self.UPLOAD_DIR / "avatars"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def photos_upload_dir(self) -> Path:
        path = self.UPLOAD_DIR / "photos"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def kyc_docs_upload_dir(self) -> Path:
        path = self.UPLOAD_DIR / "kyc_docs"
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()
