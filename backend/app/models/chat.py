from pydantic import BaseModel
from typing import Optional, List

class ChatRequest(BaseModel):
    message: str
    repo: Optional[str] = None
    issue_id: Optional[int] = None
    provider: Optional[str] = "claude"
    api_key: Optional[str] = None

class Source(BaseModel):
    file: str
    lines: str
    relevance: float

class ChatResponse(BaseModel):
    answer: str
    sources: List[Source] = []
    issue_context: Optional[dict] = None