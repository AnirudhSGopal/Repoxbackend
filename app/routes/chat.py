from fastapi import APIRouter
from app.models.chat import ChatRequest, ChatResponse, Source
import os

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    answer = await get_llm_response(
        message=request.message,
        repo=request.repo or "unknown",
        provider=request.provider or "claude",
        api_key=request.api_key,
    )

    return ChatResponse(
        answer=answer,
        sources=[
            Source(file="fastapi/security.py", lines="34-67", relevance=0.94),
            Source(file="fastapi/routing.py", lines="102-145", relevance=0.81),
        ]
    )

async def get_llm_response(message: str, repo: str, provider: str, api_key: str):
    system_prompt = f"""You are PRGuard, a codebase learning assistant.
You help developers understand open source codebases and contribute to them.
The developer is asking about the repository: {repo}.
Answer clearly and reference specific files and functions when possible.
Keep answers concise and actionable."""

    try:
        if provider == "claude":
            import anthropic
            key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
            client = anthropic.Anthropic(api_key=key)
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": "user", "content": message}]
            )
            return response.content[0].text

        elif provider == "openai":
            import openai
            key = api_key or os.getenv("OPENAI_API_KEY", "")
            client = openai.OpenAI(api_key=key)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ]
            )
            return response.choices[0].message.content

        elif provider == "gemini":
            import google.generativeai as genai
            key = api_key or os.getenv("GEMINI_API_KEY", "")
            genai.configure(api_key=key)
            model = genai.GenerativeModel("gemini-1.5-pro")
            response = model.generate_content(f"{system_prompt}\n\nUser: {message}")
            return response.text

    except Exception as e:
        return f"Error calling {provider} API: {str(e)}. Please check your API key in settings."

    return "No provider configured. Please add an API key in settings."