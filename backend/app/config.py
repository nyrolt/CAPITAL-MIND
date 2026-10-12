import os
from pathlib import Path
from typing import List
from pydantic import BaseModel
from dotenv import load_dotenv

# Explicitly load .env from backend directory or parent
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

class Settings(BaseModel):
    APP_NAME: str = "CapitalMind AI Fintech API"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # AUTH_MODE can be 'development' (or 'dev') or 'cognito'
    AUTH_MODE: str = os.getenv("AUTH_MODE", "development").lower()
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "capitalmind-secret-key-change-in-production-2026")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # PostgreSQL Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@127.0.0.1:5433/capitalmind"
    )
    
    # AWS Cognito Configuration (used when AUTH_MODE=cognito)
    COGNITO_REGION: str = os.getenv("COGNITO_REGION", "ap-south-1")
    COGNITO_USER_POOL_ID: str = os.getenv("COGNITO_USER_POOL_ID", "ap-south-1_demo123")
    COGNITO_CLIENT_ID: str = os.getenv("COGNITO_CLIENT_ID", "demo_client_id_123")
    
    # Market Data Configuration ('mock' or 'real')
    MARKET_DATA_MODE: str = os.getenv("MARKET_DATA_MODE", "mock").lower()
    MARKET_DATA_API_KEY: str = os.getenv("MARKET_DATA_API_KEY", "")
    MARKET_DATA_PROVIDER_URL: str = os.getenv("MARKET_DATA_PROVIDER_URL", "")

    # Upstox Live Market Data Configuration
    UPSTOX_ANALYTICS_TOKEN: str = os.getenv("UPSTOX_ANALYTICS_TOKEN", "")
    UPSTOX_MARKET_DATA_ENABLED: bool = os.getenv("UPSTOX_MARKET_DATA_ENABLED", "false").lower() in ("true", "1", "yes")
    UPSTOX_MARKET_DATA_MODE: str = os.getenv("UPSTOX_MARKET_DATA_MODE", "mock").lower()

    @property
    def is_upstox_live(self) -> bool:
        return (
            self.UPSTOX_MARKET_DATA_ENABLED
            and self.UPSTOX_MARKET_DATA_MODE == "live"
            and bool(self.UPSTOX_ANALYTICS_TOKEN)
        )
    
    # Paper Trading Configuration
    PAPER_INITIAL_CASH: float = float(os.getenv("PAPER_INITIAL_CASH", "1000000.0"))

    # Google Gemini AI Market Impact Analysis Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")
    GEMINI_ANALYSIS_ENABLED: bool = os.getenv("GEMINI_ANALYSIS_ENABLED", "true").lower() in ("true", "1", "yes")

    # Financial News Ingestion Configuration
    NEWS_INGESTION_ENABLED: bool = os.getenv("NEWS_INGESTION_ENABLED", "true").lower() in ("true", "1", "yes")
    NEWS_INGESTION_INTERVAL_MINUTES: int = int(os.getenv("NEWS_INGESTION_INTERVAL_MINUTES", "15"))
    NEWS_MAX_ANALYSES_PER_RUN: int = int(os.getenv("NEWS_MAX_ANALYSES_PER_RUN", "5"))
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]

settings = Settings()

