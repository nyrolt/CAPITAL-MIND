import { Portfolio, AIInsight } from '../types';

export const advisorService = {
  generateInsight(portfolio: Portfolio, customQuery?: string): AIInsight {
    const query = customQuery || "Explain my current portfolio risk";
    const qLower = query.toLowerCase();

    let portfolioSummary = `Your portfolio '${portfolio.name}' has a current total value of ₹${portfolio.totalValue.toLocaleString('en-IN')} with an overall P/L of ${portfolio.profitLoss >= 0 ? '+' : ''}₹${portfolio.profitLoss.toLocaleString('en-IN')} (${portfolio.returnPercentage.toFixed(2)}%).`;
    
    let riskObs = "";
    let divObs = "";
    let rec = "";
    let priority: 'Low' | 'Medium' | 'High' = 'Medium';
    let category = "Portfolio Intelligence";

    const topSector = portfolio.sectorAllocation[0];
    const topSectorName = topSector ? topSector.sector : 'Primary Sector';
    const topSectorPct = topSector ? topSector.percentage : 0;

    if (qLower.includes('risk') || qLower.includes('why is my risk')) {
      category = "Risk Advisory";
      priority = (portfolio.riskScore && portfolio.riskScore > 65) ? "High" : "Medium";
      riskObs = `Your Risk Score is currently ${portfolio.riskScore !== null && portfolio.riskScore !== undefined ? `${portfolio.riskScore}/100` : 'N/A'} (${portfolio.riskLevel}). The dominant contributor is your ${topSectorPct}% concentration in the ${topSectorName} sector.`;
      divObs = `Direct equity investments make up ${portfolio.assetAllocation.find(a => a.assetType === 'Stock')?.percentage || 0}% of portfolio value. High equity concentration elevates overall portfolio beta.`;
      rec = `Consider setting a sector concentration ceiling of 25% for ${topSectorName} and rebalancing incremental cash into non-correlated assets or liquid funds.`;
    } else if (qLower.includes('concentration') || qLower.includes('sector')) {
      category = "Concentration Analysis";
      priority = topSectorPct > 30 ? "High" : "Low";
      riskObs = `Single-sector exposure in ${topSectorName} stands at ${topSectorPct}% of total assets. Concentrated sector exposure increases drawdown vulnerability during industry cyclical downturns.`;
      divObs = `Your top 2 holdings represent over ${((portfolio.holdings[0]?.allocationPercentage || 0) + (portfolio.holdings[1]?.allocationPercentage || 0)).toFixed(1)}% of net portfolio capital.`;
      rec = `Review direct sector exposure and evaluate diversifying into broad-market index ETFs (e.g. Nifty 50 or Nifty Next 50) to smooth concentration variance.`;
    } else if (qLower.includes('diversification')) {
      category = "Diversification Audit";
      priority = (portfolio.diversificationScore && portfolio.diversificationScore < 60) ? "High" : "Low";
      riskObs = `Diversification Score is ${portfolio.diversificationScore !== null && portfolio.diversificationScore !== undefined ? `${portfolio.diversificationScore}/100` : 'N/A'} (${portfolio.diversificationLevel}). Herfindahl-Hirschman Index (HHI) measures moderate asset clustering.`;
      divObs = `Asset class breakdown shows ${portfolio.assetAllocation.map(a => `${a.percentage}% ${a.assetType}`).join(', ')}.`;
      rec = `To improve diversification, introduce defensive asset classes such as Sovereign Gold ETFs (5-10%) or short-duration debt instruments.`;
    } else if (qLower.includes('performance') || qLower.includes('summarize')) {
      category = "Performance Insight";
      priority = "Medium";
      riskObs = `Portfolio has generated ${portfolio.returnPercentage.toFixed(2)}% absolute gains since inception, outperforming inflation and short-term debt benchmarks.`;
      divObs = `Top gainers are driving majority of total net returns while liquid cash buffers maintain stability.`;
      rec = `Maintain systematic review of underperforming individual assets while retaining long-term compounding core holdings.`;
    } else {
      category = "General Portfolio Query";
      priority = "Medium";
      riskObs = `Current risk profile stands at ${portfolio.riskScore}/100 with ${topSectorPct}% exposure to ${topSectorName}.`;
      divObs = `Holding count is ${portfolio.holdings.length} across ${portfolio.assetAllocation.length} asset classes.`;
      rec = `Periodically assess whether current asset allocation aligns with your risk preference and long-term financial goals.`;
    }

    return {
      id: `ai_${Date.now()}`,
      portfolioId: portfolio.id,
      query,
      portfolioSummary,
      riskObservation: riskObs,
      diversificationObservation: divObs,
      recommendation: rec,
      priority,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      category,
    };
  }
};

