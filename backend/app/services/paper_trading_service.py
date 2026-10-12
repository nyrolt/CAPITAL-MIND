import logging
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional
# pyrefly: ignore [missing-import]
from fastapi import HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import desc

from app.config import settings
from app.models.db_models import (
    Order,
    Trade,
    PaperTradingAccount,
    PaperPosition,
    gen_uuid
)
from app.services.market_data.market_service import market_data_service

logger = logging.getLogger("capitalmind.trading")

def _round_currency(val: float) -> float:
    """Round monetary value to 2 decimal places using Decimal for financial precision."""
    d = Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return float(d)

class PaperTradingService:
    def get_or_create_account(self, user_id: str, db: Session) -> PaperTradingAccount:
        """Fetch existing paper trading account or initialize one with configured starting capital."""
        account = db.query(PaperTradingAccount).filter(PaperTradingAccount.user_id == user_id).first()
        if not account:
            init_cash = settings.PAPER_INITIAL_CASH
            account = PaperTradingAccount(
                id=gen_uuid("pac"),
                user_id=user_id,
                cash_balance=init_cash,
                initial_cash=init_cash,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(account)
            db.commit()
            db.refresh(account)
            logger.info(f"[PAPER] Created initial paper account for user {user_id} with cash ₹{init_cash}")
        return account

    def update_capital(self, user_id: str, capital: float, db: Session) -> Dict[str, Any]:
        """Allow user to set/modify their paper trading capital independently."""
        if capital <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Paper capital must be greater than zero."
            )
        account = self.get_or_create_account(user_id, db)
        account.cash_balance = _round_currency(capital)
        account.initial_cash = _round_currency(capital)
        account.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(account)
        logger.info(f"[PAPER] User {user_id} modified paper capital to ₹{capital}")
        return {
            "account_id": account.id,
            "user_id": user_id,
            "cash_balance": account.cash_balance,
            "initial_cash": account.initial_cash,
            "updated_at": account.updated_at.isoformat()
        }

    async def get_portfolio_data(self, user_id: str, db: Session) -> Dict[str, Any]:
        """Compute account summary and position valuations in a single unified, batch-optimized pass."""
        account = self.get_or_create_account(user_id, db)
        positions = db.query(PaperPosition).filter(PaperPosition.account_id == account.id).all()

        # Batch preload all quotes in a single network call rather than N sequential round trips
        symbols = [pos.symbol for pos in positions]
        if symbols:
            from app.services.upstox_market_data import upstox_market_data
            upstox_market_data.fetch_rest_snapshots_batch(symbols)

        items = []
        invested_value = 0.0
        portfolio_market_value = 0.0

        for pos in positions:
            quote = await market_data_service.get_stock_quote(pos.symbol, db=db)
            cur_price = quote.get("current_price", pos.current_price) if quote else pos.current_price
            cost_basis = _round_currency(pos.quantity * pos.average_price)
            mkt_val = _round_currency(pos.quantity * cur_price)
            unrealized = _round_currency(mkt_val - cost_basis)
            unrealized_pct = _round_currency((unrealized / cost_basis * 100.0) if cost_basis > 0 else 0.0)

            invested_value += cost_basis
            portfolio_market_value += mkt_val

            items.append({
                "id": pos.id,
                "symbol": pos.symbol,
                "company_name": pos.company_name,
                "quantity": pos.quantity,
                "average_price": _round_currency(pos.average_price),
                "current_price": _round_currency(cur_price),
                "cost_basis": cost_basis,
                "market_value": mkt_val,
                "unrealized_pnl": unrealized,
                "unrealized_pnl_percentage": unrealized_pct,
                "sector": pos.sector,
                "updated_at": pos.updated_at.isoformat() if pos.updated_at else None
            })

        available_cash = _round_currency(account.cash_balance)
        invested_value = _round_currency(invested_value)
        portfolio_market_value = _round_currency(portfolio_market_value)
        total_value = _round_currency(available_cash + portfolio_market_value)
        unrealized_pnl = _round_currency(portfolio_market_value - invested_value)
        total_pnl = _round_currency(total_value - account.initial_cash)
        realized_pnl = _round_currency(total_pnl - unrealized_pnl)

        summary = {
            "account_id": account.id,
            "user_id": user_id,
            "initial_cash": _round_currency(account.initial_cash),
            "available_cash": available_cash,
            "invested_value": invested_value,
            "portfolio_value": portfolio_market_value,
            "total_value": total_value,
            "realized_pnl": realized_pnl,
            "unrealized_pnl": unrealized_pnl,
            "total_pnl": total_pnl,
            "currency": "INR",
            "is_paper_trading": True,
            "notice": "Simulated paper trading account. No real capital or financial exchange is involved."
        }
        return {"summary": summary, "positions": items}

    async def get_account_summary(self, user_id: str, db: Session) -> Dict[str, Any]:
        """Compute full summary of paper trading account strictly using PaperPositions and virtual cash."""
        data = await self.get_portfolio_data(user_id, db)
        return data["summary"]

    async def get_positions(self, user_id: str, db: Session) -> List[Dict[str, Any]]:
        """Fetch authenticated user's paper trading positions with live market valuations."""
        data = await self.get_portfolio_data(user_id, db)
        return data["positions"]

    async def execute_order(
        self,
        user_id: str,
        symbol: str,
        side: str,
        quantity: float,
        order_type: str = "MARKET",
        client_order_id: Optional[str] = None,
        db: Session = None
    ) -> Dict[str, Any]:
        """Execute simulated paper order against current market price within dedicated paper domain."""
        clean_symbol = symbol.strip().upper()
        clean_side = side.strip().upper()
        clean_order_type = order_type.strip().upper()

        logger.info(f"[PAPER] Order received: {clean_side} {quantity} {clean_symbol} by user {user_id}")

        # 1. Validation: Side and Order Type
        if clean_side not in ["BUY", "SELL"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid order side '{side}'. Must be 'BUY' or 'SELL'."
            )
        if clean_order_type != "MARKET":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order type '{order_type}' not supported. Only 'MARKET' orders are supported."
            )

        # 2. Validation: Quantity
        if quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity must be greater than 0."
            )

        # 3. Idempotency Check
        if client_order_id:
            existing_order = db.query(Order).filter(
                Order.user_id == user_id,
                Order.client_order_id == client_order_id
            ).first()
            if existing_order:
                logger.info(f"[PAPER] Idempotency hit: returning existing order {existing_order.id}")
                return self._format_order_response(existing_order, is_duplicate=True)

        # 4. Fetch simulated market price
        quote = await market_data_service.get_stock_quote(clean_symbol, db=db)
        if not quote or "current_price" not in quote or quote["current_price"] <= 0:
            logger.warning(f"[PAPER] Order rejected: Symbol {clean_symbol} not found or price unavailable")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock symbol '{clean_symbol}' not found or market price unavailable."
            )

        # 5. Stocks-only validation (Requirement 6)
        instrument_type = str(quote.get("instrument_type", "EQUITY")).upper()
        if instrument_type in ["BOND", "MUTUAL FUND", "GOLD", "COMMODITY", "DEBT"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Paper trading supports stocks only. Non-stock assets cannot be traded in paper domain."
            )

        execution_price = float(quote["current_price"])
        company_name = quote.get("name") or quote.get("company_name") or clean_symbol
        from app.services.sector_service import sector_service, BAD_SECTORS
        sector = quote.get("sector")
        if not sector or sector in BAD_SECTORS:
            sector, _ = sector_service.get_sector_and_industry(clean_symbol, company_name, isin=quote.get("isin"), db=db)
        total_order_value = _round_currency(quantity * execution_price)

        # 6. Acquire DB locks and execute transaction in Paper Domain only
        try:
            account = self.get_or_create_account(user_id, db)

            position = db.query(PaperPosition).filter(
                PaperPosition.account_id == account.id,
                PaperPosition.symbol == clean_symbol
            ).with_for_update().first()

            # 7. Validate Side Specific Constraints
            if clean_side == "BUY":
                if account.cash_balance < total_order_value:
                    logger.warning(
                        f"[PAPER] BUY rejected: Insufficient cash. Required: ₹{total_order_value}, Available: ₹{account.cash_balance}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Insufficient paper trading balance."
                    )
            elif clean_side == "SELL":
                owned_qty = position.quantity if position else 0.0
                if owned_qty < quantity:
                    logger.warning(
                        f"[PAPER] SELL rejected: Insufficient holdings. Owned: {owned_qty}, Requested: {quantity}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Insufficient holdings for this paper sell order."
                    )

            now_utc = datetime.now(timezone.utc)
            order_id = gen_uuid("ord")
            trade_id = gen_uuid("trd")

            # 8. Create Order Record (Linked to paper_trading_account, NOT portfolio)
            order = Order(
                id=order_id,
                user_id=user_id,
                account_id=account.id,
                portfolio_id=None,
                symbol=clean_symbol,
                order_type=clean_order_type,
                side=clean_side,
                quantity=quantity,
                price=execution_price,
                requested_price=execution_price,
                executed_price=execution_price,
                total_value=total_order_value,
                status="FILLED",
                client_order_id=client_order_id,
                rejection_reason=None,
                filled_at=now_utc,
                created_at=now_utc,
                updated_at=now_utc
            )
            db.add(order)

            # 9. Create Trade Record
            trade = Trade(
                id=trade_id,
                order_id=order_id,
                user_id=user_id,
                symbol=clean_symbol,
                side=clean_side,
                price=execution_price,
                execution_price=execution_price,
                quantity=quantity,
                total_value=total_order_value,
                executed_at=now_utc
            )
            db.add(trade)

            # 10. Update Cash Balance and PaperPosition
            if clean_side == "BUY":
                account.cash_balance = _round_currency(account.cash_balance - total_order_value)
                account.updated_at = now_utc

                if position:
                    total_shares = position.quantity + quantity
                    new_avg = ((position.quantity * position.average_price) + (quantity * execution_price)) / total_shares
                    position.quantity = total_shares
                    position.average_price = _round_currency(new_avg)
                    position.current_price = execution_price
                    position.updated_at = now_utc
                else:
                    position = PaperPosition(
                        id=gen_uuid("pos"),
                        account_id=account.id,
                        user_id=user_id,
                        symbol=clean_symbol,
                        company_name=company_name,
                        quantity=quantity,
                        average_price=execution_price,
                        current_price=execution_price,
                        sector=sector,
                        created_at=now_utc,
                        updated_at=now_utc
                    )
                    db.add(position)

            elif clean_side == "SELL":
                account.cash_balance = _round_currency(account.cash_balance + total_order_value)
                account.updated_at = now_utc

                remaining_qty = position.quantity - quantity
                if remaining_qty <= 0.00001:
                    db.delete(position)
                else:
                    position.quantity = remaining_qty
                    position.current_price = execution_price
                    position.updated_at = now_utc

            # 11. Atomic Commit (ZERO changes to Portfolio, Holding, or Transaction!)
            db.commit()
            db.refresh(order)
            db.refresh(trade)
            db.refresh(account)

            logger.info(
                f"[PAPER] {clean_side} {clean_symbol} x{quantity} @ ₹{execution_price} | Order FILLED | Trade {trade_id} created | Cash updated to ₹{account.cash_balance}"
            )

            return self._format_order_response(order, trade=trade, updated_cash=account.cash_balance)

        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"[PAPER] Execution failed: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Paper trade execution failed due to an internal error."
            )

    def cancel_order(self, user_id: str, order_id: str, db: Session) -> Dict[str, Any]:
        """Cancel a pending paper order. FILLED orders cannot be cancelled."""
        order = db.query(Order).filter(Order.id == order_id, Order.user_id == user_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{order_id}' not found."
            )

        if order.status == "FILLED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel an already filled order."
            )
        if order.status in ["CANCELLED", "REJECTED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order is already {order.status.lower()}."
            )

        order.status = "CANCELLED"
        order.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(order)
        return self._format_order_response(order)

    def get_orders(
        self,
        user_id: str,
        symbol: Optional[str] = None,
        side: Optional[str] = None,
        status_filter: Optional[str] = None,
        limit: int = 50,
        db: Session = None
    ) -> List[Dict[str, Any]]:
        """Fetch authenticated user's paper orders with optional filtering."""
        query = db.query(Order).filter(Order.user_id == user_id)
        if symbol:
            query = query.filter(Order.symbol == symbol.strip().upper())
        if side:
            query = query.filter(Order.side == side.strip().upper())
        if status_filter:
            query = query.filter(Order.status == status_filter.strip().upper())

        orders = query.order_by(desc(Order.created_at)).limit(limit).all()
        return [self._format_order_response(o) for o in orders]

    def get_order_by_id(self, user_id: str, order_id: str, db: Session) -> Dict[str, Any]:
        """Fetch a single authenticated user's order."""
        order = db.query(Order).filter(Order.id == order_id, Order.user_id == user_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order '{order_id}' not found."
            )
        return self._format_order_response(order)

    def get_trades(
        self,
        user_id: str,
        symbol: Optional[str] = None,
        side: Optional[str] = None,
        limit: int = 50,
        db: Session = None
    ) -> List[Dict[str, Any]]:
        """Fetch authenticated user's executed paper trades with optional filtering."""
        query = db.query(Trade).filter(Trade.user_id == user_id)
        if symbol:
            query = query.filter(Trade.symbol == symbol.strip().upper())
        if side:
            query = query.filter(Trade.side == side.strip().upper())

        trades = query.order_by(desc(Trade.executed_at)).limit(limit).all()
        return [self._format_trade_response(t) for t in trades]

    def get_trade_by_id(self, user_id: str, trade_id: str, db: Session) -> Dict[str, Any]:
        """Fetch a single authenticated user's trade."""
        trade = db.query(Trade).filter(Trade.id == trade_id, Trade.user_id == user_id).first()
        if not trade:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trade '{trade_id}' not found."
            )
        return self._format_trade_response(trade)

    def _format_order_response(
        self,
        order: Order,
        trade: Optional[Trade] = None,
        updated_cash: Optional[float] = None,
        is_duplicate: bool = False
    ) -> Dict[str, Any]:
        return {
            "order_id": order.id,
            "user_id": order.user_id,
            "symbol": order.symbol,
            "side": order.side,
            "quantity": order.quantity,
            "order_type": order.order_type,
            "status": order.status,
            "requested_price": _round_currency(order.requested_price or order.price),
            "executed_price": _round_currency(order.executed_price or order.price),
            "total_value": _round_currency(order.total_value or (order.quantity * (order.executed_price or order.price))),
            "client_order_id": order.client_order_id,
            "rejection_reason": order.rejection_reason,
            "trade_id": trade.id if trade else (order.trades[0].id if order.trades else None),
            "updated_cash": _round_currency(updated_cash) if updated_cash is not None else None,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "filled_at": order.filled_at.isoformat() if order.filled_at else None,
            "data_source": "mock",
            "is_paper_trade": True,
            "is_duplicate": is_duplicate,
            "notice": "Simulated order using simulated market data. No real money is involved."
        }

    def _format_trade_response(self, trade: Trade) -> Dict[str, Any]:
        return {
            "trade_id": trade.id,
            "order_id": trade.order_id,
            "user_id": trade.user_id,
            "symbol": trade.symbol,
            "side": trade.side,
            "quantity": trade.quantity,
            "execution_price": _round_currency(trade.execution_price or trade.price),
            "total_value": _round_currency(trade.total_value or (trade.quantity * (trade.execution_price or trade.price))),
            "executed_at": trade.executed_at.isoformat() if trade.executed_at else None,
            "data_source": "mock",
            "is_paper_trade": True,
            "notice": "Simulated trade executed on mock market data."
        }

paper_trading_service = PaperTradingService()
