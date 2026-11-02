import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings
from app.utils.logger import logger

MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def save_recruiter_kyc_pdf(upload_file: UploadFile) -> str:
    """
    Secure upload handler for business verification documents (trade license / company registration).
    Strictly accepts PDF format (max 10MB) into uploads/kyc_docs/.
    Validates extension, MIME type, and PDF header signature.
    Returns the normalized relative URL path (e.g. 'uploads/kyc_docs/<filename>.pdf').
    """
    filename = upload_file.filename or ""
    ext = Path(filename).suffix.lower()

    if ext != ".pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business KYC document must be a PDF file (.pdf).",
        )

    # Check content-type header if available
    content_type = (upload_file.content_type or "").lower()
    if content_type and "pdf" not in content_type and content_type != "application/octet-stream":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file MIME type is not valid PDF.",
        )

    # Read content to validate size and magic bytes
    content = upload_file.file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded KYC document is empty.",
        )

    if len(content) > MAX_PDF_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"KYC document exceeds maximum allowed size of 10MB (actual: {len(content) / (1024 * 1024):.2f}MB).",
        )

    # Validate PDF magic header signature (%PDF)
    if not content.startswith(b"%PDF"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format: File header does not match valid PDF document signature.",
        )

    # Save to uploads/kyc_docs/ with secure UUID
    target_dir = settings.kyc_docs_upload_dir
    target_dir.mkdir(parents=True, exist_ok=True)
    unique_filename = f"{uuid.uuid4().hex}.pdf"
    destination = target_dir / unique_filename

    with destination.open("wb") as f:
        f.write(content)

    try:
        relative_path = destination.resolve().relative_to(settings.BASE_DIR.resolve()).as_posix()
    except ValueError:
        relative_path = f"uploads/kyc_docs/{unique_filename}"

    logger.info(f"Successfully saved recruiter KYC PDF to {relative_path}")
    return relative_path
