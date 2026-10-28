import json
from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional
from jose import jwt, JWTError, ExpiredSignatureError
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
import httpx
from app.core.config import settings
from app.utils.logger import logger

import bcrypt

# OAuth2 Password Bearer scheme pointing to login endpoint
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    scheme_name="OAuth2PasswordBearer",
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify raw password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generate bcrypt password hash."""
    pwd_bytes = password.encode('utf-8')[:72]  # Bcrypt 72-byte max
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')



def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[dict[str, Any]] = None,
) -> str:
    """Create a signed JWT access token with expiration timestamp."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "sub": str(subject),
    }
    if extra_claims:
        to_encode.update(extra_claims)

    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT access token.
    Raises ExpiredSignatureError or JWTError upon failure.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except ExpiredSignatureError:
        logger.warning("JWT Token has expired")
        raise
    except JWTError as e:
        logger.warning(f"Invalid JWT Token: {e}")
        raise


async def verify_google_id_token(id_token: str) -> Optional[dict[str, Any]]:
    """
    Verify Google OAuth2 ID Token by querying Google's tokeninfo endpoint.
    Returns user info dictionary with email, name, sub (google_id) if valid.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": id_token},
            )
            if resp.status_code == 200:
                data = resp.json()
                # If GOOGLE_CLIENT_ID configured, verify audience matches
                if settings.GOOGLE_CLIENT_ID and data.get("aud") != settings.GOOGLE_CLIENT_ID:
                    logger.error("Google token audience mismatch")
                    return None
                return {
                    "email": data.get("email"),
                    "full_name": data.get("name", "Google User"),
                    "google_id": data.get("sub"),
                    "email_verified": data.get("email_verified", "true") == "true",
                    "picture": data.get("picture"),
                }
            else:
                logger.warning(f"Google tokeninfo returned status {resp.status_code}: {resp.text}")
                # Fallback: if development mode and JWT has unverified claims, allow for local dev testing
                if settings.DEBUG:
                    try:
                        unverified = jwt.get_unverified_claims(id_token)
                        if "email" in unverified:
                            return {
                                "email": unverified.get("email"),
                                "full_name": unverified.get("name", unverified.get("email", "Google User")),
                                "google_id": unverified.get("sub", "dev-google-sub"),
                                "email_verified": True,
                                "picture": unverified.get("picture"),
                            }
                    except Exception:
                        pass
                return None
    except Exception as e:
        logger.error(f"Error during Google token verification: {e}")
        return None
