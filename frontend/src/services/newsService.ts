import { apiClient } from './apiClient';
import { NewsListResult, NewsArticleItem, NewsStatusResult } from '../types';

export interface NewsFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  sector?: string;
  stock?: string;
  impact?: string;
  source?: string;
  status?: string;
}

export const newsService = {
  getNewsFeed: async (params?: NewsFilterParams): Promise<NewsListResult> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sector) searchParams.set('sector', params.sector);
    if (params?.stock) searchParams.set('stock', params.stock);
    if (params?.impact) searchParams.set('impact', params.impact);
    if (params?.source) searchParams.set('source', params.source);
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    const endpoint = query ? `/news?${query}` : '/news';
    return apiClient.get<NewsListResult>(endpoint);
  },

  getArticleById: async (articleId: string): Promise<NewsArticleItem> => {
    return apiClient.get<NewsArticleItem>(`/news/${articleId}`);
  },

  getArticleAnalysis: async (articleId: string): Promise<any> => {
    return apiClient.get<any>(`/news/${articleId}/analysis`);
  },

  getPersonalizedNews: async (limit: number = 20): Promise<NewsArticleItem[]> => {
    return apiClient.get<NewsArticleItem[]>(`/news/for-me?limit=${limit}`);
  },

  getStatus: async (): Promise<NewsStatusResult> => {
    return apiClient.get<NewsStatusResult>('/news/status');
  },

  triggerIngestion: async (): Promise<any> => {
    return apiClient.post<any>('/news/trigger-ingestion', {});
  },

  triggerAnalysis: async (batchSize: number = 5): Promise<any> => {
    return apiClient.post<any>(`/news/trigger-analysis?batch_size=${batchSize}`, {});
  }
};
