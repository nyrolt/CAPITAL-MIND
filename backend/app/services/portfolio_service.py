from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.db_models import User, Portfolio, Holding, Transaction
from app.auth.dev_provider import hash_password

INITIAL_PORTFOLIOS_DATA: List[Dict[str, Any]] = [
    {
        "id": "p1",
        "userId": "usr_dev_001",
        "name": "Long-Term Growth",
        "objective": "Wealth Maximization",
        "riskPreference": "Aggressive",
        "description": "Core high-conviction Indian equity holdings focused on banking, tech & energy growth.",
        "createdAt": "2024-01-15",
        "holdings": [
            {
                "id": "h1",
                "symbol": "HDFCBANK",
                "name": "HDFC Bank Ltd.",
                "assetType": "Stock",
                "quantity": 115,
                "avgPrice": 1540,
                "currentPrice": 1780,
                "sector": "Banking",
            },
            {
                "id": "h2",
                "symbol": "RELIANCE",
                "name": "Reliance Industries Ltd.",
                "assetType": "Stock",
                "quantity": 75,
                "avgPrice": 2400,
                "currentPrice": 2650,
                "sector": "Energy",
            },
            {
                "id": "h3",
                "symbol": "INFY",
                "name": "Infosys Ltd.",
                "assetType": "Stock",
                "quantity": 90,
                "avgPrice": 1420,
                "currentPrice": 1510,
                "sector": "Technology",
            },
            {
                "id": "h4",
                "symbol": "ICICIBANK",
                "name": "ICICI Bank Ltd.",
                "assetType": "Stock",
                "quantity": 70,
                "avgPrice": 1010,
                "currentPrice": 1230,
                "sector": "Banking",
            },
            {
                "id": "h5",
                "symbol": "NIFTYBEES",
                "name": "Nippon India Nifty 50 ETF",
                "assetType": "ETF",
                "quantity": 520,
                "avgPrice": 240,
                "currentPrice": 262,
                "sector": "Index ETF",
            },
            {
                "id": "h6",
                "symbol": "LIQUIDBEES",
                "name": "Nippon India Liquid ETF",
                "assetType": "ETF",
                "quantity": 80,
                "avgPrice": 1000,
                "currentPrice": 1003,
                "sector": "Cash Equivalent",
            },
        ],
        "transactions": [
            {
                "id": "t1",
                "date": "2026-09-15",
                "symbol": "HDFCBANK",
                "assetName": "HDFC Bank Ltd.",
                "type": "BUY",
                "quantity": 20,
                "price": 1650,
                "totalValue": 33000,
                "portfolioId": "p1",
            },
            {
                "id": "t2",
                "date": "2026-09-02",
                "symbol": "RELIANCE",
                "assetName": "Reliance Industries Ltd.",
                "type": "BUY",
                "quantity": 15,
                "price": 2580,
                "totalValue": 38700,
                "portfolioId": "p1",
            }
        ]
    },
    {
        "id": "p2",
        "userId": "usr_dev_001",
        "name": "Retirement Portfolio",
        "objective": "Capital Preservation & Growth",
        "riskPreference": "Conservative",
        "description": "Multi-asset balanced allocation focused on capital safety, bonds, gold & flexi-cap funds.",
        "createdAt": "2024-03-10",
        "holdings": [
            {
                "id": "h2_1",
                "symbol": "PARAGPARIKH",
                "name": "Parag Parikh Flexi Cap Fund",
                "assetType": "Mutual Fund",
                "quantity": 2400,
                "avgPrice": 62.5,
                "currentPrice": 71.2,
                "sector": "Diversified Equity",
            },
            {
                "id": "h2_2",
                "symbol": "GSEC2033",
                "name": "7.18% GS 2033 Sovereign Bond",
                "assetType": "Bond",
                "quantity": 120,
                "avgPrice": 1000,
                "currentPrice": 1025,
                "sector": "Government Debt",
            },
            {
                "id": "h2_3",
                "symbol": "GOLDBEES",
                "name": "Nippon India Gold ETF",
                "assetType": "ETF",
                "quantity": 1250,
                "avgPrice": 52,
                "currentPrice": 62.4,
                "sector": "Commodities",
            }
        ],
        "transactions": []
    }
]


