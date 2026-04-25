import asyncio
import sys
import os

# Add the parent directory so we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.services import llm

async def main():
    print("Testing LLM configurations...")
    print(f"Loaded Primary Provider from settings: {settings.MODEL_PROVIDER}")
    print(f"Loaded Model Name from settings: {settings.MODEL_NAME}")
    print("-" * 50)
    
    # Check what keys are populated
    keys = {
        "gemini": settings.GEMINI_API_KEY,
        "claude": settings.ANTHROPIC_API_KEY,
        "gpt": settings.OPENAI_API_KEY
    }
    
    for provider, key in keys.items():
        if key:
            print(f"[OK] {provider} API Key is configured in environment.")
        else:
            print(f"[MISSING] {provider} API Key is missing.")
            
    print("-" * 50)
    print("Testing conversations with configured providers...")
    
    question = "Hello! Please reply with a short greeting and state which AI model you are."
    
    for provider, key in keys.items():
        if not key:
            continue
            
        print(f"\n--- Sending test message to {provider} ---")
        try:
            # We bypass RAG by passing n_chunks=0
            result = await llm.generate(
                question=question,
                repo="test/repo",  # dummy repo
                history=[],
                provider=provider,
                api_key=key,
                n_chunks=0
            )
            print(f"[SUCCESS] {provider} successfully replied:")
            print(result["answer"])
        except Exception as e:
            print(f"[ERROR] {provider} failed with error:")
            print(str(e))
            
if __name__ == "__main__":
    asyncio.run(main())
