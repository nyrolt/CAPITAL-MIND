from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.auth.schemas import AuthenticatedUser
from app.schemas.news import NewsListResponse, NewsArticleResponse, NewsStatusResponse
from app.services.news_service import news_service

router = APIRouter(prefix="/api/news", tags=["Financial News & Gemini AI Impact"])

@router.get("", response_model=NewsListResponse)
async def get_news_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search in headlines or summaries"),
    sector: Optional[str] = Query(None, description="Filter by sector (e.g. Banking, IT)"),
    stock: Optional[str] = Query(None, description="Filter by stock symbol (e.g. TCS, INFY)"),
    impact: Optional[str] = Query(None, description="Filter by impact direction (POSITIVE, NEGATIVE, MIXED, NEUTRAL, UNCERTAIN)"),
    source: Optional[str] = Query(None, description="Filter by publisher/source"),
    status: Optional[str] = Query(None, description="Filter by analysis status (PENDING, ANALYZED, FAILED)"),
    db: Session = Depends(get_db)
):
    """
    Public / Authenticated paginated Indian Financial News feed.
    Shows real published headlines, publisher source, original canonical URL, and Gemini AI analysis status.
    """
    return news_service.get_news_feed(
        db=db,
        page=page,
        limit=limit,
        search=search,
        sector=sector,
        stock=stock,
        impact=impact,
        source=source,
        status=status
    )

@router.get("/status", response_model=NewsStatusResponse)
async def get_news_status(
    db: Session = Depends(get_db)
):
    """
    Status of the Financial News feed and Google Gemini AI market analyzer.
    """
    return news_service.get_status(db=db)

@router.get("/for-me", response_model=List[NewsArticleResponse])
async def get_personalized_news(
    limit: int = Query(20, ge=1, le=50),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Personalized news feed matching the authenticated user's portfolio holdings and watchlist.
    Enforces user ownership and strict tenant isolation.
    """
    return news_service.get_personalized_news(
        user_id=current_user.user_id,
        db=db,
        limit=limit
    )

@router.get("/{article_id}", response_model=NewsArticleResponse)
async def get_article_by_id(
    article_id: str = Path(..., description="Unique article ID"),
    db: Session = Depends(get_db)
):
    """
    Retrieve full article details and its current Gemini analysis status.
    """
    article = news_service.get_article_by_id(article_id=article_id, db=db)
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article '{article_id}' not found"
        )
    return article

@router.get("/{article_id}/analysis")
async def get_article_analysis(
    article_id: str = Path(..., description="Unique article ID"),
    db: Session = Depends(get_db)
):
    """
    Retrieve validated Gemini AI analysis for a specific article.
    Returns 404 if article not found, or explicit status if analysis is PENDING or FAILED.
    """
    article = news_service.get_article_by_id(article_id=article_id, db=db)
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article '{article_id}' not found"
        )

    analysis_status = article["analysis_status"]
    if analysis_status == "ANALYZED" and article["analysis"]:
        return {
            "article_id": article_id,
            "analysis_status": "ANALYZED",
            "analysis": article["analysis"],
            "analysis_source": article["analysis_source"],
            "analyzed_at": article["analyzed_at"]
        }
    elif analysis_status == "PENDING":
        return {
            "article_id": article_id,
            "analysis_status": "PENDING",
            "message": "Gemini AI market impact analysis is queued and pending execution."
        }
    elif analysis_status == "RATE_LIMITED":
        return {
            "article_id": article_id,
            "analysis_status": "RATE_LIMITED",
            "message": "Gemini AI analysis paused due to temporary free-tier rate limits; will retry shortly."
        }
    else:
        return {
            "article_id": article_id,
            "analysis_status": "FAILED",
            "message": "Gemini AI analysis could not be completed for this article."
        }

@router.post("/trigger-ingestion")
async def trigger_news_ingestion(
    current_user: AuthenticatedUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin-only manual trigger for RSS feed polling and ingestion.
    """
    res = news_service.ingest_rss_feeds(db=db)
    return {"status": "success", "result": res}

@router.post("/trigger-analysis")
async def trigger_news_analysis(
    batch_size: int = Query(5, ge=1, le=20),
    current_user: AuthenticatedUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin-only manual trigger for batch Gemini AI market impact processing.
    """
    res = news_service.process_pending_analyses(max_batch=batch_size, db=db)
    return {"status": "success", "result": res}
