export type AssetType = 'Stock' | 'Mutual Fund' | 'Cash' | 'Gold' | 'Bond' | 'Equity' | 'ETF' | 'Bond/Debt' | string;

export type RiskLevel = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High' | 'Insufficient data';
export type DiversificationLevel = 'Low' | 'Moderate' | 'High' | 'Insufficient data';

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  profitLoss: number;
  returnPercentage: number;
  allocationPercentage: number;
  sector: string;
  unrealizedProfitLoss?: number;
  realizedProfitLoss?: number;
  priceSource?: string;
  isRealTime?: boolean;
  isPriceStale?: boolean;
  priceWarning?: string;
  lastPriceUpdate?: string;
  instrument_key?: string;
  instrumentKey?: string;
  exchange?: string;
  isin?: string;
}

export interface LiveMarketTick {
  instrument_key: string;
  symbol: string;
  name?: string;
  exchange: string;
  segment: string;
  asset_type: 'EQUITY' | 'ETF' | 'INDEX' | 'BOND' | 'FUND' | 'DERIVATIVE';
  ltp: number;
  previous_close: number;
  change: number;
  change_percent: number;
  open?: number;
  high?: number;
  low?: number;
  day_open?: number;
  day_high?: number;
  day_low?: number;
  volume?: number;
  timestamp: number;
  bid?: number;
  ask?: number;
  bid_quantity?: number;
  ask_quantity?: number;
  market_status: string;
  source: 'UPSTOX' | 'MOCK';
}

export interface MarketProviderStatus {
  provider: string;
  mode: 'live' | 'mock';
  connected: boolean;
  state: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'SUBSCRIBED' | 'RECONNECTING' | 'STOPPED';
  market_data_enabled: boolean;
  is_upstox_live?: boolean;
  subscribed_instruments: number;
  cached_instruments: number;
  market_status: string;
  last_update?: string;
}

export interface Transaction {
  id: string;
  date: string;
  symbol: string;
  assetName: string;
  type: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL';
  quantity: number;
  price: number;
  totalValue: number;
  portfolioId: string;
  fee?: number;
  realizedProfitLoss?: number;
}

export interface SectorAllocation {
  sector: string;
  percentage: number;
  value: number;
}

export interface AssetClassAllocation {
  assetType: AssetType;
  percentage: number;
  value: number;
}

export interface PortfolioHistoryPoint {
  date: string;
  formatted_date: string;
  portfolioValue: number;
  periodReturnPercentage: number;
  /** True if captured at market close (EOD) */
  isEod?: boolean;
  /** True if back-filled from transaction history rather than live price */
  isReconstructed?: boolean;
  /** 'complete' | 'partial' | 'error' */
  status?: string;
  /** 'live' | 'eod' | 'stale' | 'partial' | 'cached' */
  priceSource?: string;
}

export interface Portfolio {
  id: string;
  name: string;
  objective: string;
  riskPreference: string;
  description: string;
  totalValue: number;
  investedCapital: number;
  profitLoss: number;
  returnPercentage: number;
  unrealizedProfitLoss?: number;
  realizedProfitLoss?: number;
  totalProfitLoss?: number;
  returnOnCost?: number;
  totalReturnPercentage?: number;
  cashBalance?: number;
  securitiesValue?: number;
  riskScore: number | null;
  riskLevel: RiskLevel;
  diversificationScore: number | null;
  diversificationLevel: DiversificationLevel;
  sectorAllocation: SectorAllocation[];
  assetAllocation: AssetClassAllocation[];
  holdings: Holding[];
  transactions: Transaction[];
  createdAt: string;
}

export type RiskFactorStatus = 'Low' | 'Moderate' | 'High' | 'Insufficient data';

export interface RiskFactor {
  id: string;
  name: string;
  score: number;
  status: RiskFactorStatus;
  explanation: string;
}

export interface DiversificationMetrics {
  score: number | null;
  level: DiversificationLevel;
  hhiIndex: number;
  hhiExplanation: string;
  assetDiversificationScore: number | null;
  sectorDiversificationScore: number | null;
  topHoldingConcentration: number;
}

export interface PortfolioRiskAssessment {
  portfolioId: string;
  portfolioName: string;
  riskScore: number | null;
  riskLevel: RiskLevel;
  diversificationScore: number | null;
  diversificationLevel: DiversificationLevel;
  /** ISO-8601 UTC timestamp when this assessment was computed */
  calculatedAt?: string;
  /** Human-readable warning when prices are stale or data is incomplete */
  dataQualityWarning?: string;
  riskFactors: RiskFactor[];
  diversificationMetrics: DiversificationMetrics;
}

export interface AIInsight {
  id: string;
  portfolioId: string;
  query?: string;
  portfolioSummary: string;
  riskObservation: string;
  diversificationObservation: string;
  recommendation: string;
  priority: 'Low' | 'Medium' | 'High';
  timestamp: string;
  category: string;
  isLiveAI?: boolean;
  modelName?: string;
}

export interface Recommendation {
  id: string;
  category: 'Diversification' | 'Risk' | 'Concentration' | 'Sector Concentration' | 'Performance' | 'Portfolio Structure';
  severity: 'High' | 'Medium' | 'Low';
  title: string;
  recommendation: string;
  explanation: string;
  createdDate: string;
  portfolioId: string;
}

