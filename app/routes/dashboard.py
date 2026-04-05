import httpx
from fastapi import APIRouter, Cookie, HTTPException, Query

router = APIRouter()

GITHUB_API = "https://api.github.com"


def _headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept":        "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _require_token(gh_token: str | None) -> str:
    if not gh_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return gh_token


# ── Repos ────────────────────────────────────────────────────────────────────

@router.get("/repos")
async def get_repos(gh_token: str = Cookie(default=None)):
    """
    Return the authenticated user's repos (starred + own).
    Falls back to mock data when not authenticated so the UI still works
    during development without a GitHub login.
    """
    if not gh_token:
        return _mock_repos()

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GITHUB_API}/user/repos",
            headers=_headers(gh_token),
            params={
                "sort":      "updated",
                "direction": "desc",
                "per_page":  30,
                "affiliation": "owner,collaborator,organization_member",
            },
        )

    if resp.status_code != 200:
        return _mock_repos()

    repos = resp.json()
    return [
        {
            "id":       r["id"],
            "name":     r["full_name"],
            "stars":    r["stargazers_count"],
            "language": r["language"] or "Unknown",
            "indexed":  False,           # RAG indexing is a separate step
            "private":  r["private"],
            "description": r.get("description", ""),
            "html_url": r["html_url"],
        }
        for r in repos
    ]


# ── Issues ───────────────────────────────────────────────────────────────────

@router.get("/issues")
async def get_issues(
    repo: str = Query(default=""),
    gh_token: str = Cookie(default=None),
):
    """Fetch open issues for a given owner/repo."""
    if not repo or not gh_token:
        return _mock_issues()

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{repo}/issues",
            headers=_headers(gh_token),
            params={
                "state":    "open",
                "per_page": 20,
                "sort":     "updated",
            },
        )

    if resp.status_code != 200:
        return _mock_issues()

    issues = resp.json()
    # GitHub returns PRs mixed in with issues — filter them out
    return [
        {
            "id":         i["id"],
            "number":     i["number"],
            "title":      i["title"],
            "labels":     [lbl["name"] for lbl in i.get("labels", [])],
            "comments":   i["comments"],
            "created_at": i["created_at"],
            "html_url":   i["html_url"],
            "user":       i["user"]["login"],
        }
        for i in issues
        if "pull_request" not in i          # exclude PRs
    ]


# ── File tree ────────────────────────────────────────────────────────────────

@router.get("/files")
async def get_files(
    repo: str = Query(default=""),
    gh_token: str = Cookie(default=None),
):
    """Fetch the top-level file tree for a repo via the Git Trees API."""
    if not repo or not gh_token:
        return _mock_files()

    async with httpx.AsyncClient() as client:
        # 1. get default branch
        meta_resp = await client.get(
            f"{GITHUB_API}/repos/{repo}",
            headers=_headers(gh_token),
        )
        if meta_resp.status_code != 200:
            return _mock_files()

        default_branch = meta_resp.json().get("default_branch", "main")

        # 2. get tree (non-recursive for top-level speed)
        tree_resp = await client.get(
            f"{GITHUB_API}/repos/{repo}/git/trees/{default_branch}",
            headers=_headers(gh_token),
            params={"recursive": "1"},
        )

    if tree_resp.status_code != 200:
        return _mock_files()

    tree = tree_resp.json().get("tree", [])
    return _build_tree(tree)


# ── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(gh_token: str = Cookie(default=None)):
    """Basic stats — static for now, wired up to real data later."""
    return {
        "total_reviews":    124,
        "issues_found":     38,
        "avg_response_time": "4.2s",
        "cost_per_review":  "$0.012",
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_tree(flat: list) -> list:
    """
    Convert GitHub's flat tree list into a nested folder/file structure
    that the frontend FileTree component already understands.
    """
    root: dict = {}

    for item in flat:
        parts = item["path"].split("/")
        node = root
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        leaf = parts[-1]
        if item["type"] == "tree":
            node.setdefault(leaf, {})
        else:
            node[leaf] = item.get("path", "")

    def _to_list(node: dict, prefix: str = "") -> list:
        result = []
        for name, value in sorted(node.items()):
            path = f"{prefix}{name}"
            if isinstance(value, dict):
                result.append({
                    "path":     path + "/",
                    "type":     "folder",
                    "children": _to_list(value, path + "/"),
                })
            else:
                ext = name.rsplit(".", 1)[-1] if "." in name else ""
                lang_map = {
                    "py": "python", "js": "javascript", "ts": "typescript",
                    "jsx": "javascript", "tsx": "typescript", "md": "markdown",
                    "yml": "yaml", "yaml": "yaml", "json": "json",
                    "go": "go", "rs": "rust", "rb": "ruby",
                }
                result.append({
                    "path":     path,
                    "type":     "file",
                    "language": lang_map.get(ext, ext),
                })
        return result

    return _to_list(root)


# ── Mock fallbacks (used when not authenticated or GitHub API fails) ──────────

def _mock_repos():
    return [
        {"id": 1, "name": "fastapi/fastapi",      "stars": 72400, "language": "Python", "indexed": True,  "private": False},
        {"id": 2, "name": "tiangolo/sqlmodel",    "stars": 13200, "language": "Python", "indexed": True,  "private": False},
        {"id": 3, "name": "pallets/flask",        "stars": 66800, "language": "Python", "indexed": False, "private": False},
    ]


def _mock_issues():
    return [
        {"id": 101, "number": 4521, "title": "Logout does not invalidate session token",  "labels": ["bug"],            "comments": 8,  "created_at": "2026-03-30T10:00:00Z"},
        {"id": 102, "number": 4498, "title": "Add rate limiting to auth endpoints",        "labels": ["feature"],        "comments": 3,  "created_at": "2026-03-29T10:00:00Z"},
        {"id": 103, "number": 4467, "title": "Improve error messages for validation",      "labels": ["good first issue"],"comments": 2,  "created_at": "2026-03-28T10:00:00Z"},
        {"id": 104, "number": 4445, "title": "Document the dependency injection system",   "labels": ["documentation"],  "comments": 5,  "created_at": "2026-03-27T10:00:00Z"},
        {"id": 105, "number": 4401, "title": "WebSocket connections drop after timeout",   "labels": ["bug"],            "comments": 12, "created_at": "2026-03-26T10:00:00Z"},
    ]


def _mock_files():
    return [
        {"path": "fastapi/", "type": "folder", "children": [
            {"path": "fastapi/main.py",     "type": "file", "language": "python"},
            {"path": "fastapi/routing.py",  "type": "file", "language": "python"},
            {"path": "fastapi/security.py", "type": "file", "language": "python"},
            {"path": "fastapi/middleware/", "type": "folder", "children": [
                {"path": "fastapi/middleware/cors.py",          "type": "file", "language": "python"},
                {"path": "fastapi/middleware/httpsredirect.py", "type": "file", "language": "python"},
            ]},
        ]},
        {"path": "tests/", "type": "folder", "children": [
            {"path": "tests/test_routing.py",  "type": "file", "language": "python"},
            {"path": "tests/test_security.py", "type": "file", "language": "python"},
        ]},
    ]