from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.market_data.market_service import market_data_service

router = APIRouter(prefix="/api", tags=["Indian Stocks & Market Data"])

@router.get("/stocks/search")
async def search_stocks(
    q: str = Query(..., min_length=1, description="Stock symbol or company name"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Search Indian listed equities on NSE/BSE by symbol or company name.
    """
    return await market_data_service.search_stocks(q, limit=limit, db=db)

@router.get("/stocks/{symbol}")
async def get_stock_details(
    symbol: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Retrieve comprehensive details, fundamentals, and latest quote for a stock symbol.
    """
    stock = await market_data_service.get_stock_details(symbol, db=db)
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock symbol '{symbol.upper()}' not found")
    return stock

@router.get("/stocks/{symbol}/quote")
async def get_stock_quote(
    symbol: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Retrieve latest price quote and day change metrics for a stock symbol.
    """
    quote = await market_data_service.get_stock_quote(symbol, db=db)
    if not quote:
        raise HTTPException(status_code=404, detail=f"Stock symbol '{symbol.upper()}' not found")
    return quote

@router.get("/stocks/{symbol}/history")
async def get_stock_history(
    symbol: str,
    timeframe: str = Query("1M", pattern="^(1D|1W|1M|3M|6M|1Y|5Y|ALL)$")
) -> List[Dict[str, Any]]:
    """
    Retrieve historical price points and volume for charting (1D, 1W, 1M, 1Y, 5Y).
    """
    history = await market_data_service.get_historical_prices(symbol, timeframe=timeframe)
    if not history:
        raise HTTPException(status_code=404, detail=f"Stock history for '{symbol.upper()}' not found")
    return history

@router.get("/market/status")
async def get_market_status() -> Dict[str, Any]:
    """
    Retrieve live market status for Indian stock exchanges (NSE/BSE).
    """
    return await market_data_service.get_market_status()
