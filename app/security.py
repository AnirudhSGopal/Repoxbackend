import hmac
import hashlib
from app.config import settings


def verify_signature(payload: bytes, signature: str) -> bool:
    """Verify GitHub webhook signature."""
    if not signature:
        return False

    expected = hmac.new(
        settings.GITHUB_WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    expected_sig = f"sha256={expected}"
    return hmac.compare_digest(expected_sig, signature)


def create_github_oauth_url() -> str:
    """Generate the GitHub OAuth authorization URL."""
    params = (
        f"client_id={settings.GITHUB_CLIENT_ID}"
        f"&scope=repo,read:user,user:email"
        f"&allow_signup=true"
    )
    return f"https://github.com/login/oauth/authorize?{params}"


async def exchange_code_for_token(code: str) -> str | None:
    """Exchange OAuth code for a GitHub access token."""
    import httpx

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            json={
                "client_id":     settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code":          code,
            },
        )

    data = resp.json()
    return data.get("access_token")


async def get_github_user(access_token: str) -> dict:
    """Fetch the authenticated GitHub user's profile."""
    import httpx

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept":        "application/vnd.github+json",
            },
        )
    return resp.json()