import { apiClient } from './apiClient';
import {
  PaperAccount,
  PaperOrder,
  PaperTrade,
  PaperPortfolio,
  PaperPosition,
  CreateOrderRequest
} from '../types';

export const tradingService = {
  /**
   * Fetch authenticated user's paper trading account cash and P/L summary
   */
  async getPaperAccount(): Promise<PaperAccount> {
    return apiClient.get<PaperAccount>('/trading/account');
  },

  /**
   * Configure/modify user's paper trading virtual capital
   */
  async updateCapital(capital: number): Promise<{ account_id: string; user_id: string; cash_balance: number; initial_cash: number; updated_at: string }> {
    return apiClient.put('/trading/account/capital', { capital });
  },

  /**
   * Fetch authenticated user's paper portfolio holdings and calculated metrics
   */
  async getPaperPortfolio(): Promise<PaperPortfolio> {
    return apiClient.get<PaperPortfolio>('/trading/portfolio');
  },

  /**
   * Fetch authenticated user's active paper positions
   */
  async getPositions(): Promise<PaperPosition[]> {
    return apiClient.get<PaperPosition[]>('/trading/positions');
  },

  /**
   * List authenticated user's paper orders with optional filters
   */
  async getOrders(params?: { symbol?: string; side?: string; status?: string; limit?: number }): Promise<PaperOrder[]> {
    const query = new URLSearchParams();
    if (params?.symbol) query.append('symbol', params.symbol);
    if (params?.side) query.append('side', params.side);
    if (params?.status) query.append('status', params.status);
    if (params?.limit) query.append('limit', params.limit.toString());

    const qs = query.toString();
    const endpoint = qs ? `/orders?${qs}` : '/orders';
    return apiClient.get<PaperOrder[]>(endpoint);
  },

  /**
   * Fetch single order by ID
   */
  async getOrder(orderId: string): Promise<PaperOrder> {
    return apiClient.get<PaperOrder>(`/orders/${orderId}`);
  },

  /**
   * Submit and execute a paper market order
   */
  async createPaperOrder(data: CreateOrderRequest): Promise<PaperOrder> {
    return apiClient.post<PaperOrder>('/orders', data);
  },

  /**
   * Cancel pending order
   */
  async cancelOrder(orderId: string): Promise<PaperOrder> {
    return apiClient.post<PaperOrder>(`/orders/${orderId}/cancel`);
  },

  /**
   * List executed paper trades
   */
  async getTrades(params?: { symbol?: string; side?: string; limit?: number }): Promise<PaperTrade[]> {
    const query = new URLSearchParams();
    if (params?.symbol) query.append('symbol', params.symbol);
    if (params?.side) query.append('side', params.side);
    if (params?.limit) query.append('limit', params.limit.toString());

    const qs = query.toString();
    const endpoint = qs ? `/trades?${qs}` : '/trades';
    return apiClient.get<PaperTrade[]>(endpoint);
  },

  /**
   * Fetch single trade by ID
   */
  async getTrade(tradeId: string): Promise<PaperTrade> {
    return apiClient.get<PaperTrade>(`/trades/${tradeId}`);
  }
};
