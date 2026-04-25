from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timezone
from time import monotonic
from uuid import uuid4

from app.config import settings
from app.services.redis_client import pop_secret_ref, set_secret_ref
from workers.review_worker import run_index_repo, run_pr_review

logger = logging.getLogger("prguard")


class _TTLJobCache:
    def __init__(self, maxsize: int, ttl_seconds: int):
        self.maxsize = maxsize
        self.ttl_seconds = ttl_seconds
        self._store: dict[str, tuple[float, dict]] = {}

    def _purge_expired(self) -> None:
        now = monotonic()
        expired_keys = [
            key for key, (inserted_at, _) in self._store.items() if now - inserted_at > self.ttl_seconds
        ]
        for key in expired_keys:
            self._store.pop(key, None)

    def _enforce_maxsize(self) -> None:
        while len(self._store) > self.maxsize:
            oldest_key = min(self._store, key=lambda key: self._store[key][0])
            self._store.pop(oldest_key, None)

    def get(self, key: str, default=None):
        self._purge_expired()
        value = self._store.get(key)
        if not value:
            return default
        return value[1]

    def pop(self, key: str, default=None):
        self._purge_expired()
        value = self._store.pop(key, None)
        if not value:
            return default
        return value[1]

    def __setitem__(self, key: str, value: dict) -> None:
        self._purge_expired()
        self._store[key] = (monotonic(), value)
        self._enforce_maxsize()

    def values(self):
        self._purge_expired()
        return [value for _, value in self._store.values()]


_job_results = _TTLJobCache(maxsize=2048, ttl_seconds=6 * 60 * 60)


async def _store_secret_ref(secret_value: str, ttl_seconds: int = 1800) -> str | None:
    value = (secret_value or "").strip()
    if not value:
        return None
    ref = f"secret:{uuid4().hex}"
    stored = await set_secret_ref(ref, value, ttl_seconds=ttl_seconds)
    if not stored:
        return None
    return ref


async def resolve_secret_ref(secret_ref: str | None) -> str | None:
    ref = (secret_ref or "").strip()
    if not ref:
        return None
    if not ref.startswith("secret:"):
        return ref
    return await pop_secret_ref(ref)


async def enqueue_index_repo(repo: str, token: str) -> str:
    job_id = f"sync-index-{repo.replace('/', '--')}-{uuid4().hex[:8]}"
    started_at = datetime.now(timezone.utc).isoformat()
    try:
        token_ref = await _store_secret_ref(token)
        result = await run_index_repo(repo=repo, token=token)
        result.setdefault("repo", repo)
        result.setdefault("job_type", "indexing")
        if token_ref:
            result.setdefault("token_ref", token_ref)
        result["status"] = "completed"
        result.setdefault("started_at", started_at)
        result["completed_at"] = datetime.now(timezone.utc).isoformat()
        _job_results[job_id] = result
        return job_id
    except Exception as exc:
        failed_result = {
            "repo": repo,
            "job_type": "indexing",
            "status": "failed",
            "error": str(exc),
            "started_at": started_at,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        _job_results[job_id] = failed_result
        logger.exception("Index job failed", extra={"job_id": job_id, "repo": repo})
        raise


async def enqueue_pr_review(
    repo: str,
    pr_number: int,
    token: str,
    provider: str,
    api_key: str,
) -> str:
    job_id = f"sync-review-{repo.replace('/', '--')}-pr-{pr_number}-{uuid4().hex[:8]}"
    started_at = datetime.now(timezone.utc).isoformat()
    try:
        token_ref = await _store_secret_ref(token)
        api_key_ref = await _store_secret_ref(api_key)
        result = await run_pr_review(
            repo=repo,
            pr_number=pr_number,
            token=token,
            provider=provider,
            api_key=api_key,
        )
        result.setdefault("repo", repo)
        result.setdefault("pr", pr_number)
        result.setdefault("job_type", "review")
        if token_ref:
            result.setdefault("token_ref", token_ref)
        if api_key_ref:
            result.setdefault("api_key_ref", api_key_ref)
        result["status"] = "completed"
        result.setdefault("started_at", started_at)
        result["completed_at"] = datetime.now(timezone.utc).isoformat()
        _job_results[job_id] = result
    except Exception as exc:
        failed_result = {
            "repo": repo,
            "pr": pr_number,
            "job_type": "review",
            "status": "failed",
            "error": str(exc),
            "started_at": started_at,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        _job_results[job_id] = failed_result
        logger.exception(
            "Review job failed",
            extra={"job_id": job_id, "repo": repo, "pr_number": pr_number},
        )
    return job_id


def get_job_status(job_id: str) -> dict:
    result = _job_results.get(job_id)
    if result is None:
        return {
            "job_id": job_id,
            "status": "not_found",
            "result": None,
            "error": None,
        }
    return {
        "job_id": job_id,
        "status": result.get("status", "unknown"),
        "result": result,
        "error": result.get("error"),
    }


def cancel_job(job_id: str) -> bool:
    return _job_results.pop(job_id, None) is not None


def get_queue_stats() -> dict:
    counts = defaultdict(int)
    for value in _job_results.values():
        counts[value.get("job_type", "unknown")] += 1

    return {
        "indexing": {"queued": 0, "failed": 0, "started": counts.get("indexing", 0)},
        "chat": {"queued": 0, "failed": 0, "started": 0},
        "review": {"queued": 0, "failed": 0, "started": counts.get("review", 0)},
        "redis_configured": bool((settings.REDIS_URL or "").strip()),
        "note": "Jobs run synchronously in the request lifecycle for free-tier deployment compatibility.",
    }
