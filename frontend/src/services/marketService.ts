import { apiClient } from './apiClient';
import {
  StockSearchResult,
  StockDetails,
  StockQuote,
  StockHistoryPoint,
  MarketStatus,
  Watchlist
} from '../types';

export const marketService = {
  async searchStocks(query: string, limit: number = 10): Promise<StockSearchResult[]> {
    if (!query || query.trim().length === 0) return [];
    return apiClient.get<StockSearchResult[]>(`/stocks/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`);
  },

  async getStockDetails(symbol: string): Promise<StockDetails> {
    return apiClient.get<StockDetails>(`/stocks/${encodeURIComponent(symbol.toUpperCase())}`);
  },

  async getStockQuote(symbol: string): Promise<StockQuote> {
    return apiClient.get<StockQuote>(`/stocks/${encodeURIComponent(symbol.toUpperCase())}/quote`);
  },

  async getStockHistory(symbol: string, timeframe: string = '1M'): Promise<StockHistoryPoint[]> {
    return apiClient.get<StockHistoryPoint[]>(`/stocks/${encodeURIComponent(symbol.toUpperCase())}/history?timeframe=${timeframe}`);
  },

  async getMarketStatus(): Promise<MarketStatus> {
    return apiClient.get<MarketStatus>('/market/status');
  },

  async getWatchlists(): Promise<Watchlist[]> {
    return apiClient.get<Watchlist[]>('/watchlist');
  },

  async createWatchlist(name: string, symbols?: string[]): Promise<Watchlist> {
    return apiClient.post<Watchlist>('/watchlist', { name, symbols });
  },

  async addStockToWatchlist(watchlistId: string, symbol: string): Promise<Watchlist> {
    return apiClient.post<Watchlist>(`/watchlist/${encodeURIComponent(watchlistId)}/stocks`, {
      symbol: symbol.toUpperCase()
    });
  },

  async removeStockFromWatchlist(watchlistId: string, symbol: string): Promise<Watchlist> {
    return apiClient.delete<Watchlist>(`/watchlist/${encodeURIComponent(watchlistId)}/stocks/${encodeURIComponent(symbol.toUpperCase())}`);
  },
};
