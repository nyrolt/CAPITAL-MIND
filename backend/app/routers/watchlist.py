import json
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import Watchlist
from app.auth.schemas import AuthenticatedUser
from app.auth.dependencies import get_current_user
from app.services.market_data.market_service import market_data_service

router = APIRouter(prefix="/api/watchlist", tags=["User Watchlists"])

class WatchlistCreateRequest(BaseModel):
    name: str = "My Watchlist"
    symbols: Optional[List[str]] = None

class AddStockRequest(BaseModel):
    symbol: str

def _parse_symbols(symbols_field: str) -> List[str]:
    try:
        return json.loads(symbols_field)
    except Exception:
        return []

def _dump_symbols(symbols_list: List[str]) -> str:
    return json.dumps(list(dict.fromkeys(s.upper() for s in symbols_list)))

async def _enrich_watchlist(w: Watchlist, db: Session) -> Dict[str, Any]:
    symbols = _parse_symbols(w.symbols)
    enriched_items = []
    for sym in symbols:
        quote = await market_data_service.get_stock_quote(sym, db=db)
        if quote:
            enriched_items.append(quote)
        else:
            enriched_items.append({
                "symbol": sym,
                "company_name": sym,
                "current_price": 0.0,
                "day_change": 0.0,
                "day_change_percentage": 0.0,
                "data_source": "unlisted",
                "is_real_time": False
            })

    return {
        "id": w.id,
        "name": w.name,
        "userId": w.user_id,
        "symbols": symbols,
        "items": enriched_items,
        "createdAt": w.created_at.strftime("%Y-%m-%d") if w.created_at else None,
        "updatedAt": w.updated_at.strftime("%Y-%m-%d") if w.updated_at else None,
    }

@router.get("")
async def get_user_watchlists(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    List user-scoped watchlists with enriched live/mock quotes.
    Automatically creates a default watchlist if the user does not have one yet.
    """
    watchlists = db.query(Watchlist).filter(Watchlist.user_id == current_user.user_id).all()
    if not watchlists:
        default_wl = Watchlist(
            id=f"wl_{uuid.uuid4().hex[:6]}",
            user_id=current_user.user_id,
            name="Primary Watchlist",
            symbols=_dump_symbols(["TCS", "INFY", "RELIANCE", "HDFCBANK"])
        )
        db.add(default_wl)
        db.commit()
        db.refresh(default_wl)
        watchlists = [default_wl]

    return [await _enrich_watchlist(w, db) for w in watchlists]

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_watchlist(
    req: WatchlistCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Create a new custom watchlist for the authenticated user.
    """
    initial_syms = req.symbols or []
    new_wl = Watchlist(
        id=f"wl_{uuid.uuid4().hex[:6]}",
        user_id=current_user.user_id,
        name=req.name,
        symbols=_dump_symbols(initial_syms)
    )
    db.add(new_wl)
    db.commit()
    db.refresh(new_wl)
    return await _enrich_watchlist(new_wl, db)

@router.post("/{watchlist_id}/stocks")
async def add_stock_to_watchlist(
    watchlist_id: str,
    req: AddStockRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Add a stock symbol to user's watchlist with tenant isolation.
    """
    wl = db.query(Watchlist).filter(
        Watchlist.id == watchlist_id,
        Watchlist.user_id == current_user.user_id
    ).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found or access denied")

    syms = _parse_symbols(wl.symbols)
    target_sym = req.symbol.strip().upper()
    if target_sym not in syms:
        syms.append(target_sym)
        wl.symbols = _dump_symbols(syms)
        db.commit()
        db.refresh(wl)

    return await _enrich_watchlist(wl, db)

@router.delete("/{watchlist_id}/stocks/{symbol}")
async def remove_stock_from_watchlist(
    watchlist_id: str,
    symbol: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Remove a stock symbol from user's watchlist with tenant isolation.
    """
    wl = db.query(Watchlist).filter(
        Watchlist.id == watchlist_id,
        Watchlist.user_id == current_user.user_id
    ).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found or access denied")

    syms = _parse_symbols(wl.symbols)
    target_sym = symbol.strip().upper()
    if target_sym in syms:
        syms.remove(target_sym)
        wl.symbols = _dump_symbols(syms)
        db.commit()
        db.refresh(wl)

    return await _enrich_watchlist(wl, db)
