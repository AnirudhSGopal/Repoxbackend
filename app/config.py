from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GITHUB_APP_ID: str = ""
    GITHUB_PRIVATE_KEY_PATH: str = "./private-key.pem"
    GITHUB_WEBHOOK_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    REDIS_URL: str = "redis://localhost:6379"

    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "prguard"
    LANGCHAIN_TRACING_V2: str = "true"

    CHROMA_DB_PATH: str = "./chroma_db"

    APP_URL: str = "http://localhost:8000"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "changeme"

    class Config:
        env_file = ".env"

settings = Settings()