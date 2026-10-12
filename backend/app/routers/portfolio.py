from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.schemas import AuthenticatedUser
from app.auth.dependencies import get_current_user
from app.models.portfolio import (
    PortfolioModel,
    PortfolioCreateRequest,
    HoldingModel,
    HoldingCreateRequest,
    HoldingUpdateRequest,
    TransactionCreateRequest,
    TransactionModel
)
from app.services.portfolio_service import portfolio_service

router = APIRouter(prefix="/api/portfolio", tags=["Portfolios"])

@router.get("", response_model=List[PortfolioModel])
async def list_portfolios(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return portfolio_service.get_all(db=db, user_id=current_user.user_id)

@router.post("", response_model=PortfolioModel, status_code=status.HTTP_201_CREATED)
async def create_portfolio(
    req: PortfolioCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return portfolio_service.create(
        db=db,
        name=req.name,
        objective=req.objective,
        risk_preference=req.riskPreference,
        description=req.description or "",
        user_id=current_user.user_id
    )

@router.get("/{id}", response_model=PortfolioModel)
async def get_portfolio_details(
    id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = portfolio_service.get_by_id(id, db=db, user_id=current_user.user_id)
    if not p:
        raise HTTPException(status_code=404, detail="Portfolio not found or access denied")
    return p

@router.get("/{id}/history")
async def get_portfolio_history(
    id: str,
    timeframe: str = Query("1M", pattern="^(1D|1W|1M|3M|6M|1Y|5Y|ALL)$"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    return await portfolio_service.get_portfolio_history(
        portfolio_id=id,
        timeframe=timeframe,
        db=db,
        user_id=current_user.user_id
    )

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_portfolio(
    id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    success = portfolio_service.delete_portfolio(id, db=db, user_id=current_user.user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Portfolio not found or access denied")
    return {"message": f"Portfolio {id} successfully deleted"}

@router.get("/{id}/holdings", response_model=List[HoldingModel])
async def get_holdings(
    id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    holdings = portfolio_service.get_holdings(id, db=db, user_id=current_user.user_id)
    if holdings is None:
        raise HTTPException(status_code=404, detail="Portfolio not found or access denied")
    return holdings

@router.post("/{id}/holdings", response_model=PortfolioModel)
async def add_holding(
    id: str,
    req: HoldingCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated = portfolio_service.add_holding(id, req.model_dump(), db=db, user_id=current_user.user_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Portfolio not found or access denied")
    return updated

@router.put("/{id}/holdings/{holding_id}", response_model=PortfolioModel)
async def update_holding(
    id: str,
    holding_id: str,
    req: HoldingUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated = portfolio_service.update_holding(
        id, holding_id, req.model_dump(exclude_unset=True), db=db, user_id=current_user.user_id
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Portfolio or holding not found or access denied")
    return updated

@router.delete("/{id}/holdings/{holding_id}", response_model=PortfolioModel)
async def delete_holding(
    id: str,
    holding_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated = portfolio_service.delete_holding(id, holding_id, db=db, user_id=current_user.user_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Portfolio or holding not found or access denied")
    return updated

@router.get("/{id}/transactions", response_model=List[TransactionModel])
async def get_transactions(
    id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    txs = portfolio_service.get_transactions(id, db=db, user_id=current_user.user_id)
    if txs is None:
        raise HTTPException(status_code=404, detail="Portfolio not found or access denied")
    return txs

@router.post("/{id}/transactions", response_model=PortfolioModel)
async def add_transaction(
    id: str,
    req: TransactionCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated = portfolio_service.add_transaction(id, req.model_dump(), db=db, user_id=current_user.user_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Portfolio not found or access denied")
    return updated

# ============================================================
# DIRECT REAL HOLDINGS ENDPOINTS
# ============================================================

holdings_router = APIRouter(prefix="/api/holdings", tags=["Holdings"])

@holdings_router.get("", response_model=List[HoldingModel])
async def list_user_holdings(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    portfolios = portfolio_service.get_all(db=db, user_id=current_user.user_id)
    all_holdings = []
    for p in portfolios:
        all_holdings.extend(p.get("holdings", []))
    return all_holdings

@holdings_router.post("", response_model=PortfolioModel)
async def create_user_holding(
    req: HoldingCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    portfolios = portfolio_service.get_all(db=db, user_id=current_user.user_id)
    if not portfolios:
        p = portfolio_service.create(
            name="My Investment Portfolio",
            objective="Wealth Maximization",
            risk_preference="Moderate",
            description="Primary real investment holdings portfolio",
            user_id=current_user.user_id,
            db=db
        )
        target_id = p["id"]
    else:
        target_id = portfolios[0]["id"]
    updated = portfolio_service.add_holding(target_id, req.model_dump(), db=db, user_id=current_user.user_id)
    if not updated:
        raise HTTPException(status_code=400, detail="Failed to add holding")
    return updated

@holdings_router.put("/{holding_id}", response_model=PortfolioModel)
async def update_user_holding_by_id(
    holding_id: str,
    req: HoldingUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models.db_models import Holding
    h = db.query(Holding).filter(Holding.id == holding_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Holding not found")
    updated = portfolio_service.update_holding(h.portfolio_id, holding_id, req.model_dump(exclude_unset=True), db=db, user_id=current_user.user_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Holding or portfolio access denied")
    return updated

@holdings_router.delete("/{holding_id}", response_model=PortfolioModel)
async def delete_user_holding_by_id(
    holding_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models.db_models import Holding
    h = db.query(Holding).filter(Holding.id == holding_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Holding not found")
    updated = portfolio_service.delete_holding(h.portfolio_id, holding_id, db=db, user_id=current_user.user_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Holding or portfolio access denied")
    return updated
