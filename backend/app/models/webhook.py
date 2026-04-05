from pydantic import BaseModel
from typing import Optional

class Repository(BaseModel):
    full_name: str
    name: str

class PullRequest(BaseModel):
    number: int
    title: str
    body: Optional[str] = None

class WebhookPayload(BaseModel):
    action: str
    repository: Repository
    pull_request: Optional[PullRequest] = None