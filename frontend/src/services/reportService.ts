import { Report } from '../types';
import { apiClient } from './apiClient';

export const reportService = {
  async getReports(portfolioId: string): Promise<Report[]> {
    if (!portfolioId) return [];
    try {
      const rep = await apiClient.generateReport(portfolioId);
      return [rep];
    } catch {
      return [];
    }
  }
};


