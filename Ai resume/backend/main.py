from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.database.session import engine
from app.database.base import Base
from app.api.v1.api_router import api_router
from app.utils.logger import logger

# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload folders exist
settings.resume_upload_dir
settings.kyc_upload_dir
settings.avatar_upload_dir
settings.photos_upload_dir

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
def on_startup():
    logger.info(f"Starting {settings.PROJECT_NAME} in {settings.ENVIRONMENT} mode.")
    try:
        # Create tables automatically if database exists (for rapid dev environment)
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified/initialized successfully.")
    except Exception as e:
        logger.warning(f"Could not automatically create tables at startup (MySQL may be offline or migrating via Alembic): {e}")


@app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
def root():
    """Redirect root path to interactive Swagger documentation."""
    return RedirectResponse(url=f"{settings.API_V1_STR}/docs")


@app.get("/health", tags=["Health"])
def health_check():
    """Service health and liveness probe."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
