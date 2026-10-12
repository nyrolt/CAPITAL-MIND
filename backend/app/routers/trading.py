from typing import List, Optional
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, Query, Path
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import desc

from app.database import get_db
from app.auth.dependencies import get_current_user, require_admin
from app.auth.schemas import AuthenticatedUser
from app.schemas.trading import (
    CreateOrderRequest,
    OrderResponse,
    TradeResponse,
    PaperAccountResponse,
    PaperPortfolioResponse,
    PaperHoldingItem,
    UpdateCapitalRequest,
    UpdateCapitalResponse
)
from app.services.paper_trading_service import paper_trading_service
from app.models.db_models import Order, Trade, PaperTradingAccount

router = APIRouter(tags=["Paper Trading"])

# ============================================================
# PAPER ACCOUNT & PORTFOLIO
# ============================================================

@router.get("/api/trading/account", response_model=PaperAccountResponse)
async def get_paper_account(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get authenticated user's paper trading account balance and P/L metrics.
    Strict tenant isolation: users can only view their own account.
    """
    return await paper_trading_service.get_account_summary(current_user.user_id, db)


@router.put("/api/trading/account/capital", response_model=UpdateCapitalResponse)
@router.post("/api/trading/account/capital", response_model=UpdateCapitalResponse)
async def update_paper_capital(
    payload: UpdateCapitalRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allow authenticated user to configure their virtual paper capital.
    Strict tenant isolation: modifies only the authenticated user's account.
    """
    return paper_trading_service.update_capital(current_user.user_id, payload.capital, db)


@router.get("/api/trading/portfolio", response_model=PaperPortfolioResponse)
async def get_paper_portfolio(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get authenticated user's paper portfolio holdings and calculated values.
    Strictly isolated from real portfolios and real holdings.
    """
    data = await paper_trading_service.get_portfolio_data(current_user.user_id, db)
    summary = data["summary"]
    positions = data["positions"]

    holding_items: List[PaperHoldingItem] = [
        PaperHoldingItem(
            symbol=pos["symbol"],
            company_name=pos["company_name"],
            quantity=pos["quantity"],
            average_price=pos["average_price"],
            current_price=pos["current_price"],
            cost_basis=pos["cost_basis"],
            market_value=pos["market_value"],
            unrealized_pnl=pos["unrealized_pnl"],
            unrealized_pnl_percentage=pos["unrealized_pnl_percentage"]
        )
        for pos in positions
    ]

    return PaperPortfolioResponse(
        account_id=summary["account_id"],
        cash=summary["available_cash"],
        invested_value=summary["invested_value"],
        market_value=summary["portfolio_value"],
        total_value=summary["total_value"],
        cost_basis=summary["invested_value"],
        realized_pnl=summary["realized_pnl"],
        unrealized_pnl=summary["unrealized_pnl"],
        total_pnl=summary["total_pnl"],
        holdings=holding_items,
        is_paper_trading=True,
        notice="Values are based on simulated market data."
    )


@router.get("/api/trading/positions", response_model=List[PaperHoldingItem])
async def get_paper_positions(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get authenticated user's active paper positions.
    """
    positions = await paper_trading_service.get_positions(current_user.user_id, db)
    return [
        PaperHoldingItem(
            symbol=pos["symbol"],
            company_name=pos["company_name"],
            quantity=pos["quantity"],
            average_price=pos["average_price"],
            current_price=pos["current_price"],
            cost_basis=pos["cost_basis"],
            market_value=pos["market_value"],
            unrealized_pnl=pos["unrealized_pnl"],
            unrealized_pnl_percentage=pos["unrealized_pnl_percentage"]
        )
        for pos in positions
    ]


# ============================================================
# ORDERS
# ============================================================

@router.get("/api/orders", response_model=List[OrderResponse])
async def list_orders(
    symbol: Optional[str] = Query(None, description="Filter by stock symbol"),
    side: Optional[str] = Query(None, description="Filter by side (BUY / SELL)"),
    status: Optional[str] = Query(None, description="Filter by status (FILLED, CANCELLED, REJECTED)"),
    limit: int = Query(50, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List authenticated user's paper orders. Strictly scoped to the authenticated user.
    """
    return paper_trading_service.get_orders(
        user_id=current_user.user_id,
        symbol=symbol,
        side=side,
        status_filter=status,
        limit=limit,
        db=db
    )


@router.post("/api/orders", response_model=OrderResponse)
async def create_order(
    payload: CreateOrderRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create and execute a paper order. Validates cash balance or holdings,
    updates holdings with weighted average buy price or realized P/L on SELL,
    creates trade and transaction records atomically.
    """
    return await paper_trading_service.execute_order(
        user_id=current_user.user_id,
        symbol=payload.symbol,
        side=payload.side,
        quantity=payload.quantity,
        order_type=payload.order_type,
        client_order_id=payload.client_order_id,
        db=db
    )


@router.get("/api/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str = Path(..., description="Order identifier"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a single paper order. Cross-user access is strictly prevented.
    """
    return paper_trading_service.get_order_by_id(
        user_id=current_user.user_id,
        order_id=order_id,
        db=db
    )


@router.post("/api/orders/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: str = Path(..., description="Order identifier to cancel"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel an order if still pending. Filled orders cannot be cancelled.
    """
    return paper_trading_service.cancel_order(
        user_id=current_user.user_id,
        order_id=order_id,
        db=db
    )


# ============================================================
# TRADES
# ============================================================

@router.get("/api/trades", response_model=List[TradeResponse])
async def list_trades(
    symbol: Optional[str] = Query(None, description="Filter by stock symbol"),
    side: Optional[str] = Query(None, description="Filter by side (BUY / SELL)"),
    limit: int = Query(50, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List authenticated user's executed paper trades. Strictly user-scoped.
    """
    return paper_trading_service.get_trades(
        user_id=current_user.user_id,
        symbol=symbol,
        side=side,
        limit=limit,
        db=db
    )


@router.get("/api/trades/{trade_id}", response_model=TradeResponse)
async def get_trade(
    trade_id: str = Path(..., description="Trade identifier"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a single paper trade. Cross-user access is strictly prevented.
    """
    return paper_trading_service.get_trade_by_id(
        user_id=current_user.user_id,
        trade_id=trade_id,
        db=db
    )


# ============================================================
# ADMIN READ-ONLY TRADING MONITORING
# ============================================================

@router.get("/api/admin/trading/stats")
async def get_admin_trading_stats(
    admin_user: AuthenticatedUser = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Read-only systemwide paper trading metrics for Admins.
    Admins cannot execute trades or withdraw cash on behalf of users.
    """
    total_accounts = db.query(PaperTradingAccount).count()
    total_orders = db.query(Order).count()
    total_trades = db.query(Trade).count()

    recent_orders = db.query(Order).order_by(desc(Order.created_at)).limit(10).all()

    return {
        "total_paper_accounts": total_accounts,
        "total_paper_orders": total_orders,
        "total_paper_trades": total_trades,
        "recent_orders": [
            {
                "order_id": o.id,
                "user_id": o.user_id,
                "symbol": o.symbol,
                "side": o.side,
                "quantity": o.quantity,
                "status": o.status,
                "price": o.executed_price or o.price,
                "total_value": o.total_value,
                "created_at": o.created_at.isoformat() if o.created_at else None
            }
            for o in recent_orders
        ],
        "is_paper_trading": True,
        "access": "admin_read_only"
    }