export interface Report {
  id: string;
  title: string;
  type: 'Portfolio Performance Report' | 'Risk Analysis Report' | 'Diversification Report' | 'AI Advisory Report';
  date: string;
  portfolioId: string;
  portfolioName: string;
  summaryText: string;
  fileSize: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'Risk' | 'Portfolio' | 'AI' | 'System';
  timestamp: string;
  isRead: boolean;
  link?: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: 'Retail Investor' | 'Admin' | 'Advisor';
  accountCreated: string;
  portfolioCount: number;
  mfaEnabled: boolean;
  currency: string;
  aiInsightsEnabled: boolean;
  emailAlerts: boolean;
}

export interface SystemHealthMetrics {
  apiStatus: 'Operational' | 'Degraded' | 'Offline';
  dbStatus: 'Operational' | 'Degraded' | 'Offline';
  aiServiceStatus: 'Operational' | 'Degraded' | 'Offline';
  marketDataStatus: 'Operational' | 'Degraded' | 'Offline';
  totalUsers: number;
  activeUsers: number;
  activeSessions?: number;
  totalPortfolios: number;
  aiRequests24h: number;
  apiRequests24h: number;
  systemErrors24h: number;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  company_name?: string;
  isin?: string;
  exchange: string;
  sector: string;
  industry?: string;
  current_price: number;
  day_change: number;
  day_change_percentage: number;
  data_source: 'mock' | 'real' | 'cached_database' | string;
  is_real_time: boolean;
  last_updated?: string;
}

export interface StockQuote {
  symbol: string;
  company_name: string;
  exchange: string;
  isin?: string;
  current_price: number;
  previous_close: number;
  day_open: number;
  day_high: number;
  day_low: number;
  volume: number;
  day_change: number;
  day_change_percentage: number;
  currency?: string;
  data_source: string;
  is_real_time: boolean;
  provider?: string;
  disclaimer?: string;
  last_updated: string;
}

export interface StockDetails extends StockQuote {
  sector: string;
  industry: string;
  instrument_type: string;
  market_cap?: number;
  pe_ratio?: number;
  week_52_high?: number;
  week_52_low?: number;
  is_active?: boolean;
}

export interface StockHistoryPoint {
  timestamp: string;
  formatted_date: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketStatus {
  market: string;
  timezone: string;
  current_time_ist: string;
  status: 'OPEN' | 'CLOSED';
  session: string;
  trading_hours: string;
  indices: Record<string, { current: number; change: number; change_pct: number }>;
  data_source: string;
  is_real_time: boolean;
  disclaimer: string;
}

export interface Watchlist {
  id: string;
  name: string;
  userId: string;
  symbols: string[];
  items: StockQuote[];
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// Phase C: Paper Trading Types
// ============================================================

export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
export type OrderType = 'MARKET';

export interface CreateOrderRequest {
  symbol: string;
  side: OrderSide;
  quantity: number;
  order_type?: OrderType;
  client_order_id?: string;
}

export interface PaperOrder {
  order_id: string;
  user_id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  order_type: OrderType;
  status: OrderStatus;
  requested_price: number;
  executed_price: number;
  total_value: number;
  client_order_id?: string;
  rejection_reason?: string;
  trade_id?: string;
  updated_cash?: number;
  created_at?: string;
  filled_at?: string;
  data_source: string;
  is_paper_trade: boolean;
  is_duplicate?: boolean;
  notice: string;
}

export interface PaperTrade {
  trade_id: string;
  order_id: string;
  user_id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  execution_price: number;
  total_value: number;
  executed_at?: string;
  data_source: string;
  is_paper_trade: boolean;
  notice: string;
}

export interface PaperAccount {
  account_id: string;
  user_id: string;
  initial_cash: number;
  available_cash: number;
  invested_value: number;
  portfolio_value: number;
  total_value: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_pnl: number;
  currency: string;
  is_paper_trading: boolean;
  notice: string;
}

export interface PaperHoldingItem {
  symbol: string;
  company_name: string;
  quantity: number;
  average_price: number;
  current_price: number;
  cost_basis: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percentage: number;
  sector?: string;
}

export interface PaperPosition extends PaperHoldingItem {
  id?: string;
  sector?: string;
  updated_at?: string;
}

export interface PaperPortfolio {
  account_id: string;
  cash: number;
  invested_value: number;
  market_value: number;
  total_value: number;
  cost_basis: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_pnl: number;
  holdings: PaperHoldingItem[];
  is_paper_trading: boolean;
  notice: string;
}

export type ImpactDirection = 'POSITIVE' | 'NEGATIVE' | 'MIXED' | 'NEUTRAL' | 'UNCERTAIN';
export type AnalysisStatus = 'PENDING' | 'ANALYZED' | 'FAILED' | 'RATE_LIMITED' | 'SIMULATED';

export interface GeminiImpactAnalysis {
  impact_direction: ImpactDirection;
  reasoning: string;
  confidence: number;
  uncertainty: string;
  directly_mentioned: string[];
  sectors: string[];
  stocks: string[];
  time_horizon: 'INTRADAY' | 'SHORT_TERM' | 'LONG_TERM' | 'UNKNOWN';
  analysis_source: string;
}

export interface NewsArticleItem {
  id: string;
  provider: string;
  headline: string;
  summary?: string;
  source: string;
  canonical_url: string;
  published_at: string;
  retrieved_at: string;
  category: string;
  related_sectors: string[];
  related_stocks: string[];
  analysis?: GeminiImpactAnalysis;
  analysis_source?: string;
  analysis_status: AnalysisStatus;
  analyzed_at?: string;
}

export interface NewsListResult {
  items: NewsArticleItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface NewsStatusResult {
  ingestion_enabled: boolean;
  gemini_enabled: boolean;
  gemini_model: string;
  total_articles: number;
  analyzed_articles: number;
  pending_articles: number;
  failed_articles: number;
  last_ingestion_time?: string;
}

