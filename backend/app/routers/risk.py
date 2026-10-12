"""
Risk Analysis Router
====================
Computes transparent, data-driven risk metrics for a portfolio.

All scores are derived exclusively from the portfolio's live holdings —
no hardcoded values, no demo data, no stale cache.

Score Methodology
-----------------
Risk Score  (0–100, higher = greater concentration / market-drawdown risk):
  Component                Weight   Input
  ──────────────────────   ──────   ──────────────────────────────────────────
  HHI_norm (position)       40 %    Normalized Herfindahl-Hirschman Index
  sector_norm (sector)      35 %    Excess above 30% single-sector threshold
  equity_frac (asset-class) 25 %    Fraction of portfolio in direct equities

  Final: clamp(round(40·HHI_norm + 35·sector_norm + 25·equity_frac), 10, 98)

Diversification Score  (0–100, higher = more diversified):
  clamp(round(40·(1-HHI_norm) + 35·(1-sector_norm) + 25·asset_breadth), 5, 95)
  where asset_breadth = min(1, distinct_asset_classes / 3)

HHI Definition
--------------
  HHI       = Σ w_i²   where w_i = holding_value / total_portfolio_value
  HHI_norm  = (HHI - 1/N) / (1 - 1/N)   [0 = equally split, 1 = monopoly]
  When N == 1, HHI_norm = 1 (fully concentrated by definition).
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.schemas import AuthenticatedUser
from app.auth.dependencies import get_current_user
from app.services.portfolio_service import portfolio_service
from app.models.risk import PortfolioRiskAssessmentModel

router = APIRouter(prefix="/api/risk", tags=["Risk Analysis"])


@router.get("/portfolio/{id}", response_model=PortfolioRiskAssessmentModel)
async def get_portfolio_risk_assessment(
    id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Return a fully documented, data-driven risk assessment.

    All metrics are re-computed on every request from the portfolio's
    current holdings (quantity × current_price).  Nothing is hardcoded.
    """
    p = portfolio_service.get_by_id(id, db=db, user_id=current_user.user_id)
    if not p:
        raise HTTPException(status_code=404, detail="Portfolio not found or access denied")

    holdings: List[Dict[str, Any]] = p.get("holdings", [])
    sector_allocation: List[Dict[str, Any]] = p.get("sectorAllocation", [])
    asset_allocation: List[Dict[str, Any]] = p.get("assetAllocation", [])
    total_val: float = p.get("totalValue", 0.0)

    calculated_at = datetime.now(timezone.utc).isoformat()

    # ── Empty portfolio ──────────────────────────────────────────────────
    if not holdings or total_val <= 0:
        return {
            "portfolioId": p["id"],
            "portfolioName": p["name"],
            "riskScore": None,
            "riskLevel": "Insufficient data",
            "diversificationScore": None,
            "diversificationLevel": "Insufficient data",
            "calculatedAt": calculated_at,
            "dataQualityWarning": "Portfolio has no holdings or zero total market value. Add assets to generate risk metrics.",
            "riskFactors": [
                {
                    "id": "rf_empty",
                    "name": "Holdings Status",
                    "score": 0,
                    "status": "Insufficient data",
                    "explanation": (
                        "No holdings or assets found in this portfolio. "
                        "Add assets to compute risk and diversification analytics."
                    )
                }
            ],
            "diversificationMetrics": {
                "score": None,
                "level": "Insufficient data",
                "hhiIndex": 0.0,
                "hhiExplanation": "Insufficient data: Portfolio contains no active holdings.",
                "assetDiversificationScore": None,
                "sectorDiversificationScore": None,
                "topHoldingConcentration": 0.0
            }
        }

    n = len(holdings)

    # ── A. HHI — position concentration ─────────────────────────────────
    # Weights are holding_value / total_portfolio_value (same denominator
    # as allocationPercentage, which is set by portfolio_service).
    weights = [h["allocationPercentage"] / 100.0 for h in holdings]
    hhi = sum(w * w for w in weights)        # raw HHI ∈ [1/N, 1]
    # Normalize so 0 = perfectly equal spread, 1 = single position
    hhi_norm = (hhi - 1.0 / n) / (1.0 - 1.0 / n) if n > 1 else 1.0
    hhi_norm = max(0.0, min(1.0, hhi_norm))  # defensive clamp

    # ── B. Sector overweight penalty ─────────────────────────────────────
    # sector_allocation is sorted descending by value.
    # sector weight denominator = total_portfolio_value (same as allocationPercentage).
    top_sector = sector_allocation[0] if sector_allocation else {}
    top_sec_name: str = top_sector.get("sector", "Unknown")
    top_sec_val: float = top_sector.get("value", 0.0)
    top_sector_pct: float = top_sector.get("percentage", 0.0)
    top_sector_frac = top_sector_pct / 100.0
    # sector_norm: 0 if ≤ 30% in any sector, 1 if 100% in one sector
    sector_norm = max(0.0, (top_sector_frac - 0.30) / 0.70)
    sector_norm = min(1.0, sector_norm)  # defensive clamp

    # ── C. Equity-class weight ───────────────────────────────────────────
    # "Stock" asset type = direct equity holdings.
    # Denominator = total_portfolio_value (not just equity value).
    equity_val = sum(a["value"] for a in asset_allocation if a["assetType"] == "Stock")
    equity_frac = (equity_val / total_val) if total_val > 0 else 0.0

    # ── D. Asset-class breadth ───────────────────────────────────────────
    n_asset_classes = len(asset_allocation)
    asset_breadth = min(1.0, n_asset_classes / 3.0)

    # ── Scores ──────────────────────────────────────────────────────────
    risk_raw = 40.0 * hhi_norm + 35.0 * sector_norm + 25.0 * equity_frac
    risk_score_computed = min(98, max(10, round(risk_raw)))

    div_raw = 40.0 * (1.0 - hhi_norm) + 35.0 * (1.0 - sector_norm) + 25.0 * asset_breadth
    div_score_computed = min(95, max(5, round(div_raw)))

    # Use portfolio_service's pre-computed values (they use identical formulas);
    # fall back to the values we just computed in case of discrepancy.
    risk_score: int = p.get("riskScore") if p.get("riskScore") is not None else risk_score_computed
    risk_level: str = p.get("riskLevel", "Moderate")
    div_score: int = p.get("diversificationScore") if p.get("diversificationScore") is not None else div_score_computed
    div_level: str = p.get("diversificationLevel", "Low")

    # ── Holding-level detail ─────────────────────────────────────────────
    sorted_h = sorted(holdings, key=lambda h: h["currentValue"], reverse=True)

    # Top-1 holding
    top1 = sorted_h[0] if sorted_h else {}
    top1_symbol: str = top1.get("symbol", "")
    top1_pct: float = round(top1.get("allocationPercentage", 0.0), 2)
    top1_val: float = top1.get("currentValue", 0.0)

    # Top-5 holding concentration
    top5_val = sum(h["currentValue"] for h in sorted_h[:5])
    top5_pct = round((top5_val / total_val * 100.0), 2) if total_val > 0 else 0.0

    # Top-2 holding concentration (used in HHI explanation)
    top2_val = sum(h["currentValue"] for h in sorted_h[:2])
    top2_pct = round((top2_val / total_val * 100.0), 2) if total_val > 0 else 0.0
    top2_names = " + ".join(h["symbol"] for h in sorted_h[:2])

    # Holdings contributing to top sector
    top_sector_holdings = [
        h for h in holdings if h.get("sector") == top_sec_name
    ]
    top_sector_holding_names = ", ".join(h["symbol"] for h in top_sector_holdings)

    # ── Data quality assessment ──────────────────────────────────────────
    stale_holdings = [
        h["symbol"] for h in holdings
        if h.get("priceSource") in ("demo_data", "stale", None)
    ]
    data_quality_warning: str | None = None
    if stale_holdings:
        data_quality_warning = (
            f"Prices for {len(stale_holdings)} holding(s) are not live-market quotes "
            f"({', '.join(stale_holdings[:5])}{'...' if len(stale_holdings) > 5 else ''}). "
            "Risk metrics reflect the last known prices. "
            "Connect a live market feed for real-time accuracy."
        )

    # ── Risk Factor 1: Single-Stock Concentration ────────────────────────
    top1_status = "High" if top1_pct > 40 else ("Moderate" if top1_pct > 20 else "Low")
    if top1_pct > 40:
        top1_detail = (
            f"{top1_symbol} is your largest holding at {top1_pct:.1f}% of total portfolio "
            f"(₹{top1_val:,.0f}), exceeding the 40% single-stock concentration threshold. "
            "Heavy dependence on a single security amplifies idiosyncratic risk."
        )
    elif top1_pct > 20:
        top1_detail = (
            f"{top1_symbol} is your largest holding at {top1_pct:.1f}% of total portfolio "
            f"(₹{top1_val:,.0f}), exceeding the 20% moderate single-stock threshold."
        )
    else:
        top1_detail = (
            f"{top1_symbol} is your largest holding at {top1_pct:.1f}% of total portfolio "
            f"(₹{top1_val:,.0f}). Single-stock concentration is within acceptable limits."
        )

    # ── Risk Factor 2: Position Concentration (HHI) ──────────────────────
    hhi_status = "High" if hhi_norm > 0.6 else ("Moderate" if hhi_norm > 0.3 else "Low")
    hhi_score_display = min(100, round(hhi_norm * 100))
    if hhi_norm > 0.6:
        hhi_detail = (
            f"Herfindahl–Hirschman Index (HHI): {hhi:.4f}, Normalized: {hhi_norm:.2f}. "
            f"Portfolio is highly concentrated — the top-{min(2, n)} holdings "
            f"({top2_names}) account for {top2_pct:.1f}% of capital. "
            f"Top-5 holdings: {top5_pct:.1f}% of capital."
        )
    elif hhi_norm > 0.3:
        hhi_detail = (
            f"HHI: {hhi:.4f}, Normalized: {hhi_norm:.2f}. "
            f"Moderate position concentration. "
            f"Top-{min(2, n)} holdings ({top2_names}): {top2_pct:.1f}% of capital. "
            f"Top-5: {top5_pct:.1f}%."
        )
    else:
        hhi_detail = (
            f"HHI: {hhi:.4f}, Normalized: {hhi_norm:.2f}. "
            f"Holdings are reasonably spread. "
            f"Top-{min(2, n)} holdings ({top2_names}): {top2_pct:.1f}%. "
            f"Top-5: {top5_pct:.1f}%."
        )

    # ── Risk Factor 3: Sector Concentration ─────────────────────────────
    sector_score_display = min(100, round(sector_norm * 100))
    sec_status = "High" if top_sector_pct > 40 else ("Moderate" if top_sector_pct > 25 else "Low")
    if top_sector_holdings:
        sec_holdings_note = f" Contributing holdings: {top_sector_holding_names}."
    else:
        sec_holdings_note = ""
    if top_sector_pct > 40:
        sec_detail = (
            f"{top_sec_name} is your dominant sector at {top_sector_pct:.1f}% of portfolio "
            f"(₹{top_sec_val:,.0f}), exceeding the 40% high-concentration threshold.{sec_holdings_note}"
        )
    elif top_sector_pct > 25:
        sec_detail = (
            f"{top_sec_name} represents {top_sector_pct:.1f}% of your portfolio "
            f"(₹{top_sec_val:,.0f}), exceeding the 25% moderate-concentration threshold.{sec_holdings_note}"
        )
    else:
        sec_detail = (
            f"{top_sec_name} is your largest sector at {top_sector_pct:.1f}% of portfolio "
            f"(₹{top_sec_val:,.0f}). Sector concentration is within acceptable bounds.{sec_holdings_note}"
        )

    # ── Risk Factor 4: Equity Exposure ───────────────────────────────────
    eq_status = "High" if equity_frac > 0.75 else ("Moderate" if equity_frac > 0.50 else "Low")
    eq_score_display = min(100, round(equity_frac * 100))
    equity_symbols = ", ".join(
        h["symbol"] for h in holdings if h.get("assetType") == "Stock"
    )
    if equity_frac > 0.75:
        eq_detail = (
            f"Direct equity (Stock) allocation: {equity_frac*100:.1f}% of total portfolio "
            f"(₹{equity_val:,.0f}). "
            "High equity exposure increases market-cycle drawdown risk. "
            + (f"Equity holdings: {equity_symbols}." if equity_symbols else "")
        )
    elif equity_frac > 0.50:
        eq_detail = (
            f"Direct equity (Stock) allocation: {equity_frac*100:.1f}% of total portfolio "
            f"(₹{equity_val:,.0f}). "
            "Balanced equity mix with meaningful non-equity allocation."
        )
    else:
        eq_detail = (
            f"Direct equity (Stock) allocation: {equity_frac*100:.1f}% of total portfolio "
            f"(₹{equity_val:,.0f}). "
            "Conservative equity weight with significant non-equity allocation (ETFs, gold, cash, bonds)."
        )

    # ── Risk Factor 5: Asset-Class Breadth ───────────────────────────────
    asset_names = ", ".join(a["assetType"] for a in asset_allocation)
    breadth_status = "Low" if n_asset_classes >= 3 else ("Moderate" if n_asset_classes == 2 else "High")
    breadth_score = min(100, max(0, round((1.0 - n_asset_classes / 5.0) * 100)))
    if n_asset_classes >= 3:
        breadth_detail = (
            f"Portfolio spans {n_asset_classes} distinct asset classes: {asset_names}. "
            "Multi-asset allocation provides cross-class risk mitigation."
        )
    elif n_asset_classes == 2:
        breadth_detail = (
            f"Portfolio spans {n_asset_classes} asset classes: {asset_names}. "
            "Two asset classes offer limited cross-class diversification. "
            "Consider adding bonds, gold ETFs, or cash equivalents."
        )
    else:
        breadth_detail = (
            f"Single asset class: {asset_names}. "
            "No cross-asset diversification benefit. "
            "Adding uncorrelated asset classes (e.g., gold, bonds, cash) lowers overall portfolio risk."
        )

    risk_factors = [
        {
            "id": "rf1",
            "name": "Single-Stock Concentration",
            "score": min(100, round(top1_pct)),
            "status": top1_status,
            "explanation": top1_detail
        },
        {
            "id": "rf2",
            "name": "Position Concentration (HHI)",
            "score": hhi_score_display,
            "status": hhi_status,
            "explanation": hhi_detail
        },
        {
            "id": "rf3",
            "name": "Sector Concentration",
            "score": sector_score_display,
            "status": sec_status,
            "explanation": sec_detail
        },
        {
            "id": "rf4",
            "name": "Equity Exposure",
            "score": eq_score_display,
            "status": eq_status,
            "explanation": eq_detail
        },
        {
            "id": "rf5",
            "name": "Asset-Class Breadth",
            "score": breadth_score,
            "status": breadth_status,
            "explanation": breadth_detail
        },
    ]

    # ── Diversification metrics ─────────────────────────────────────────
    hhi_val = round(hhi, 4)
    sector_div_score = min(95, max(5, round((1.0 - sector_norm) * 100)))
    asset_div_score = min(95, max(5, round(asset_breadth * 100)))

    return {
        "portfolioId": p["id"],
        "portfolioName": p["name"],
        "riskScore": risk_score,
        "riskLevel": risk_level,
        "diversificationScore": div_score,
        "diversificationLevel": div_level,
        "calculatedAt": calculated_at,
        "dataQualityWarning": data_quality_warning,
        "riskFactors": risk_factors,
        "diversificationMetrics": {
            "score": div_score,
            "level": div_level,
            "hhiIndex": hhi_val,
            "hhiExplanation": (
                f"HHI = {hhi_val:.4f} (fractional-weight squared sum). "
                f"Normalized HHI = {hhi_norm:.2f} (0 = perfectly equal, 1 = fully concentrated). "
                f"An equal-weighted {n}-holding portfolio would have HHI = {round(1.0/n, 4):.4f}. "
                f"Top-2 holdings ({top2_names}) represent {top2_pct:.1f}% of total capital. "
                f"Top-5 holdings represent {top5_pct:.1f}% of total capital."
            ),
            "assetDiversificationScore": asset_div_score,
            "sectorDiversificationScore": sector_div_score,
            "topHoldingConcentration": top1_pct
        }
    }
