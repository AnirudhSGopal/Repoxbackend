from pydantic import BaseModel
from typing import Optional, List

class ReviewIssue(BaseModel):
    severity: str
    message: str
    file: Optional[str] = None
    line: Optional[int] = None
    tool: str = "claude"

class ReviewResult(BaseModel):
    pr_number: int
    repo: str
    summary: str
    issues: List[ReviewIssue] = []
    status: str = "pending"