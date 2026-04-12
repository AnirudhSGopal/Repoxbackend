from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.services.admin_auth import hash_password


async def ensure_default_admin(db: AsyncSession) -> None:
    username = (settings.ADMIN_USERNAME or "").strip()
    email = (settings.ADMIN_EMAIL or "").strip() or None
    password = (settings.ADMIN_PASSWORD or "").strip()

    if not username or not password:
        return

    stmt = select(User).where(User.username == username).order_by(User.created_at.desc()).limit(1)
    result = await db.execute(stmt)
    user = result.scalars().first()

    now = datetime.now(timezone.utc)
    if user:
        user.role = "admin"
        user.auth_provider = "local"
        user.email = email or user.email
        user.is_disabled = False
        user.password_hash = hash_password(password)
        user.github_id = None
        if user.access_token is None:
            user.access_token = ""
        if user.created_at is None:
            user.created_at = now
    else:
        user = User(
            github_id=None,
            username=username,
            email=email,
            password_hash=hash_password(password),
            role="admin",
            auth_provider="local",
            access_token="",
            is_disabled=False,
            created_at=now,
        )
        db.add(user)

    await db.commit()
