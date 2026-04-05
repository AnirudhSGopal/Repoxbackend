from fastapi import APIRouter, Request, HTTPException
from app.security import verify_signature

router = APIRouter()

@router.post("/github")
async def github_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")

    if not verify_signature(body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    event = request.headers.get("X-GitHub-Event", "")

    if event == "pull_request":
        action = payload.get("action")
        if action in ["opened", "synchronize"]:
            print(f"PR event received: {action}")

    return {"status": "ok"}