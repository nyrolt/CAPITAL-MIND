from pydantic import BaseModel
from typing import List, Optional, Literal, Dict, Any

class GeminiAnalysisSchema(BaseModel):
    impact_direction: Literal["POSITIVE", "NEGATIVE", "MIXED", "NEUTRAL", "UNCERTAIN"]
    reasoning: str
    confidence: float
    uncertainty: str
    directly_mentioned: List[str] = []
    sectors: List[str] = []
    stocks: List[str] = []
    time_horizon: Literal["INTRADAY", "SHORT_TERM", "LONG_TERM", "UNKNOWN"] = "SHORT_TERM"
    analysis_source: str

class NewsArticleResponse(BaseModel):
    id: str
    provider: str
    headline: str
    summary: Optional[str] = None
    source: str
    canonical_url: str
    published_at: str
    retrieved_at: str
    category: str
    related_sectors: List[str] = []
    related_stocks: List[str] = []
    analysis: Optional[GeminiAnalysisSchema] = None
    analysis_source: Optional[str] = None
    analysis_status: Literal["PENDING", "ANALYZED", "FAILED", "RATE_LIMITED", "SIMULATED"]
    analyzed_at: Optional[str] = None

class NewsListResponse(BaseModel):
    items: List[NewsArticleResponse]
    total: int
    page: int
    limit: int
    pages: int

class NewsStatusResponse(BaseModel):
    ingestion_enabled: bool
    gemini_enabled: bool
    gemini_model: str
    total_articles: int
    analyzed_articles: int
    pending_articles: int
    failed_articles: int
    last_ingestion_time: Optional[str] = None
