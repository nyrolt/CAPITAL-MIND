import { Portfolio } from '../types';
import { apiClient } from './apiClient';

export const analyticsService = {
  async getPortfolioAnalytics(portfolio: Portfolio) {
    try {
      if (portfolio && portfolio.id) {
        return await apiClient.getPortfolioAnalytics(portfolio.id);
      }
    } catch (e) {
      console.warn('Backend analytics endpoint unavailable, returning calculated metrics:', e);
    }
    return {
      portfolioId: portfolio.id,
      name: portfolio.name,
      totalValue: portfolio.totalValue,
      investedCapital: portfolio.investedCapital,
      profitLoss: portfolio.profitLoss,
      returnPercentage: portfolio.returnPercentage,
      sectorAllocation: portfolio.sectorAllocation,
      assetAllocation: portfolio.assetAllocation,
      holdingCount: portfolio.holdings ? portfolio.holdings.length : 0,
      topHolding: portfolio.holdings && portfolio.holdings.length > 0 ? portfolio.holdings[0] : null,
    };
  }
};
