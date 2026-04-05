from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import webhook, auth, dashboard, chat
from app.config import settings

app = FastAPI(
    title="PRGuard",
    description="Codebase Learning Assistant",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        settings.APP_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhook.router, prefix="/webhook", tags=["webhook"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(chat.router, prefix="/api", tags=["chat"])

@app.get("/health")
async def health():
    return {"status": "ok", "service": "PRGuard"}