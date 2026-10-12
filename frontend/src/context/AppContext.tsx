import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  Portfolio,
  Holding,
  Transaction,
  NotificationItem,
  Recommendation,
  Report,
  AIInsight,
  UserProfile,
  SystemHealthMetrics,
  PaperAccount
} from '../types';
import { portfolioService } from '../services/portfolioService';
import { advisorService } from '../services/advisorService';
import { tradingService } from '../services/tradingService';
import { apiClient, getAuthToken, clearAuthToken, ApiError } from '../services/apiClient';

export const EMPTY_PORTFOLIO: Portfolio = {
  id: '',
  name: 'No Portfolio Selected',
  objective: 'None',
  riskPreference: 'Moderate',
  description: 'No active portfolio found. Create a new portfolio to begin.',
  totalValue: 0,
  investedCapital: 0,
  profitLoss: 0,
  returnPercentage: 0,
  riskScore: 0,
  riskLevel: 'Low',
  diversificationScore: 0,
  diversificationLevel: 'Low',
  sectorAllocation: [],
  assetAllocation: [],
  holdings: [],
  transactions: [],
  createdAt: new Date().toISOString().split('T')[0],
};

interface AppContextType {
  user: UserProfile;
  portfolios: Portfolio[];
  selectedPortfolioId: string;
  selectedPortfolio: Portfolio;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  notifications: NotificationItem[];
  recommendations: Recommendation[];
  reports: Report[];
  aiInsights: AIInsight[];
  systemHealth: SystemHealthMetrics;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  setSelectedPortfolioId: (id: string) => void;
  refreshPortfolios: () => Promise<void>;
  createPortfolio: (data: { name: string; objective: string; riskPreference: string; description: string }) => Promise<Portfolio>;
  deletePortfolio: (id: string) => Promise<void>;
  addHolding: (portfolioId: string, holding: Partial<Holding>) => Promise<void>;
  updateHolding: (portfolioId: string, holdingId: string, updates: Partial<Holding>) => Promise<void>;
  deleteHolding: (portfolioId: string, holdingId: string) => Promise<void>;
  addTransaction: (portfolioId: string, transaction: Partial<Transaction>) => Promise<void>;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  askAIAdvisor: (query: string) => Promise<AIInsight>;
  updateUserSettings: (settings: Partial<UserProfile>) => void;
  resetToDemoData: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_PREFS_KEY = 'capitalmind_prefs_v1';

const DEFAULT_GUEST_USER: UserProfile = {
  name: "Guest Investor",
  email: "",
  role: "Retail Investor",
  accountCreated: "",
  portfolioCount: 0,
  mfaEnabled: false,
  currency: "INR (₹)",
  aiInsightsEnabled: true,
  emailAlerts: false,
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_PREFS_KEY + '_user');
    return saved ? JSON.parse(saved) : DEFAULT_GUEST_USER;
  });

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_PREFS_KEY + '_selected_id') || '';
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getAuthToken());

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_PREFS_KEY + '_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthMetrics>({
    apiStatus: 'Operational',
    dbStatus: 'Operational',
    aiServiceStatus: 'Operational',
    marketDataStatus: 'Operational',
    totalUsers: 0,
    activeUsers: 0,
    totalPortfolios: 0,
    aiRequests24h: 0,
    apiRequests24h: 0,
    systemErrors24h: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync non-portfolio preferences to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_PREFS_KEY + '_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    if (selectedPortfolioId) {
      localStorage.setItem(LOCAL_STORAGE_PREFS_KEY + '_selected_id', selectedPortfolioId);
    }
  }, [selectedPortfolioId]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_PREFS_KEY + '_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Load portfolios from backend API
  const refreshPortfolios = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await portfolioService.getPortfolios();
      setPortfolios(data);
      if (data.length > 0) {
        setSelectedPortfolioId(prev => {
          if (prev && data.some(p => p.id === prev)) {
            return prev;
          }
          return data[0].id;
        });
      } else {
        setSelectedPortfolioId('');
      }
      setUser(prev => ({ ...prev, portfolioCount: data.length }));
    } catch (err: any) {
      console.error('Failed to fetch portfolios from backend:', err);
      if (err instanceof ApiError && err.status === 401) {
        setIsAuthenticated(false);
        setError('Session expired or unauthorized. Please sign in.');
      } else {
        setError(err.message || 'Unable to connect to FastAPI backend');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check auth and bootstrap user & portfolios on mount
  useEffect(() => {
    const initApp = async () => {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        setIsAuthenticated(false);
        return;
      }

      setIsLoading(true);
      try {
        // Verify current user with /api/auth/me
        const authUser = await apiClient.getMe();
        setIsAuthenticated(true);
        setUser(prev => ({
          ...prev,
          name: authUser.name || prev.name,
          email: authUser.email || prev.email,
          role: (authUser.role as any) || prev.role,
        }));
        await refreshPortfolios();
      } catch (err: any) {
        console.warn('Authentication token verification failed:', err);
        clearAuthToken();
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    initApp();

    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setError('Session expired. Please log in again.');
    };

    window.addEventListener('capitalmind:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('capitalmind:unauthorized', handleUnauthorized);
    };
  }, [refreshPortfolios]);

  // Selected portfolio with fallback to empty structure
  const selectedPortfolio: Portfolio =
    portfolios.find(p => p.id === selectedPortfolioId) ||
    portfolios[0] ||
    EMPTY_PORTFOLIO;

  // Login handler
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.login(email, password);
      setIsAuthenticated(true);
      setUser(res.user);
      await refreshPortfolios();
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Register handler
  const register = async (email: string, password: string, fullName: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.register(email, password, fullName);
      setIsAuthenticated(true);
      setUser(res.user);
      await refreshPortfolios();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const logout = (): void => {
    apiClient.logout();
    setIsAuthenticated(false);
    setPortfolios([]);
    setSelectedPortfolioId('');
    localStorage.removeItem(LOCAL_STORAGE_PREFS_KEY + '_selected_id');
  };

  // Portfolio creation
  const createPortfolio = async (data: {
    name: string;
    objective: string;
    riskPreference: string;
    description: string;
  }): Promise<Portfolio> => {
    setIsLoading(true);
    setError(null);
    try {
      const newPortfolio = await portfolioService.createPortfolio(data);
      setPortfolios(prev => [...prev, newPortfolio]);
      setSelectedPortfolioId(newPortfolio.id);
      setUser(prev => ({ ...prev, portfolioCount: prev.portfolioCount + 1 }));

      const newNotif: NotificationItem = {
        id: `n_${Date.now()}`,
        title: 'Portfolio Created',
        message: `Created portfolio '${data.name}' with objective '${data.objective}'.`,
        category: 'Portfolio',
        timestamp: 'Just now',
        isRead: false,
        link: `/portfolio/${newPortfolio.id}`,
      };
      setNotifications(prev => [newNotif, ...prev]);

      return newPortfolio;
    } catch (err: any) {
      setError(err.message || 'Failed to create portfolio');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Portfolio deletion
  const deletePortfolio = async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await portfolioService.deletePortfolio(id);
      setPortfolios(prev => {
        const remaining = prev.filter(p => p.id !== id);
        if (selectedPortfolioId === id) {
          setSelectedPortfolioId(remaining[0]?.id || '');
        }
        return remaining;
      });
      setUser(prev => ({ ...prev, portfolioCount: Math.max(0, prev.portfolioCount - 1) }));

      const newNotif: NotificationItem = {
        id: `n_${Date.now()}`,
        title: 'Portfolio Deleted',
        message: `Portfolio ${id} was successfully removed.`,
        category: 'Portfolio',
        timestamp: 'Just now',
        isRead: false,
      };
      setNotifications(prev => [newNotif, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to delete portfolio');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Holdings operations
  const addHolding = async (portfolioId: string, holdingData: Partial<Holding>): Promise<void> => {
    setError(null);
    try {
      const updated = await portfolioService.addHolding(portfolioId, holdingData);
      setPortfolios(prev => prev.map(p => (p.id === portfolioId ? updated : p)));

      const newNotif: NotificationItem = {
        id: `n_${Date.now()}`,
        title: 'Holding Added',
        message: `Added ${holdingData.quantity} shares of ${holdingData.symbol} to portfolio.`,
        category: 'Portfolio',
        timestamp: 'Just now',
        isRead: false,
        link: '/holdings',
      };
      setNotifications(prev => [newNotif, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to add holding');
      throw err;
    }
  };

  const updateHolding = async (
    portfolioId: string,
    holdingId: string,
    updates: Partial<Holding>
  ): Promise<void> => {
    setError(null);
    try {
      const updated = await portfolioService.updateHolding(portfolioId, holdingId, updates);
      setPortfolios(prev => prev.map(p => (p.id === portfolioId ? updated : p)));
    } catch (err: any) {
      setError(err.message || 'Failed to update holding');
      throw err;
    }
  };

  const deleteHolding = async (portfolioId: string, holdingId: string): Promise<void> => {
    setError(null);
    try {
      const updated = await portfolioService.deleteHolding(portfolioId, holdingId);
      setPortfolios(prev => prev.map(p => (p.id === portfolioId ? updated : p)));
    } catch (err: any) {
      setError(err.message || 'Failed to delete holding');
      throw err;
    }
  };

  // Transactions operations
  const addTransaction = async (
    portfolioId: string,
    txData: Partial<Transaction>
  ): Promise<void> => {
    setError(null);
    try {
      const updated = await portfolioService.addTransaction(portfolioId, txData);
      setPortfolios(prev => prev.map(p => (p.id === portfolioId ? updated : p)));

      const newNotif: NotificationItem = {
        id: `n_${Date.now()}`,
        title: 'Transaction Recorded',
        message: `${txData.type || 'BUY'} ${txData.quantity} ${txData.symbol} @ ₹${txData.price}`,
        category: 'Portfolio',
        timestamp: 'Just now',
        isRead: false,
        link: '/transactions',
      };
      setNotifications(prev => [newNotif, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to record transaction');
      throw err;
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const askAIAdvisor = async (query: string): Promise<AIInsight> => {
    try {
      if (selectedPortfolio && selectedPortfolio.id) {
        const insight = await apiClient.askAIAdvisor(selectedPortfolio.id, query);
        setAiInsights(prev => [insight, ...prev]);
        return insight;
      }
    } catch (err) {
      console.warn('AI Advisor API call failed, falling back to local insight engine:', err);
    }
    const fallbackInsight = advisorService.generateInsight(selectedPortfolio, query);
    setAiInsights(prev => [fallbackInsight, ...prev]);
    return fallbackInsight;
  };

  const updateUserSettings = (settings: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...settings }));
  };

  const resetToDemoData = async () => {
    localStorage.clear();
    setUser(DEFAULT_GUEST_USER);
    setNotifications([]);
    setRecommendations([]);
    setReports([]);
    setAiInsights([]);
    await refreshPortfolios();
  };

  return (
    <AppContext.Provider
      value={{
        user,
        portfolios,
        selectedPortfolioId,
        selectedPortfolio,
        isLoading,
        error,
        isAuthenticated,
        notifications,
        recommendations,
        reports,
        aiInsights,
        systemHealth,
        searchQuery,
        setSearchQuery,
        isSearchOpen,
        setIsSearchOpen,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        setSelectedPortfolioId,
        refreshPortfolios,
        createPortfolio,
        deletePortfolio,
        addHolding,
        updateHolding,
        deleteHolding,
        addTransaction,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        askAIAdvisor,
        updateUserSettings,
        resetToDemoData,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
