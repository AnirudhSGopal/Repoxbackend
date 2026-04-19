from __future__ import annotations

import logging
from typing import Any

from redis.asyncio import Redis

from app.config import settings

logger = logging.getLogger("prguard")

_redis_client: Redis | None = None


def _build_redis_client() -> Redis | None:
    redis_url = (settings.REDIS_URL or "").strip()
    if not redis_url:
        return None

    return Redis.from_url(
        redis_url,
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
        health_check_interval=30,
        retry_on_timeout=True,
    )


def get_redis_client() -> Redis | None:
    global _redis_client
    if _redis_client is None:
        _redis_client = _build_redis_client()
    return _redis_client


async def ping_redis() -> tuple[bool, str | None]:
    client = get_redis_client()
    if client is None:
        return False, "REDIS_URL not configured"

    try:
        await client.ping()
        return True, None
    except Exception as exc:  # pragma: no cover - runtime infra failures
        logger.warning("Redis ping failed: %s", exc)
        return False, str(exc)


async def warm_redis_connection() -> None:
    connected, error = await ping_redis()
    if connected:
        logger.info("Redis connection verified")
    else:
        logger.warning("Redis unavailable during startup; continuing in degraded mode: %s", error)


async def set_secret_ref(key: str, value: str, ttl_seconds: int = 1800) -> bool:
    client = get_redis_client()
    if client is None:
        return False
    try:
        await client.setex(key, ttl_seconds, value)
        return True
    except Exception:
        return False


async def pop_secret_ref(key: str) -> str | None:
    client = get_redis_client()
    if client is None:
        return None
    try:
        value: Any = await client.get(key)
        if value is None:
            return None
        await client.delete(key)
        return str(value)
    except Exception:
        return None
