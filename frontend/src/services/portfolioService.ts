import { Portfolio, Holding, Transaction, PortfolioHistoryPoint } from '../types';
import { apiClient } from './apiClient';

export const portfolioService = {
  // Backend API Operations
  async getPortfolios(): Promise<Portfolio[]> {
    return await apiClient.fetchPortfolios();
  },

  async getPortfolio(id: string): Promise<Portfolio> {
    return await apiClient.fetchPortfolio(id);
  },

  async getPortfolioHistory(id: string, timeframe: string = '1M'): Promise<PortfolioHistoryPoint[]> {
    return await apiClient.fetchPortfolioHistory(id, timeframe);
  },

  async createPortfolio(data: {
    name: string;
    objective: string;
    riskPreference: string;
    description?: string;
  }): Promise<Portfolio> {
    return await apiClient.createPortfolio(data);
  },

  async deletePortfolio(id: string): Promise<{ message: string }> {
    return await apiClient.deletePortfolio(id);
  },

  async getHoldings(portfolioId: string): Promise<Holding[]> {
    return await apiClient.fetchHoldings(portfolioId);
  },

  async addHolding(portfolioId: string, holding: Partial<Holding>): Promise<Portfolio> {
    return await apiClient.addHolding(portfolioId, holding);
  },

  async updateHolding(
    portfolioId: string,
    holdingId: string,
    updates: Partial<Holding>
  ): Promise<Portfolio> {
    return await apiClient.updateHolding(portfolioId, holdingId, updates);
  },

  async deleteHolding(portfolioId: string, holdingId: string): Promise<Portfolio> {
    return await apiClient.deleteHolding(portfolioId, holdingId);
  },

  async getTransactions(portfolioId: string): Promise<Transaction[]> {
    return await apiClient.fetchTransactions(portfolioId);
  },

  async addTransaction(portfolioId: string, tx: Partial<Transaction>): Promise<Portfolio> {
    return await apiClient.addTransaction(portfolioId, tx);
  },

  // Helper metric calculators (maintained for backward compatibility with frontend display)
  calculateHoldingMetrics(holding: Partial<Holding>): Holding {
    const quantity = holding.quantity || 0;
    const avgPrice = holding.avgPrice || 0;
    const currentPrice = holding.currentPrice || avgPrice;

    const investedValue = quantity * avgPrice;
    const currentValue = quantity * currentPrice;
    const profitLoss = currentValue - investedValue;
    const returnPercentage = investedValue > 0 ? (profitLoss / investedValue) * 100 : 0;

    return {
      id: holding.id || `h_${Date.now()}`,
      symbol: holding.symbol?.toUpperCase() || 'ASSET',
      name: holding.name || holding.symbol || 'Asset',
      assetType: holding.assetType || 'Stock',
      quantity,
      avgPrice,
      currentPrice,
      investedValue,
      currentValue,
      profitLoss,
      returnPercentage,
      allocationPercentage: holding.allocationPercentage || 0,
      sector: holding.sector || 'General',
    };
  },

  recalculatePortfolio(portfolio: Portfolio): Portfolio {
    let totalVal = 0;
    let totalInvested = 0;

    const updatedHoldings = (portfolio.holdings || []).map((h) => {
      const updated = this.calculateHoldingMetrics(h);
      totalVal += updated.currentValue;
      totalInvested += updated.investedValue;
      return updated;
    });

    const finalHoldings = updatedHoldings.map((h) => ({
      ...h,
      allocationPercentage:
        totalVal > 0 ? Number(((h.currentValue / totalVal) * 100).toFixed(2)) : 0,
    }));

    const totalPL = totalVal - totalInvested;
    const returnPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

    const sectorMap: Record<string, number> = {};
    const assetMap: Record<string, number> = {};

    finalHoldings.forEach((h) => {
      sectorMap[h.sector] = (sectorMap[h.sector] || 0) + h.currentValue;
      assetMap[h.assetType] = (assetMap[h.assetType] || 0) + h.currentValue;
    });

    const sectorAllocation = Object.entries(sectorMap)
      .map(([sector, val]) => ({
        sector,
        value: val,
        percentage: totalVal > 0 ? Number(((val / totalVal) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const assetAllocation = Object.entries(assetMap)
      .map(([assetType, val]) => ({
        assetType: assetType as any,
        value: val,
        percentage: totalVal > 0 ? Number(((val / totalVal) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.value - a.value);

    let riskScore: number | null = null;
    let riskLevel: Portfolio['riskLevel'] = 'Insufficient data';
    let diversificationScore: number | null = null;
    let diversificationLevel: Portfolio['diversificationLevel'] = 'Insufficient data';

    if (finalHoldings.length > 0 && totalVal > 0) {
      const n = finalHoldings.length;
      const weights = finalHoldings.map((h) => h.allocationPercentage / 100);
      const hhi = weights.reduce((acc, w) => acc + w * w, 0);
      const hhiNorm = n > 1 ? (hhi - 1.0 / n) / (1.0 - 1.0 / n) : 1.0;

      const topSectorPct = sectorAllocation[0]?.percentage || 0;
      const topSectorFrac = topSectorPct / 100;
      const sectorNorm = Math.max(0, (topSectorFrac - 0.3) / 0.7);

      const equityFrac = (assetMap['Stock'] || 0) / totalVal;

      const riskRaw = 40.0 * hhiNorm + 35.0 * sectorNorm + 25.0 * equityFrac;
      riskScore = Math.min(98, Math.max(10, Math.round(riskRaw)));

      const assetBreadth = Math.min(1.0, assetAllocation.length / 3.0);
      const divRaw = 40.0 * (1.0 - hhiNorm) + 35.0 * (1.0 - sectorNorm) + 25.0 * assetBreadth;
      diversificationScore = Math.min(95, Math.max(5, Math.round(divRaw)));

      if (riskScore >= 80) riskLevel = 'Very High';
      else if (riskScore >= 60) riskLevel = 'High';
      else if (riskScore >= 40) riskLevel = 'Moderate';
      else if (riskScore >= 25) riskLevel = 'Low';
      else riskLevel = 'Very Low';

      if (diversificationScore >= 70) diversificationLevel = 'High';
      else if (diversificationScore >= 45) diversificationLevel = 'Moderate';
      else diversificationLevel = 'Low';
    }

    const realizedPL = portfolio.realizedProfitLoss ?? 0;
    const totalPLCombined = totalPL + realizedPL;
    const totalReturnPct = totalInvested > 0 ? (totalPLCombined / totalInvested) * 100 : 0;

    return {
      ...portfolio,
      totalValue: totalVal,
      investedCapital: totalInvested,
      profitLoss: totalPLCombined,
      unrealizedProfitLoss: totalPL,
      realizedProfitLoss: realizedPL,
      totalProfitLoss: totalPLCombined,
      returnPercentage: returnPct,
      returnOnCost: returnPct,
      totalReturnPercentage: totalReturnPct,
      cashBalance: assetMap['Cash'] || 0,
      securitiesValue: totalVal - (assetMap['Cash'] || 0),
      riskScore,
      riskLevel,
      diversificationScore,
      diversificationLevel,
      sectorAllocation,
      assetAllocation,
      holdings: finalHoldings,
      transactions: portfolio.transactions || [],
    };
  },
};
