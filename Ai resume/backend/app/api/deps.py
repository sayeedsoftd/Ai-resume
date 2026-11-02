from typing import Generator, List, Union, Callable
from fastapi import Depends, HTTPException, status
from jose import ExpiredSignatureError, JWTError
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.core.security import oauth2_scheme, decode_access_token
from app.models.user import User
from app.models.enums import UserRole


def get_db() -> Generator[Session, None, None]:
    """Database session dependency generator."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    """
    Extracts and validates user from the provided JWT access token.
    Handles expired tokens and invalid signatures gracefully.
    """
    try:
        payload = decode_access_token(token)
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str: str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject format.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User associated with this token not found.",
        )

    return user


def require_role(roles: List[Union[UserRole, str]]) -> Callable[[User], User]:
    """
    Factory creating a dependency that enforces the current user has one of the required roles.
    """
    allowed_values = {r.value if isinstance(r, UserRole) else str(r) for r in roles}

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role_str = (
            current_user.role.value
            if isinstance(current_user.role, UserRole)
            else str(current_user.role)
        )
        if user_role_str not in allowed_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of roles {list(allowed_values)}",
            )
        return current_user

    return role_checker


# Pre-built Role Dependencies
require_super_admin = require_role([UserRole.SUPER_ADMIN])
require_subscriber_or_admin = require_role([UserRole.SUBSCRIBER, UserRole.RECRUITER, UserRole.SUPER_ADMIN])
require_normal_user = require_role([UserRole.NORMAL_USER, UserRole.SUBSCRIBER, UserRole.RECRUITER, UserRole.SUPER_ADMIN])
