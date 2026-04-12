from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, Response
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import User
from app.services.admin_auth import create_session_token, hash_session_token, verify_password

SESSION_COOKIE_NAME = "session_token"


async def authenticate_admin_credentials(
    db: AsyncSession,
    email: str,
    password: str,
) -> User:
    email_value = (email or "").strip().lower()
    if not email_value or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    stmt = select(User).where(
        func.lower(User.email) == email_value,
        User.role == "admin",
        User.auth_provider == "local",
        User.is_disabled.is_(False),
    ).order_by(User.created_at.desc()).limit(1)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=403, detail="Admin email/password login required")

    if user.github_id:
        raise HTTPException(status_code=403, detail="Admin accounts cannot authenticate with GitHub")

    if not verify_password(password, user.password_hash or ""):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return user


def set_session_cookie(response: Response, session_token: str) -> None:
    is_prod = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
        max_age=settings.ADMIN_SESSION_TTL_SECONDS,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    is_prod = settings.ENVIRONMENT == "production"
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="none" if is_prod else "lax",
        secure=is_prod,
    )


def issue_session_for_user(user: User, response: Response) -> str:
    session_token = create_session_token()
    user.session_token_hash = hash_session_token(session_token)
    user.last_login_at = datetime.now(timezone.utc)
    set_session_cookie(response, session_token)
    return session_token


async def get_user_from_session(db: AsyncSession, session_token: str | None) -> User | None:
    raw = (session_token or "").strip()
    if not raw:
        return None

    stmt = select(User).where(
        User.session_token_hash == hash_session_token(raw),
        User.is_disabled.is_(False),
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
