import json
import logging
import uuid
from typing import Dict, Any, Optional
from datetime import datetime

from app.config import settings

logger = logging.getLogger("capitalmind.advisor")

class AdvisorService:
    def generate_insight(self, portfolio: Dict[str, Any], custom_query: Optional[str] = None) -> Dict[str, Any]:
        query = custom_query or "Explain my current portfolio risk"
        q_lower = query.lower()

        p_name = portfolio.get("name", "Portfolio")
        total_val = portfolio.get("totalValue", 0.0)
        pl = portfolio.get("profitLoss", 0.0)
        ret_pct = portfolio.get("returnPercentage", 0.0)
        risk_score = portfolio.get("riskScore", 50)
        risk_level = portfolio.get("riskLevel", "Moderate")
        div_score = portfolio.get("diversificationScore", 50)
        div_level = portfolio.get("diversificationLevel", "Moderate")
        sector_alloc = portfolio.get("sectorAllocation", [])
        asset_alloc = portfolio.get("assetAllocation", [])
        holdings = portfolio.get("holdings", [])

        top_sector = sector_alloc[0] if sector_alloc else {"sector": "Banking", "percentage": 30.0}
        top_sector_name = top_sector.get("sector", "Banking")
        top_sector_pct = top_sector.get("percentage", 30.0)

        # 1. Attempt Live Gemini AI generation if configured
        if settings.GEMINI_API_KEY and settings.GEMINI_ANALYSIS_ENABLED:
            try:
                from google import genai
                from google.genai import types

                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                prompt = f"""You are CapitalMind's Chief Investment Strategist and Quantitative Risk Advisor.
Analyze this authenticated user's portfolio and provide actionable, objective analysis for their query: "{query}".

PORTFOLIO DATA:
- Name: {p_name}
- Total Value: Rs {total_val:,.2f}
- Profit/Loss: Rs {pl:,.2f} ({ret_pct:.2f}%)
- Risk Score: {risk_score}/100 ({risk_level})
- Diversification Score: {div_score}/100 ({div_level})
- Holdings: {', '.join([f"{h.get('symbol')} ({h.get('allocationPercentage', 0)}%)" for h in holdings[:10]])}
- Sector Breakdown: {', '.join([f"{s.get('sector')} ({s.get('percentage')}%)" for s in sector_alloc])}
- Asset Breakdown: {', '.join([f"{a.get('assetType')} ({a.get('percentage')}%)" for a in asset_alloc])}

INSTRUCTIONS:
1. Ground your observations strictly in the provided portfolio data.
2. Distinguish confirmed concentrations from broader market trends.
3. Never guarantee future price movements or profits.
4. Return ONLY valid JSON matching this schema:
{{
  "portfolioSummary": "Concise 1-2 sentence overview of capital and current returns",
  "riskObservation": "Specific risk and concentration factors identified",
  "diversificationObservation": "Observation on asset class and sector dispersion",
  "recommendation": "Concrete, non-guaranteed rebalancing or risk management suggestion",
  "priority": "Low | Medium | High",
  "category": "Risk Advisory | Concentration Analysis | Diversification Audit | Performance Insight | Portfolio Intelligence"
}}
"""
                resp = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        response_mime_type="application/json"
                    )
                )
                if resp and resp.text:
                    parsed = json.loads(resp.text.strip())
                    prio = parsed.get("priority", "Medium")
                    if prio not in ["Low", "Medium", "High"]:
                        prio = "Medium"
                    return {
                        "id": f"ai_{uuid.uuid4().hex[:8]}",
                        "portfolioId": portfolio.get("id", "p1"),
                        "query": query,
                        "portfolioSummary": parsed.get("portfolioSummary", f"Portfolio '{p_name}' valued at ₹{total_val:,.2f}."),
                        "riskObservation": parsed.get("riskObservation", f"Risk score is {risk_score}/100."),
                        "diversificationObservation": parsed.get("diversificationObservation", f"Diversification score is {div_score}/100."),
                        "recommendation": parsed.get("recommendation", "Review asset allocation against investment objective."),
                        "priority": prio,
                        "timestamp": datetime.now().strftime("%H:%M:%S"),
                        "category": parsed.get("category", "Portfolio Intelligence"),
                        "isLiveAI": True,
                        "modelName": settings.GEMINI_MODEL
                    }
            except Exception as e:
                logger.warning(f"[ADVISOR] Gemini API call skipped or failed ({e}); using deterministic financial rule engine.")

        # 2. Rule-based financial calculation engine (clearly labeled as Rule-based Engine)
        summary = f"Your portfolio '{p_name}' has a total value of ₹{total_val:,.2f} with an overall P/L of {'+' if pl >= 0 else ''}₹{pl:,.2f} ({ret_pct:.2f}%)."
        category = "Portfolio Intelligence"
        priority = "Medium"

        if "risk" in q_lower:
            category = "Risk Advisory"
            priority = "High" if risk_score > 65 else "Medium"
            risk_obs = f"Your Risk Score is currently {risk_score}/100 ({risk_level}). The dominant contributor is your {top_sector_pct}% concentration in the {top_sector_name} sector."
            div_obs = f"Direct equity investments make up {next((a['percentage'] for a in asset_alloc if a['assetType'] == 'Stock'), 0)}% of total portfolio value."
            recommendation = f"Consider setting a sector concentration ceiling of 25% for {top_sector_name} and rebalancing incremental cash into non-correlated assets or liquid funds."
        elif "concentration" in q_lower or "sector" in q_lower:
            category = "Concentration Analysis"
            priority = "High" if top_sector_pct > 30 else "Low"
            risk_obs = f"Single-sector exposure in {top_sector_name} stands at {top_sector_pct}% of total assets, which increases drawdown vulnerability during industry cyclical downturns."
            div_obs = "Your top holdings represent a significant portion of net portfolio capital."
            recommendation = "Review direct sector exposure and evaluate diversifying into broad-market index ETFs (e.g. Nifty 50 or Nifty Next 50)."
        elif "diversification" in q_lower:
            category = "Diversification Audit"
            priority = "High" if div_score < 60 else "Low"
            risk_obs = f"Diversification Score is {div_score}/100 ({div_level}). Herfindahl-Hirschman Index (HHI) measures moderate asset clustering."
            alloc_str = ", ".join([f"{a['percentage']}% {a['assetType']}" for a in asset_alloc])
            div_obs = f"Asset class breakdown shows {alloc_str}."
            recommendation = "To improve diversification, introduce defensive asset classes such as Sovereign Gold ETFs (5-10%) or short-duration debt instruments."
        else:
            category = "General Portfolio Query"
            priority = "Medium"
            risk_obs = f"Current risk profile stands at {risk_score}/100 with {top_sector_pct}% exposure to {top_sector_name}."
            div_obs = f"Holding count is {len(holdings)} across {len(asset_alloc)} asset classes."
            recommendation = "Periodically assess whether current asset allocation aligns with your risk preference and long-term financial goals."

        return {
            "id": f"ai_{uuid.uuid4().hex[:8]}",
            "portfolioId": portfolio.get("id", "p1"),
            "query": query,
            "portfolioSummary": summary,
            "riskObservation": risk_obs,
            "diversificationObservation": div_obs,
            "recommendation": recommendation,
            "priority": priority,
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "category": category,
            "isLiveAI": False,
            "modelName": "Rule-based Engine"
        }

advisor_service = AdvisorService()


