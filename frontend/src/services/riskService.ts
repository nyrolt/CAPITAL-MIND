import { Portfolio, PortfolioRiskAssessment, RiskFactor, DiversificationMetrics } from '../types';
import { apiClient } from './apiClient';

/**
 * Fetch a live, data-driven risk assessment from the backend.
 *
 * The backend computes all metrics from the portfolio's actual holdings
 * (quantity × current_price).  No hardcoded demo values are used.
 *
 * On network failure the function throws — the caller should display
 * a loading/error state rather than falling back to stale demo data.
 */
export const riskService = {
  async getRiskAssessment(portfolio: Portfolio): Promise<PortfolioRiskAssessment> {
    return await apiClient.getRiskAssessment(portfolio.id);
  }
};
