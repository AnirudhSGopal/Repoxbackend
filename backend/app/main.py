from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.routes import webhook, auth, dashboard, chat, admin
from app.config import settings
from app.models import init_db

app = FastAPI(
    title="PRGuard", description="Codebase Learning Assistant", version="1.0.0"
)

logger = logging.getLogger("prguard")

from app.middleware import GlobalHardenMiddleware, AdminRoleMiddleware
from app.logger import log_request_middleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.models.base import AsyncSessionLocal
from app.services.admin_bootstrap import ensure_default_admin
from app.models.base import ping_database

app.add_middleware(BaseHTTPMiddleware, dispatch=log_request_middleware)
app.add_middleware(GlobalHardenMiddleware)
app.add_middleware(AdminRoleMiddleware)

allow_origins = settings.cors_origins()

cors_kwargs = {
    "allow_origins": allow_origins,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}

if settings.is_development():
    cors_kwargs["allow_origin_regex"] = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"

app.add_middleware(CORSMiddleware, **cors_kwargs)

app.include_router(webhook.router, prefix="/webhook", tags=["webhook"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])


@app.on_event("startup")
async def startup():
    from app.model_config import validate_environment

    try:
        print("[STARTUP] Starting PRGuard backend...")
        # 1. Validate Core Application Environment
        print("[STARTUP] Validating environment...")
        validate_environment(settings)
        print("[STARTUP] Environment validation complete.")

        # 2. Init Database
        print(f"[STARTUP] Initializing database at {settings.database_host_summary()}...")
        await init_db()
        print("[STARTUP] Database initialization complete.")

        # 3. Bootstrap admin user for password-based admin login (optional).
        async with AsyncSessionLocal() as db:
            await ensure_default_admin(db)
        print("[STARTUP] Admin bootstrap complete.")

        # 4. Optionally pre-load RAG dependencies
        if settings.PRELOAD_RAG_ON_STARTUP:
            print("[STARTUP] Pre-loading RAG dependencies...")
            try:
                from app.services.rag import _get_embedding_model, _get_chroma_client

                _get_chroma_client()  # Initialize ChromaDB client
                _get_embedding_model()  # Load embedding model
                print("[STARTUP] RAG dependencies loaded successfully.")
            except Exception as e:
                print(f"[WARN] Failed to pre-load RAG dependencies: {e}")
                print("[STARTUP] RAG will load on first use.")
        else:
            print("[STARTUP] Skipping RAG preload (PRELOAD_RAG_ON_STARTUP=false).")

        print("[STARTUP] PRGuard backend started successfully.")
    except Exception as e:
        print(f"[CRITICAL] System startup failed: {e}")
        # In production, we exit. In dev, we might allow limited mode.
        if settings.ENVIRONMENT == "production":
            import sys

            sys.exit(1)
        print("[WARN] System running in degraded mode.")


@app.get("/health")
async def health(response: Response):
    required_env_loaded = bool(settings.DATABASE_URL and settings.SECRET_KEY)
    llm_key_configured = settings.has_any_llm_key()
    database_connected = False
    database_error = None

    try:
        await ping_database()
        database_connected = True
    except Exception as exc:
        database_error = str(exc)
        response.status_code = 503

    return {
        "status": "ok" if database_connected else "degraded",
        "service": "PRGuard",
        "database_url_configured": required_env_loaded,
        "database_connected": database_connected,
        "database_target": settings.database_host_summary(),
        "database_error": database_error,
        "llm_key_configured": llm_key_configured,
        "env_loaded": required_env_loaded,
    }


@app.get("/health/db")
async def health_db(response: Response):
    try:
        await ping_database()
        logger.info("DB health check passed: %s", settings.database_host_summary())
        return {
            "status": "ok",
            "database_connected": True,
            "database_target": settings.database_host_summary(),
        }
    except Exception as exc:
        logger.error("DB health check failed: %s", exc)
        response.status_code = 503
        return {
            "status": "error",
            "database_connected": False,
            "database_target": settings.database_host_summary(),
            "error": str(exc),
        }
