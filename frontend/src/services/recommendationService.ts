import { Recommendation } from '../types';
import { apiClient } from './apiClient';

export const recommendationService = {
  async getRecommendations(portfolioId: string): Promise<Recommendation[]> {
    return apiClient.getRecommendations(portfolioId);
  }
};
