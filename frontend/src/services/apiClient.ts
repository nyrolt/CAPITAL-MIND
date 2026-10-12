import {
  Portfolio,
  Holding,
  Transaction,
  AIInsight,
  Recommendation,
  Report,
  NotificationItem,
  SystemHealthMetrics,
  UserProfile,
  PortfolioHistoryPoint
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const TOKEN_KEY = 'capitalmind_access_token';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

const getHeaders = (customHeaders?: HeadersInit): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string> || {}),
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const resolveUrl = (endpoint: string): string => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (cleanBase.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.substring(4);
  }
  return `${cleanBase}${cleanEndpoint}`;
};

async function executeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = resolveUrl(endpoint);
  const headers = getHeaders(options.headers);

  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
    body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body,
    });
  } catch (netErr: any) {
    throw new ApiError(
      `Network error connecting to backend: ${netErr.message || 'Server unavailable'}`,
      0
    );
  }

  if (response.status === 401) {
    clearAuthToken();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('capitalmind:unauthorized'));
    }
    let detail = 'Session expired or unauthorized. Please sign in again.';
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) detail = errJson.detail;
    } catch {
      // ignore
    }
    throw new ApiError(detail, 401);
  }

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
    let errorData: any = null;
    try {
      errorData = await response.json();
      if (errorData && errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData && errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // ignore
    }
    throw new ApiError(errorMessage, response.status, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }

  return (await response.text()) as unknown as T;
}

export const apiClient = {
  // Generic request methods
  async get<T>(endpoint: string, headers?: HeadersInit): Promise<T> {
    return executeRequest<T>(endpoint, { method: 'GET', headers });
  },

  async post<T>(endpoint: string, body?: any, headers?: HeadersInit): Promise<T> {
    return executeRequest<T>(endpoint, { method: 'POST', body, headers });
  },

  async put<T>(endpoint: string, body?: any, headers?: HeadersInit): Promise<T> {
    return executeRequest<T>(endpoint, { method: 'PUT', body, headers });
  },

  async delete<T>(endpoint: string, headers?: HeadersInit): Promise<T> {
    return executeRequest<T>(endpoint, { method: 'DELETE', headers });
  },

  // Authentication endpoints
  async login(email: string, password: string): Promise<{ access_token: string; user: UserProfile }> {
    const data = await this.post<{ access_token: string; token_type: string; user: any }>('/auth/login', {
      email,
      password,
    });
    setAuthToken(data.access_token);
    return {
      access_token: data.access_token,
      user: {
        name: data.user.name || 'Investor',
        email: data.user.email,
        role: data.user.role || 'Retail Investor',
        accountCreated: '14 Jan 2024',
        portfolioCount: 1,
        mfaEnabled: true,
        currency: 'INR (₹)',
        aiInsightsEnabled: true,
        emailAlerts: true,
      },
    };
  },

  async register(email: string, password: string, full_name: string): Promise<{ access_token: string; user: UserProfile }> {
    const data = await this.post<{ access_token: string; token_type: string; user: any }>('/auth/register', {
      email,
      password,
      full_name,
    });
    setAuthToken(data.access_token);
    return {
      access_token: data.access_token,
      user: {
        name: data.user.name || full_name,
        email: data.user.email,
        role: data.user.role || 'Retail Investor',
        accountCreated: 'Today',
        portfolioCount: 0,
        mfaEnabled: true,
        currency: 'INR (₹)',
        aiInsightsEnabled: true,
        emailAlerts: true,
      },
    };
  },

  async getMe(): Promise<{ user_id: string; email: string; name: string; role: string; auth_mode: string }> {
    return await this.get('/auth/me');
  },

  logout(): void {
    clearAuthToken();
  },

  // Portfolio endpoints
  async fetchPortfolios(): Promise<Portfolio[]> {
    return await this.get<Portfolio[]>('/portfolio');
  },

  async fetchPortfolio(id: string): Promise<Portfolio> {
    return await this.get<Portfolio>(`/portfolio/${id}`);
  },

  async fetchPortfolioHistory(id: string, timeframe: string = '1M'): Promise<PortfolioHistoryPoint[]> {
    return await this.get<PortfolioHistoryPoint[]>(`/portfolio/${id}/history?timeframe=${timeframe}`);
  },

  async createPortfolio(data: { name: string; objective: string; riskPreference: string; description?: string }): Promise<Portfolio> {
    return await this.post<Portfolio>('/portfolio', {
      name: data.name,
      objective: data.objective,
      riskPreference: data.riskPreference,
      description: data.description || '',
    });
  },

  async deletePortfolio(id: string): Promise<{ message: string }> {
    return await this.delete<{ message: string }>(`/portfolio/${id}`);
  },

  // Holdings endpoints
  async fetchHoldings(portfolioId: string): Promise<Holding[]> {
    return await this.get<Holding[]>(`/portfolio/${portfolioId}/holdings`);
  },

  async addHolding(portfolioId: string, holding: Partial<Holding>): Promise<Portfolio> {
    return await this.post<Portfolio>(`/portfolio/${portfolioId}/holdings`, {
      symbol: holding.symbol,
      name: holding.name || holding.symbol,
      assetType: holding.assetType || 'Stock',
      quantity: holding.quantity,
      avgPrice: holding.avgPrice,
      sector: holding.sector || 'General',
    });
  },

  async updateHolding(portfolioId: string, holdingId: string, updates: Partial<Holding>): Promise<Portfolio> {
    return await this.put<Portfolio>(`/portfolio/${portfolioId}/holdings/${holdingId}`, updates);
  },

  async deleteHolding(portfolioId: string, holdingId: string): Promise<Portfolio> {
    return await this.delete<Portfolio>(`/portfolio/${portfolioId}/holdings/${holdingId}`);
  },

  // Transactions endpoints
  async fetchTransactions(portfolioId: string): Promise<Transaction[]> {
    return await this.get<Transaction[]>(`/portfolio/${portfolioId}/transactions`);
  },

  async addTransaction(portfolioId: string, tx: Partial<Transaction>): Promise<Portfolio> {
    return await this.post<Portfolio>(`/portfolio/${portfolioId}/transactions`, {
      symbol: tx.symbol,
      assetName: tx.assetName || tx.symbol,
      type: tx.type || 'BUY',
      quantity: tx.quantity,
      price: tx.price,
      date: tx.date,
    });
  },

  // Analytics, Risk, Advisor & Intelligence
  async getPortfolioAnalytics(portfolioId: string): Promise<any> {
    return await this.get<any>(`/analytics/portfolio/${portfolioId}`);
  },

  async getRiskAssessment(portfolioId: string): Promise<any> {
    return await this.get<any>(`/risk/portfolio/${portfolioId}`);
  },

  async askAIAdvisor(portfolioId: string, query: string): Promise<AIInsight> {
    return await this.post<AIInsight>(`/advisor/portfolio/${portfolioId}/insight`, { query });
  },

  async getRecommendations(portfolioId: string): Promise<Recommendation[]> {
    return await this.get<Recommendation[]>(`/recommendations/${portfolioId}`);
  },

  async generateReport(portfolioId: string): Promise<Report> {
    return await this.post<Report>(`/reports/${portfolioId}`);
  },

  async fetchNotifications(): Promise<NotificationItem[]> {
    return await this.get<NotificationItem[]>('/notifications');
  },

  async getSystemHealth(): Promise<SystemHealthMetrics> {
    return await this.get<SystemHealthMetrics>('/admin/health');
  },
};