class PortfolioService:
    def _get_session(self, db: Optional[Session] = None):
        if db is not None:
            return db, False
        return SessionLocal(), True

    def seed_demo_data(self, db: Session) -> None:
        """Seed initial demo user and portfolios if database is empty."""
        demo_user = db.query(User).filter(User.id == "usr_dev_001").first()
        if not demo_user:
            demo_user = User(
                id="usr_dev_001",
                email="demo@capitalmind.ai",
                name="Arjun Mehta",
                hashed_password=hash_password("demo123"),
                role="Retail Investor",
                auth_mode="development"
            )
            db.add(demo_user)
            db.commit()

        for raw_p in INITIAL_PORTFOLIOS_DATA:
            existing = db.query(Portfolio).filter(Portfolio.id == raw_p["id"]).first()
            if not existing:
                p = Portfolio(
                    id=raw_p["id"],
                    user_id=raw_p["userId"],
                    name=raw_p["name"],
                    objective=raw_p.get("objective", "Wealth Maximization"),
                    risk_preference=raw_p.get("riskPreference", "Aggressive"),
                    description=raw_p.get("description", ""),
                    created_at=datetime.strptime(raw_p.get("createdAt", "2024-01-15"), "%Y-%m-%d").replace(tzinfo=timezone.utc)
                )
                db.add(p)
                db.flush()

                for raw_h in raw_p.get("holdings", []):
                    h = Holding(
                        id=raw_h["id"],
                        portfolio_id=p.id,
                        symbol=raw_h["symbol"],
                        company_name=raw_h["name"],
                        asset_type=raw_h.get("assetType", "Stock"),
                        quantity=float(raw_h["quantity"]),
                        average_price=float(raw_h["avgPrice"]),
                        current_price=float(raw_h.get("currentPrice", raw_h["avgPrice"])),
                        sector=raw_h.get("sector", "General")
                    )
                    db.add(h)

                for raw_t in raw_p.get("transactions", []):
                    t = Transaction(
                        id=raw_t["id"],
                        portfolio_id=p.id,
                        symbol=raw_t["symbol"],
                        asset_name=raw_t["assetName"],
                        type=raw_t.get("type", "BUY"),
                        quantity=float(raw_t["quantity"]),
                        price=float(raw_t["price"]),
                        total_value=float(raw_t["totalValue"]),
                        date=raw_t.get("date", "2026-09-15")
                    )
                    db.add(t)

                db.commit()

        # Ensure any existing holdings with 'General' or 'NSE_EQ' are self-healed
        try:
            from app.services.sector_service import sector_service
            general_holdings = db.query(Holding).filter(Holding.sector.in_(["General", "Equity", "NSE_EQ", "BSE_EQ"])).all()
            if general_holdings:
                for gh in general_holdings:
                    sec, _ = sector_service.get_sector_and_industry(gh.symbol, gh.company_name, gh.isin, gh.asset_type)
                    if sec != "Unclassified":
                        gh.sector = sec
                db.commit()
        except Exception:
            pass

    def _compute_transaction_pnl(self, transactions: List[Transaction], holdings: List[Holding]) -> tuple[float, Dict[str, float], Dict[str, float]]:
        """
        Compute realized P/L from executed transactions using weighted-average cost (WAC).
        Returns:
            (total_realized_pl, symbol_realized_map, tx_realized_map)
        """
        if not transactions:
            return 0.0, {}, {}

        sym_txs: Dict[str, List[Transaction]] = {}
        for t in transactions:
            sym = t.symbol.upper()
            if sym not in sym_txs:
                sym_txs[sym] = []
            sym_txs[sym].append(t)

        holdings_avg_map = {h.symbol.upper(): float(h.average_price or 0.0) for h in holdings}

        total_realized_pl = 0.0
        symbol_realized_map: Dict[str, float] = {}
        tx_realized_map: Dict[str, float] = {}

        for sym, tx_list in sym_txs.items():
            # Sort chronologically by date string, then created_at
            sorted_txs = sorted(tx_list, key=lambda x: (str(x.date or ""), x.created_at))
            running_qty = 0.0
            avg_cost = 0.0
            sym_realized = 0.0

            for t in sorted_txs:
                ttype = (t.type or "BUY").upper()
                tqty = float(t.quantity or 0.0)
                tprice = float(t.price or 0.0)

                if ttype == "BUY":
                    if tqty > 0:
                        new_cost = (running_qty * avg_cost) + (tqty * tprice)
                        running_qty += tqty
                        avg_cost = new_cost / running_qty if running_qty > 0 else tprice
                    tx_realized_map[t.id] = 0.0

                elif ttype == "SELL":
                    if tqty > 0:
                        # Determine cost basis of sold shares
                        cost_per_share = avg_cost if running_qty > 0 else holdings_avg_map.get(sym, tprice)
                        sold_qty = min(running_qty, tqty) if running_qty > 0 else tqty
                        cost_sold = sold_qty * cost_per_share
                        proceeds = sold_qty * tprice
                        gain = proceeds - cost_sold

                        sym_realized += gain
                        total_realized_pl += gain
                        tx_realized_map[t.id] = round(gain, 2)

                        if running_qty > 0:
                            running_qty = max(0.0, running_qty - sold_qty)
                            if running_qty == 0.0:
                                avg_cost = 0.0
                    else:
                        tx_realized_map[t.id] = 0.0
                else:
                    # DEPOSIT, WITHDRAWAL - cash movements do not yield trading profit/loss
                    tx_realized_map[t.id] = 0.0

            symbol_realized_map[sym] = round(sym_realized, 2)

        return round(total_realized_pl, 2), symbol_realized_map, tx_realized_map

    def _compute_from_orm(self, p: Portfolio) -> Dict[str, Any]:
        """Compute portfolio financial metrics, sector/asset breakdown, HHI, risk scores and reconciled P/L."""
        total_realized_pl, symbol_realized_map, tx_realized_map = self._compute_transaction_pnl(
            p.transactions, p.holdings
        )

        total_val = 0.0
        total_invested = 0.0

        from sqlalchemy.orm import object_session
        from app.models.db_models import Stock
        session = object_session(p)

        computed_holdings = []
        for h in p.holdings:
            qty = float(h.quantity or 0)
            avg_p = float(h.average_price or 0)
            curr_p = float(h.current_price or 0.0)
            price_source = "demo_data" if p.id in ["p1", "p2"] else "cached_market_data"
            is_stale = False
            price_warning = None
            last_price_update = None

            # Price resolution (in priority order):
            # 0. Live Upstox tick cache (freshest — non-blocking, cached-only)
            # 1. Holding current_price (stored in DB — may be stale)
            # 2. Stock table cache (secondary fallback)
            # 3. Average buy price (last resort — never 0.0)
            stock_rec = None
            if session:
                if h.instrument_key:
                    stock_rec = session.query(Stock).filter(Stock.instrument_key == h.instrument_key).first()
                if not stock_rec and h.exchange:
                    stock_rec = session.query(Stock).filter(
                        Stock.symbol == h.symbol.upper(),
                        Stock.exchange == h.exchange
                    ).first()
                if not stock_rec:
                    stock_rec = session.query(Stock).filter(Stock.symbol == h.symbol.upper()).first()

            # P0: Live Upstox tick cache (non-blocking — never makes REST calls during GET)
            resolved_from_live = False
            try:
                from app.services.upstox_market_data import upstox_market_data
                _lookup_key = h.instrument_key or h.symbol
                live_tick = upstox_market_data.get_cached_tick(_lookup_key, fetch_if_missing=False)
                if not live_tick and h.symbol:
                    live_tick = upstox_market_data.get_cached_tick(h.symbol, fetch_if_missing=False)
                if live_tick and live_tick.ltp and float(live_tick.ltp) > 0:
                    curr_p = float(live_tick.ltp)
                    resolved_from_live = True
                    price_source = "live_feed"
                    is_stale = False
                    if live_tick.timestamp:
                        ts_sec = float(live_tick.timestamp) / 1000.0
                        last_price_update = datetime.fromtimestamp(ts_sec, tz=timezone.utc).isoformat()
                        age_secs = datetime.now(timezone.utc).timestamp() - ts_sec
                        if age_secs > 4 * 3600:
                            is_stale = True
                            price_source = "stale_live_feed"
                            price_warning = "Live feed price is older than 4 hours"
            except Exception:
                pass

            if not resolved_from_live:
                if curr_p > 0:
                    price_source = "holding_cache" if p.id not in ["p1", "p2"] else "demo_data"
                    if stock_rec and stock_rec.last_updated:
                        last_price_update = stock_rec.last_updated.isoformat()
                        age = datetime.now(timezone.utc) - stock_rec.last_updated.replace(tzinfo=timezone.utc)
                        if age.total_seconds() > 4 * 3600:
                            is_stale = True
                            price_source = "stale"
                            price_warning = "Market price is older than 4 hours"
                elif stock_rec and stock_rec.current_price and stock_rec.current_price > 0:
                    curr_p = float(stock_rec.current_price)
                    price_source = "stock_cache"
                    if stock_rec.last_updated:
                        last_price_update = stock_rec.last_updated.isoformat()
                        age = datetime.now(timezone.utc) - stock_rec.last_updated.replace(tzinfo=timezone.utc)
                        if age.total_seconds() > 4 * 3600:
                            is_stale = True
                            price_source = "stale"
                            price_warning = "Market price is older than 4 hours"
                else:
                    # No price found anywhere — never treat missing price as 0.0!
                    curr_p = avg_p if avg_p > 0 else 0.0
                    is_stale = True
                    price_source = "cost_basis_fallback" if avg_p > 0 else "missing"
                    price_warning = "Live market price unavailable; using purchase cost basis"


            invested = (qty * avg_p) if qty > 0 else 0.0
            curr_val = (qty * curr_p) if qty > 0 else 0.0
            pl = (curr_val - invested) if qty > 0 else 0.0
            ret_pct = (pl / invested * 100.0) if invested > 0 else 0.0

            total_val += curr_val
            total_invested += invested

            from app.services.sector_service import sector_service, BAD_SECTORS
            sec = h.sector
            if not sec or sec in BAD_SECTORS:
                sec, _ = sector_service.get_sector_and_industry(
                    symbol=h.symbol,
                    company_name=h.company_name,
                    isin=h.isin,
                    instrument_type=h.asset_type,
                    db=session,
                )
                if session and sec not in BAD_SECTORS and h.sector != sec:
                    h.sector = sec

            h_realized = symbol_realized_map.get(h.symbol.upper(), 0.0)

            computed_holdings.append({
                "id": h.id,
                "symbol": h.symbol.upper(),
                "name": h.company_name,
                "assetType": h.asset_type,
                "quantity": qty,
                "avgPrice": avg_p,
                "currentPrice": curr_p,
                "investedValue": round(invested, 2),
                "currentValue": round(curr_val, 2),
                "profitLoss": round(pl, 2),
                "unrealizedProfitLoss": round(pl, 2),
                "realizedProfitLoss": round(h_realized, 2),
                "returnPercentage": round(ret_pct, 2),
                "allocationPercentage": 0.0,
                "sector": sec,
                "priceSource": price_source,
                "isRealTime": price_source in ("live", "websocket"),
                "isPriceStale": is_stale,
                "priceWarning": price_warning,
                "lastPriceUpdate": last_price_update,
                "instrumentKey": h.instrument_key,
                "exchange": h.exchange or "NSE",
                "isin": h.isin,
            })

        # Calculate allocation percentages
        for ch in computed_holdings:
            ch["allocationPercentage"] = round((ch["currentValue"] / total_val * 100.0), 2) if total_val > 0 else 0.0

        # Sector & asset class distribution
        sector_map: Dict[str, float] = {}
        asset_map: Dict[str, float] = {}
        for ch in computed_holdings:
            sec = ch["sector"]
            atype = ch["assetType"]
            sector_map[sec] = sector_map.get(sec, 0.0) + ch["currentValue"]
            asset_map[atype] = asset_map.get(atype, 0.0) + ch["currentValue"]

        sector_allocation = [
            {
                "sector": sec,
                "value": round(val, 2),
                "percentage": round((val / total_val * 100.0), 2) if total_val > 0 else 0.0
            }
            for sec, val in sorted(sector_map.items(), key=lambda x: x[1], reverse=True)
        ]

        asset_allocation = [
            {
                "assetType": atype,
                "value": round(val, 2),
                "percentage": round((val / total_val * 100.0), 2) if total_val > 0 else 0.0
            }
            for atype, val in sorted(asset_map.items(), key=lambda x: x[1], reverse=True)
        ]

        # ---------------------------------------------------------------
        # Risk & Diversification Scoring — documented, bounded formulas
        # ---------------------------------------------------------------
        # All inputs are normalized to [0, 1] before multiplying by weights.
        #
        # A. Herfindahl–Hirschman Index (HHI) — position concentration
        #    HHI = Σ (w_i)²  where w_i = holding_value / total_portfolio_value
        #    Range: 1/N (perfectly equal) → 1.0 (single holding)
        #    Higher HHI indicates higher position concentration risk.
        #
        # B. Sector over-weight penalty
        #    top_sector_frac = top-sector value / total_value  ∈ [0, 1]
        #    Benchmark threshold: 0.30 (30%).  Score = max(0, top_sector_frac - 0.30) / 0.70
        #
        # C. Equity-class concentration
        #    equity_frac = (Stock asset class value) / total_value  ∈ [0, 1]
        #
        # RISK SCORE  = clamp(round(40*HHI_norm + 35*sector_norm + 25*equity_frac), 10, 98)
        #   Direction: HIGHER = GREATER CONCENTRATION & DRAWDOWN RISK (NOT a health score).
        #
        # DIVERSIFICATION SCORE  = clamp(round(40*(1 - HHI_norm) + 35*(1 - sector_norm) + 25*asset_breadth), 5, 95)
        #   Direction: HIGHER = BROADER DIVERSIFICATION.
        # ---------------------------------------------------------------

        if not computed_holdings or total_val <= 0:
            risk_score = None
            risk_level = "Insufficient data"
            div_score = None
            div_level = "Insufficient data"
        else:
            n = len(computed_holdings)
            weights = [ch["allocationPercentage"] / 100.0 for ch in computed_holdings]
            hhi = sum(w * w for w in weights) if weights else 1.0
            hhi_norm = (hhi - 1.0 / max(n, 1)) / (1.0 - 1.0 / max(n, 1)) if n > 1 else 1.0

            top_sector_pct = sector_allocation[0]["percentage"] if sector_allocation else 0.0
            top_sector_frac = top_sector_pct / 100.0
            sector_norm = max(0.0, (top_sector_frac - 0.30) / 0.70)

            equity_frac = (asset_map.get("Stock", 0.0) / total_val) if total_val > 0 else 0.0

            risk_raw = 40.0 * hhi_norm + 35.0 * sector_norm + 25.0 * equity_frac
            risk_score = min(98, max(10, round(risk_raw)))

            asset_breadth = min(1.0, len(asset_allocation) / 3.0)
            div_raw = 40.0 * (1.0 - hhi_norm) + 35.0 * (1.0 - sector_norm) + 25.0 * asset_breadth
            div_score = min(95, max(5, round(div_raw)))

            risk_level = "Very Low"
            if risk_score >= 80: risk_level = "Very High"
            elif risk_score >= 60: risk_level = "High"
            elif risk_score >= 40: risk_level = "Moderate"
            elif risk_score >= 25: risk_level = "Low"

            div_level = "Low"
            if div_score >= 70: div_level = "High"
            elif div_score >= 45: div_level = "Moderate"

        total_val = round(total_val, 2)
        total_invested = round(total_invested, 2)
        unrealized_pl = round(total_val - total_invested, 2)
        realized_pl = round(total_realized_pl, 2)
        total_pl = round(unrealized_pl + realized_pl, 2)
        return_on_cost = round((unrealized_pl / total_invested * 100.0), 2) if total_invested > 0 else 0.0
        total_ret_pct = round((total_pl / total_invested * 100.0), 2) if total_invested > 0 else 0.0

        tx_list = [
            {
                "id": t.id,
                "date": t.date,
                "symbol": t.symbol,
                "assetName": t.asset_name,
                "type": t.type,
                "quantity": t.quantity,
                "price": t.price,
                "totalValue": t.total_value,
                "portfolioId": t.portfolio_id,
                "fee": 0.0,
                "realizedProfitLoss": tx_realized_map.get(t.id, 0.0),
            }
            for t in sorted(p.transactions, key=lambda x: (str(x.date or ""), x.created_at), reverse=True)
        ]

        created_str = p.created_at.strftime("%Y-%m-%d") if isinstance(p.created_at, datetime) else str(p.created_at)

        return {
            "id": p.id,
            "userId": p.user_id,
            "name": p.name,
            "objective": p.objective,
            "riskPreference": p.risk_preference,
            "description": p.description,
            "totalValue": total_val,
            "investedCapital": total_invested,
            "profitLoss": total_pl,
            "unrealizedProfitLoss": unrealized_pl,
            "realizedProfitLoss": realized_pl,
            "totalProfitLoss": total_pl,
            "returnPercentage": return_on_cost,
            "returnOnCost": return_on_cost,
            "totalReturnPercentage": total_ret_pct,
            "cashBalance": round(asset_map.get("Cash", 0.0), 2),
            "securitiesValue": round(total_val - asset_map.get("Cash", 0.0), 2),
            "riskScore": risk_score,
            "riskLevel": risk_level,
            "diversificationScore": div_score,
            "diversificationLevel": div_level,
            "sectorAllocation": sector_allocation,
            "assetAllocation": asset_allocation,
            "holdings": computed_holdings,
            "transactions": tx_list,
            "createdAt": created_str
        }

    def get_all(self, db: Optional[Session] = None, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        session, should_close = self._get_session(db)
        try:
            self.seed_demo_data(session)
            query = session.query(Portfolio)
            if user_id:
                query = query.filter(Portfolio.user_id == user_id)
            portfolios = query.order_by(Portfolio.created_at.asc()).all()
            return [self._compute_from_orm(p) for p in portfolios]
        finally:
            if should_close:
                session.close()

    def get_by_id(self, portfolio_id: str, db: Optional[Session] = None, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        session, should_close = self._get_session(db)
        try:
            self.seed_demo_data(session)
            query = session.query(Portfolio).filter(Portfolio.id == portfolio_id)
            if user_id:
                query = query.filter(Portfolio.user_id == user_id)
            p = query.first()
            if not p:
                return None
            return self._compute_from_orm(p)
        finally:
            if should_close:
                session.close()

    def create(
        self,
        name: str,
        objective: str,
        risk_preference: str,
        description: str,
        user_id: Optional[str] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        session, should_close = self._get_session(db)
        try:
            self.seed_demo_data(session)
            new_p = Portfolio(
                id=f"p_{uuid.uuid4().hex[:8]}",
                user_id=user_id or "usr_dev_001",
                name=name,
                objective=objective,
                risk_preference=risk_preference,
                description=description or "",
                created_at=datetime.now(timezone.utc)
            )
            session.add(new_p)
            session.commit()
            session.refresh(new_p)
            return self._compute_from_orm(new_p)
        except Exception:
            session.rollback()
            raise
        finally:
            if should_close:
                session.close()

    def delete_portfolio(self, portfolio_id: str, db: Optional[Session] = None, user_id: Optional[str] = None) -> bool:
        session, should_close = self._get_session(db)
        try:
            query = session.query(Portfolio).filter(Portfolio.id == portfolio_id)
            if user_id:
                query = query.filter(Portfolio.user_id == user_id)
            p = query.first()
            if not p:
                return False
            session.delete(p)
            session.commit()
            return True
        except Exception:
            session.rollback()
            raise
        finally:
            if should_close:
                session.close()

    def get_holdings(self, portfolio_id: str, db: Optional[Session] = None, user_id: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
        computed = self.get_by_id(portfolio_id, db=db, user_id=user_id)
        if not computed:
            return None
        return computed.get("holdings", [])

    def add_holding(
        self,
        portfolio_id: str,
        holding_data: Dict[str, Any],
        db: Optional[Session] = None,
        user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        session, should_close = self._get_session(db)
        try:
            query = session.query(Portfolio).filter(Portfolio.id == portfolio_id)
            if user_id:
                query = query.filter(Portfolio.user_id == user_id)
            p = query.first()
            if not p:
                return None

            from app.models.db_models import Stock
            clean_symbol = holding_data["symbol"].upper()
            stock_rec = session.query(Stock).filter(Stock.symbol == clean_symbol).first()
            if "currentPrice" in holding_data and holding_data["currentPrice"] is not None:
                curr_price = float(holding_data["currentPrice"])
            elif stock_rec and stock_rec.current_price and stock_rec.current_price > 0:
                curr_price = float(stock_rec.current_price)
            else:
                curr_price = float(holding_data.get("avgPrice") or 0.0)

            from app.services.sector_service import sector_service
            sec = holding_data.get("sector")
            if not sec or sec in ("General", "Equity", "NSE_EQ", "BSE_EQ"):
                cname = holding_data.get("name") or (stock_rec.company_name if stock_rec else clean_symbol)
                sec, _ = sector_service.get_sector_and_industry(
                    symbol=clean_symbol,
                    company_name=cname,
                    isin=holding_data.get("isin") or (stock_rec.isin if stock_rec else None),
                    instrument_type=holding_data.get("assetType", "Stock")
                )

            # Prevent duplicate holdings for the same symbol: update existing or insert new
            existing_h = session.query(Holding).filter(
                Holding.portfolio_id == p.id,
                Holding.symbol == clean_symbol
            ).first()

            if existing_h:
                old_qty = float(existing_h.quantity or 0.0)
                old_avg = float(existing_h.average_price or 0.0)
                add_qty = float(holding_data["quantity"])
                add_price = float(holding_data["avgPrice"])
                new_qty = old_qty + add_qty
                new_cost = (old_qty * old_avg) + (add_qty * add_price)
                existing_h.quantity = new_qty
                existing_h.average_price = (new_cost / new_qty) if new_qty > 0 else add_price
                existing_h.current_price = curr_price
                if sec:
                    existing_h.sector = sec
                if holding_data.get("assetType"):
                    existing_h.asset_type = holding_data["assetType"]
            else:
                new_holding = Holding(
                    id=f"h_{uuid.uuid4().hex[:6]}",
                    portfolio_id=p.id,
                    symbol=clean_symbol,
                    company_name=holding_data.get("name") or (stock_rec.company_name if stock_rec else clean_symbol),
                    asset_type=holding_data.get("assetType", "Stock"),
                    quantity=float(holding_data["quantity"]),
                    average_price=float(holding_data["avgPrice"]),
                    current_price=curr_price,
                    sector=sec,
                    exchange=holding_data.get("exchange", "NSE"),
                    instrument_key=holding_data.get("instrument_key") or holding_data.get("instrumentKey"),
                    isin=holding_data.get("isin") or (stock_rec.isin if stock_rec else None)
                )
                session.add(new_holding)

            session.commit()
            session.refresh(p)
            return self._compute_from_orm(p)
        except Exception:
            session.rollback()
            raise
        finally:
            if should_close:
                session.close()

    def update_holding(
        self,
        portfolio_id: str,
        holding_id: str,
        update_data: Dict[str, Any],
        db: Optional[Session] = None,
        user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        session, should_close = self._get_session(db)
        try:
            query = session.query(Portfolio).filter(Portfolio.id == portfolio_id)
            if user_id:
                query = query.filter(Portfolio.user_id == user_id)
            p = query.first()
            if not p:
                return None

            h = session.query(Holding).filter(Holding.id == holding_id, Holding.portfolio_id == portfolio_id).first()
            if not h:
                return None

            if "quantity" in update_data and update_data["quantity"] is not None:
                h.quantity = float(update_data["quantity"])
            if "avgPrice" in update_data and update_data["avgPrice"] is not None:
                h.average_price = float(update_data["avgPrice"])
            if "currentPrice" in update_data and update_data["currentPrice"] is not None:
                h.current_price = float(update_data["currentPrice"])
            if "sector" in update_data and update_data["sector"] is not None:
                h.sector = update_data["sector"]
            if "name" in update_data and update_data["name"] is not None:
                h.company_name = update_data["name"]
            if "assetType" in update_data and update_data["assetType"] is not None:
                h.asset_type = update_data["assetType"]

            session.commit()
            session.refresh(p)
            return self._compute_from_orm(p)
        except Exception:
            session.rollback()
            raise
        finally:
            if should_close:
                session.close()

    def delete_holding(
        self,
        portfolio_id: str,
        holding_id: str,
        db: Optional[Session] = None,
        user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        session, should_close = self._get_session(db)
        try:
            query = session.query(Portfolio).filter(Portfolio.id == portfolio_id)
            if user_id:
                query = query.filter(Portfolio.user_id == user_id)
            p = query.first()
            if not p:
                return None

            h = session.query(Holding).filter(Holding.id == holding_id, Holding.portfolio_id == portfolio_id).first()
            if not h:
                return None

            session.delete(h)
            session.commit()
            session.refresh(p)
            return self._compute_from_orm(p)
        except Exception:
            session.rollback()
            raise
        finally:
            if should_close:
                session.close()

    def get_transactions(
        self,
        portfolio_id: str,
        db: Optional[Session] = None,
        user_id: Optional[str] = None
    ) -> Optional[List[Dict[str, Any]]]:
        computed = self.get_by_id(portfolio_id, db=db, user_id=user_id)
        if not computed:
            return None
        return computed.get("transactions", [])

    def add_transaction(
        self,
        portfolio_id: str,
        tx_data: Dict[str, Any],
        db: Optional[Session] = None,
        user_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        session, should_close = self._get_session(db)
        try:
            query = session.query(Portfolio).filter(Portfolio.id == portfolio_id)
            if user_id:
                query = query.filter(Portfolio.user_id == user_id)
            p = query.first()
            if not p:
                return None

            qty = float(tx_data["quantity"])
            price = float(tx_data["price"])
            tx_type = tx_data.get("type", "BUY").upper()
            clean_sym = tx_data["symbol"].upper()
            fee = float(tx_data.get("fee") or 0.0)

            # Synchronize holding with transaction
            existing_h = session.query(Holding).filter(
                Holding.portfolio_id == portfolio_id,
                Holding.symbol == clean_sym
            ).first()

            if tx_type == "BUY":
                if existing_h:
                    old_qty = float(existing_h.quantity or 0.0)
                    old_avg = float(existing_h.average_price or 0.0)
                    new_qty = old_qty + qty
                    new_cost = (old_qty * old_avg) + (qty * price) + fee
                    new_avg = (new_cost / new_qty) if new_qty > 0 else price
                    existing_h.quantity = new_qty
                    existing_h.average_price = new_avg
                    if float(existing_h.current_price or 0.0) <= 0:
                        existing_h.current_price = price
                else:
                    from app.models.db_models import Stock
                    from app.services.sector_service import sector_service
                    stock_rec = session.query(Stock).filter(Stock.symbol == clean_sym).first()
                    cname = tx_data.get("assetName") or (stock_rec.company_name if stock_rec else clean_sym)
                    sec, _ = sector_service.get_sector_and_industry(
                        symbol=clean_sym,
                        company_name=cname,
                        isin=stock_rec.isin if stock_rec else None,
                        instrument_type=tx_data.get("assetType", "Stock"),
                        db=session,
                    )
                    avg_p = ((qty * price) + fee) / qty if qty > 0 else price
                    new_h = Holding(
                        id=f"h_{uuid.uuid4().hex[:6]}",
                        portfolio_id=portfolio_id,
                        symbol=clean_sym,
                        company_name=cname,
                        asset_type=tx_data.get("assetType", "Stock"),
                        quantity=qty,
                        average_price=avg_p,
                        current_price=price,
                        sector=sec,
                        exchange=tx_data.get("exchange", "NSE"),
                        instrument_key=stock_rec.instrument_key if stock_rec else None,
                        isin=stock_rec.isin if stock_rec else None,
                    )
                    session.add(new_h)

            elif tx_type == "SELL":
                if existing_h:
                    old_qty = float(existing_h.quantity or 0.0)
                    sold_qty = min(old_qty, qty)
                    existing_h.quantity = max(0.0, old_qty - sold_qty)
                    # Weighted-average cost per unit remains unchanged for remaining shares

            new_tx = Transaction(
                id=f"t_{uuid.uuid4().hex[:6]}",
                portfolio_id=portfolio_id,
                symbol=clean_sym,
                asset_name=tx_data.get("assetName") or clean_sym,
                type=tx_type,
                quantity=qty,
                price=price,
                total_value=qty * price,
                date=tx_data.get("date") or datetime.now().strftime("%Y-%m-%d"),
                created_at=datetime.now(timezone.utc)
            )
            session.add(new_tx)
            session.commit()
            session.refresh(p)
            return self._compute_from_orm(p)
        except Exception:
            session.rollback()
            raise
        finally:
            if should_close:
                session.close()

    async def get_portfolio_history(
        self,
        portfolio_id: str,
        timeframe: str = "1M",
        db: Optional[Session] = None,
        user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Return historical portfolio valuations for the requested timeframe.

        DATA SOURCE PRIORITY (in order):
        1. Persisted PortfolioSnapshot rows — real, reliable, timestamped.
        2. Honest empty list — never fabricates data.

        TIME FILTERING:
        - '1M'  → last 30 calendar days
        - '3M'  → last 90 calendar days
        - '6M'  → last 180 calendar days
        - '1Y'  → last 365 calendar days
        - 'ALL' → all available snapshots

        RETURN FORMAT:
        Each point: { date, formatted_date, portfolioValue, periodReturnPercentage,
                      isEod, isReconstructed, status }

        CHART REQUIREMENTS:
        - Period return is from the FIRST snapshot in the window to the LAST.
        - All-time P/L is kept separate (reported by _compute_from_orm).
        - A single snapshot is returned honestly; the chart handles single-point display.
        """
        p = self.get_by_id(portfolio_id, db=db, user_id=user_id)
        if not p:
            return []

        session, should_close = self._get_session(db)
        try:
            from app.models.db_models import PortfolioSnapshot
            from datetime import timedelta as td

            # Determine start-of-window cutoff date
            today = datetime.now(timezone.utc).date()
            cutoff_map = {
                "1M": today - td(days=30),
                "3M": today - td(days=90),
                "6M": today - td(days=180),
                "1Y": today - td(days=365),
                "ALL": None,  # No cutoff
            }
            cutoff = cutoff_map.get(timeframe.upper())

            query = session.query(PortfolioSnapshot).filter(
                PortfolioSnapshot.portfolio_id == portfolio_id
            )
            if cutoff:
                query = query.filter(PortfolioSnapshot.snapshot_date >= cutoff.strftime("%Y-%m-%d"))

            snapshots = query.order_by(PortfolioSnapshot.snapshot_date.asc()).all()

            if not snapshots:
                # No persisted snapshots yet — return empty, but also capture a
                # live-price point right now so at least one data point is stored
                # the next time the user visits.
                try:
                    from app.services.snapshot_service import (
                        compute_snapshot_for_portfolio,
                        save_snapshot,
                    )
                    p_orm = session.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
                    if p_orm:
                        snap_data = compute_snapshot_for_portfolio(p_orm, session, is_eod=False)
                        if snap_data:
                            today_str = (datetime.now(timezone.utc) + td(hours=5, minutes=30)).strftime("%Y-%m-%d")
                            save_snapshot(portfolio_id, today_str, snap_data, session)
                            fmt_date = datetime.strptime(today_str, "%Y-%m-%d").strftime("%d %b")
                            return [{
                                "date": today_str,
                                "formatted_date": fmt_date,
                                "portfolioValue": snap_data["total_value"],
                                "periodReturnPercentage": 0.0,  # single point = 0% period change
                                "isEod": False,
                                "isReconstructed": False,
                                "status": snap_data.get("status", "complete"),
                                "priceSource": snap_data.get("price_source", "live"),
                            }]
                except Exception:
                    pass
                return []

            # Build history points from persisted snapshots
            start_val = float(snapshots[0].total_value) if snapshots else 0.0
            history_points = []
            for snap in snapshots:
                snap_date = snap.snapshot_date  # YYYY-MM-DD
                try:
                    fmt_date = datetime.strptime(snap_date, "%Y-%m-%d").strftime("%d %b")
                except Exception:
                    fmt_date = snap_date

                snap_val = float(snap.total_value)
                period_ret = round(((snap_val - start_val) / start_val * 100.0), 2) if start_val > 0 else 0.0

                history_points.append({
                    "date": snap_date,
                    "formatted_date": fmt_date,
                    "portfolioValue": snap_val,
                    "periodReturnPercentage": period_ret,
                    "isEod": bool(snap.is_eod),
                    "isReconstructed": bool(snap.is_reconstructed),
                    "status": snap.status or "complete",
                    "priceSource": snap.price_source or "cached",
                })

            return history_points

        finally:
            if should_close:
                session.close()


portfolio_service = PortfolioService()
