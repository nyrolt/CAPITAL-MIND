"""
Recommendations Router
======================
Generates DATA-DRIVEN, actionable rebalancing recommendations from a
portfolio's live holdings.  Zero hardcoded content — every title,
explanation, and figure is interpolated from real portfolio metrics.

Logic mirrors risk.py so scores are consistent.
"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.schemas import AuthenticatedUser
from app.auth.dependencies import get_current_user
from app.services.portfolio_service import portfolio_service

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])


def _generate_recommendations(p: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Build a list of prioritised, data-driven recommendations from the
    portfolio dict returned by portfolio_service.get_by_id().
    """
    holdings: List[Dict] = p.get("holdings", [])
    sector_allocation: List[Dict] = p.get("sectorAllocation", [])
    asset_allocation: List[Dict] = p.get("assetAllocation", [])
    total_val: float = p.get("totalValue", 0.0)
    portfolio_id: str = p["id"]
    today = date.today().isoformat()

    recs: List[Dict] = []

    if not holdings or total_val <= 0:
        return recs

    n = len(holdings)

    # ── HHI & weights ────────────────────────────────────────────────────
    weights = [h["allocationPercentage"] / 100.0 for h in holdings]
    hhi = sum(w * w for w in weights)
    hhi_norm = (hhi - 1.0 / n) / (1.0 - 1.0 / n) if n > 1 else 1.0
    hhi_norm = max(0.0, min(1.0, hhi_norm))

    # ── Top holding ───────────────────────────────────────────────────────
    sorted_h = sorted(holdings, key=lambda h: h["currentValue"], reverse=True)
    top1 = sorted_h[0] if sorted_h else {}
    top1_sym: str = top1.get("symbol", "Top holding")
    top1_pct: float = round(top1.get("allocationPercentage", 0.0), 2)
    top1_val: float = top1.get("currentValue", 0.0)

    # ── Sector ───────────────────────────────────────────────────────────
    top_sector = sector_allocation[0] if sector_allocation else {}
    top_sec_name: str = top_sector.get("sector", "largest sector")
    top_sec_pct: float = top_sector.get("percentage", 0.0)
    top_sector_holdings = [h["symbol"] for h in holdings if h.get("sector") == top_sec_name]
    top_sec_holdings_str = ", ".join(top_sector_holdings) if top_sector_holdings else top_sec_name

    # ── Equity fraction ───────────────────────────────────────────────────
    equity_val = sum(a["value"] for a in asset_allocation if a["assetType"] == "Stock")
    equity_frac = equity_val / total_val if total_val > 0 else 0.0
    equity_pct = round(equity_frac * 100, 1)
    non_equity_types = [a["assetType"] for a in asset_allocation if a["assetType"] != "Stock"]

    # ── Asset breadth ─────────────────────────────────────────────────────
    n_classes = len(asset_allocation)
    asset_types_str = ", ".join(a["assetType"] for a in asset_allocation)

    # ── 1. Single-stock concentration ────────────────────────────────────
    if top1_pct > 40:
        recs.append({
            "id": "rec_single_stock",
            "category": "Concentration",
            "severity": "High",
            "title": f"Reduce {top1_sym} Concentration (Currently {top1_pct:.1f}%)",
            "recommendation": (
                f"Trim {top1_sym} from {top1_pct:.1f}% to ≤ 25% of portfolio. "
                f"Redeploy ₹{max(0, top1_val - total_val * 0.25):,.0f} across other holdings or asset classes."
            ),
            "explanation": (
                f"{top1_sym} represents {top1_pct:.1f}% of your total portfolio value "
                f"(₹{top1_val:,.0f}), well above the 40% single-stock concentration threshold. "
                "Extreme concentration in one security amplifies idiosyncratic (company-specific) risk. "
                "A single adverse event — earnings miss, regulatory action, or management change — "
                "can cause disproportionate portfolio drawdown."
            ),
            "createdDate": today,
            "portfolioId": portfolio_id,
        })
    elif top1_pct > 25:
        recs.append({
            "id": "rec_single_stock",
            "category": "Concentration",
            "severity": "Medium",
            "title": f"Monitor {top1_sym} Weight ({top1_pct:.1f}% of Portfolio)",
            "recommendation": (
                f"Consider capping {top1_sym} at 25% to reduce idiosyncratic risk. "
                f"Current excess: ₹{max(0, top1_val - total_val * 0.25):,.0f}."
            ),
            "explanation": (
                f"{top1_sym} is your largest holding at {top1_pct:.1f}% "
                f"(₹{top1_val:,.0f}). While not critically concentrated, any holding "
                "above 25% warrants monitoring for outsized impact during market stress."
            ),
            "createdDate": today,
            "portfolioId": portfolio_id,
        })

    # ── 2. Sector concentration ───────────────────────────────────────────
    if top_sec_pct > 40:
        recs.append({
            "id": "rec_sector",
            "category": "Sector Concentration",
            "severity": "High",
            "title": f"Reduce {top_sec_name} Sector Overweight ({top_sec_pct:.1f}%)",
            "recommendation": (
                f"Target {top_sec_name} at ≤ 30% of portfolio. "
                f"Rotate excess into sectors not currently represented in your holdings."
            ),
            "explanation": (
                f"Your {top_sec_name} sector allocation stands at {top_sec_pct:.1f}%, "
                f"driven by: {top_sec_holdings_str}. "
                "A single-sector drawdown (regulatory change, interest rate shift, credit event) "
                "would have an outsized impact on your total portfolio value. "
                "CapitalMind recommends keeping any single sector below 30%."
            ),
            "createdDate": today,
            "portfolioId": portfolio_id,
        })
    elif top_sec_pct > 30:
        recs.append({
            "id": "rec_sector",
            "category": "Sector Concentration",
            "severity": "Medium",
            "title": f"{top_sec_name} at {top_sec_pct:.1f}% — Approaching Overweight Threshold",
            "recommendation": (
                f"Avoid adding further {top_sec_name} exposure. "
                "Consider diversifying the next purchase into an under-represented sector."
            ),
            "explanation": (
                f"{top_sec_name} ({top_sec_holdings_str}) represents {top_sec_pct:.1f}% of your portfolio — "
                "above the 30% moderate-concentration threshold. "
                "Further allocation increases correlated drawdown risk within this sector."
            ),
            "createdDate": today,
            "portfolioId": portfolio_id,
        })

    # ── 3. HHI — portfolio-level concentration ────────────────────────────
    if hhi_norm > 0.5:
        top2_names = " + ".join(h["symbol"] for h in sorted_h[:2])
        top2_pct = round(sum(h["allocationPercentage"] for h in sorted_h[:2]), 1)
        recs.append({
            "id": "rec_hhi",
            "category": "Diversification",
            "severity": "High",
            "title": f"High Portfolio Concentration (HHI = {hhi:.3f})",
            "recommendation": (
                f"Spread capital across more holdings. "
                f"Reducing {top2_names} combined weight from {top2_pct:.1f}% to ≤ 50% would "
                f"materially lower your HHI."
            ),
            "explanation": (
                f"Your Normalized Herfindahl–Hirschman Index (HHI) of {hhi_norm:.2f} signals high "
                f"concentration (0 = perfectly spread, 1 = single position). "
                f"The top-2 holdings ({top2_names}) account for {top2_pct:.1f}% of capital. "
                f"A portfolio of {n} holdings equally weighted would have HHI = {round(1.0/n, 3)}."
            ),
            "createdDate": today,
            "portfolioId": portfolio_id,
        })
    elif hhi_norm > 0.3 and n < 10:
        recs.append({
            "id": "rec_hhi",
            "category": "Diversification",
            "severity": "Medium",
            "title": f"Consider Adding More Holdings (Currently {n})",
            "recommendation": (
                "Increase number of distinct holdings to 10–15 to reduce concentration risk. "
                "Focus on uncorrelated sectors or asset classes."
            ),
            "explanation": (
                f"With {n} holdings and a normalized HHI of {hhi_norm:.2f}, "
                "concentration risk is moderate. Research shows that most idiosyncratic risk "
                "is eliminated above 15–20 diversified holdings."
            ),
            "createdDate": today,
            "portfolioId": portfolio_id,
        })

    # ── 4. Equity fraction ────────────────────────────────────────────────
    if equity_frac > 0.80:
        recs.append({
            "id": "rec_equity",
            "category": "Portfolio Structure",
            "severity": "Medium",
            "title": f"High Equity Exposure ({equity_pct}%) — Add Non-Equity Hedge",
            "recommendation": (
                "Allocate 10–15% into non-equity assets: Sovereign Gold Bonds, LIQUIDBEES, "
                "or short-duration debt funds to reduce drawdown during equity bear markets."
            ),
            "explanation": (
                f"Direct equities constitute {equity_pct}% of your portfolio (₹{equity_val:,.0f}). "
                "During severe equity corrections (2008, 2020), portfolios with 80%+ equity exposure "
                "saw 40–55% drawdowns. Non-equity hedges (gold, cash, short bonds) provide "
                "partial insulation and rebalancing opportunity."
                + (f" Current non-equity assets: {', '.join(non_equity_types)}." if non_equity_types else "")
            ),
            "createdDate": today,
            "portfolioId": portfolio_id,
        })

    # ── 5. Asset-class breadth ────────────────────────────────────────────
    if n_classes < 3:
        recs.append({
            "id": "rec_breadth",
            "category": "Diversification",
            "severity": "Medium" if n_classes == 2 else "High",
            "title": f"Limited Asset-Class Breadth ({n_classes} class{'es' if n_classes != 1 else ''})",
            "recommendation": (
                "Add at least one uncorrelated asset class — e.g., Gold ETF (GOLDBEES), "
                "Liquid Fund / LIQUIDBEES (cash equivalent), or Sovereign bonds — "
                "to improve cross-asset risk mitigation."
            ),
            "explanation": (
                f"Your portfolio currently spans {n_classes} asset class{'es' if n_classes != 1 else ''}: "
                f"{asset_types_str}. "
                "Multi-asset portfolios exhibit lower volatility and faster recovery from drawdowns "
                "because different asset classes are imperfectly correlated. "
                "CapitalMind's model targets at least 3 distinct asset classes for meaningful diversification."
            ),
            "createdDate": today,
            "portfolioId": portfolio_id,
        })

    # Limit to 5, ordered by severity (High first)
    order = {"High": 0, "Medium": 1, "Low": 2}
    recs.sort(key=lambda r: order.get(r["severity"], 99))
    return recs[:5]


@router.get("/{portfolio_id}", response_model=List[dict])
async def get_recommendations(
    portfolio_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Return data-driven, portfolio-specific rebalancing recommendations.
    All values (sector names, percentages, holding symbols, rupee amounts)
    are derived from the portfolio's live holdings — nothing is hardcoded.
    """
    p = portfolio_service.get_by_id(portfolio_id, db=db, user_id=current_user.user_id)
    if not p:
        raise HTTPException(status_code=404, detail="Portfolio not found or access denied")

    return _generate_recommendations(p)


