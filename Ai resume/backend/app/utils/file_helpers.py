import os
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

def save_uploaded_file(upload_file: UploadFile, target_dir: Path, allowed_extensions: set[str]) -> str:
    """
    Saves an uploaded file with a UUID filename to prevent collisions and directory traversal.
    Returns relative path from backend directory.
    """
    ext = Path(upload_file.filename or "").suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension '{ext}'. Allowed: {', '.join(allowed_extensions)}",
        )

    target_dir.mkdir(parents=True, exist_ok=True)
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    destination = target_dir / unique_filename

    with destination.open("wb") as buffer:
        content = upload_file.file.read()
        # Enforce max upload size
        if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB",
            )
        buffer.write(content)

    # Return relative path normalized with forward slashes
    try:
        relative_path = destination.resolve().relative_to(settings.BASE_DIR.resolve()).as_posix()
    except ValueError:
        relative_path = f"uploads/{destination.parent.name}/{destination.name}"
    return relative_path
