import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';

// Import Pages
import { LandingPage } from './pages/Landing/LandingPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { OnboardingPage } from './pages/Onboarding/OnboardingPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { PortfoliosPage } from './pages/Portfolio/PortfoliosPage';
import { PortfolioDetailPage } from './pages/Portfolio/PortfolioDetailPage';
import { HoldingsPage } from './pages/Holdings/HoldingsPage';
import { TransactionsPage } from './pages/Transactions/TransactionsPage';
import { AnalyticsPage } from './pages/Analytics/AnalyticsPage';
import { RiskAnalysisPage } from './pages/Risk/RiskAnalysisPage';
import { DiversificationPage } from './pages/Diversification/DiversificationPage';
import { LearnPage } from './pages/Learn/LearnPage';
import { LessonDetailPage } from './pages/Learn/LessonDetailPage';
import { AIAdvisorPage } from './pages/AIAdvisor/AIAdvisorPage';
import { RecommendationsPage } from './pages/Recommendations/RecommendationsPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { NotificationsPage } from './pages/Notifications/NotificationsPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { AdminPage } from './pages/Admin/AdminPage';
import { AdminRoute } from './components/auth/AdminRoute';
import { StockDetailPage } from './pages/Stocks/StockDetailPage';
import { WatchlistPage } from './pages/Watchlist/WatchlistPage';
import { OrdersPage } from './pages/Trading/OrdersPage';
import { TradesPage } from './pages/Trading/TradesPage';
import { PaperTradingPage } from './pages/Trading/PaperTradingPage';
import { NewsPage } from './pages/News/NewsPage';

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public & Auth Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/portfolios" element={<PortfoliosPage />} />
          <Route path="/portfolio/:id" element={<PortfolioDetailPage />} />
          <Route path="/holdings" element={<HoldingsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/paper-trading" element={<PaperTradingPage />} />
          <Route path="/trading" element={<Navigate to="/paper-trading" replace />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/risk" element={<RiskAnalysisPage />} />
          <Route path="/diversification" element={<DiversificationPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/learn/:lessonId" element={<LessonDetailPage />} />
          <Route path="/ai-advisor" element={<AIAdvisorPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/stocks/:symbol" element={<StockDetailPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/trades" element={<TradesPage />} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;

