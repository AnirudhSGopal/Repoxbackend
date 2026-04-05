import httpx
from fastapi import APIRouter, HTTPException, Response, Cookie
from fastapi.responses import RedirectResponse
from app.config import settings
from app.security import (
    create_github_oauth_url,
    exchange_code_for_token,
    get_github_user,
)

router = APIRouter()

# ── GitHub OAuth ─────────────────────────────────────────────────────────────

@router.get("/github")
async def github_login():
    """Redirect the user to GitHub to begin OAuth."""
    return RedirectResponse(url=create_github_oauth_url())


@router.get("/github/callback")
async def github_callback(
    code: str = "",
    installation_id: str = "",
    error: str = "",
):
    """
    GitHub redirects here after the user authorises the app.
    Exchange the code for an access token, fetch the user profile,
    store the token in an HTTP-only cookie, then redirect to the dashboard.
    """
    if error:
        raise HTTPException(status_code=400, detail=f"GitHub OAuth error: {error}")

    if not code:
        raise HTTPException(status_code=400, detail="Missing OAuth code")

    # Exchange code → access token
    access_token = await exchange_code_for_token(code)
    if not access_token:
        raise HTTPException(
            status_code=401,
            detail="Failed to obtain access token from GitHub. "
                   "The code may have expired — please try again.",
        )

    # Verify the token works by fetching the user
    user = await get_github_user(access_token)
    if "login" not in user:
        raise HTTPException(status_code=401, detail="Invalid GitHub token")

    # Store token in HTTP-only cookie so the frontend can't read it directly
    frontend_url = settings.APP_URL.replace(":8000", ":5173")   # dev convenience
    response = RedirectResponse(url=f"{frontend_url}/dashboard")
    response.set_cookie(
        key="gh_token",
        value=access_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=60 * 60 * 8,   # 8 hours
    )
    return response


@router.get("/me")
async def get_current_user(gh_token: str = Cookie(default=None)):
    """Return the authenticated GitHub user's profile."""
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = await get_github_user(gh_token)
    if "login" not in user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {
        "login":      user.get("login"),
        "name":       user.get("name"),
        "avatar_url": user.get("avatar_url"),
        "email":      user.get("email"),
        "html_url":   user.get("html_url"),
    }


@router.post("/logout")
async def logout(response: Response):
    """Clear the auth cookie."""
    response.delete_cookie("gh_token")
    return {"status": "logged out"}


# ── GitHub App webhook install callback (kept from original) ─────────────────

@router.get("/callback")
async def github_app_callback(
    code: str = "",
    installation_id: str = "",
):
    """GitHub App installation callback (separate from OAuth)."""
    return {
        "status": "ok",
        "installation_id": installation_id,
        "message": "GitHub App installed successfully",
    }