from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.github_sync import GitHubSyncRequest, GitHubSyncResponse
from app.services.github_sync_service import GitHubSyncService

router = APIRouter()


@router.post("/sync-github", response_model=GitHubSyncResponse)
async def sync_candidate_github_profile(
    payload: GitHubSyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    1-Click GitHub Profile Auto-Sync & Profile Auto-Fill:
    - Validates GitHub username / profile URL against GitHub REST API
    - Aggregates repository counts, dominant languages, stars, and top repos
    - Uses Gemini Pro to synthesize a targeted headline, 3-sentence bio, skills, and featured projects
    - Automatically populates the candidate's UserProfile in the database
    """
    result = await GitHubSyncService.sync_github_for_user(
        user=current_user,
        raw_username_or_url=payload.github_username,
        db=db,
        apply_to_profile=payload.apply_to_profile if payload.apply_to_profile is not None else True,
    )
    return result
