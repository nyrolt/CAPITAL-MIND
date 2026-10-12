import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, ChevronDown, Menu, User, Settings, LogOut, Briefcase } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface TopHeaderProps {
  pageTitle?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ pageTitle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    portfolios,
    selectedPortfolioId,
    setSelectedPortfolioId,
    notifications,
    setIsSearchOpen,
    setIsMobileMenuOpen,
    logout
  } = useApp();

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isPortfolioDropdownOpen, setIsPortfolioDropdownOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const currentPortfolio = portfolios.find(p => p.id === selectedPortfolioId) || portfolios[0];

  const getTitle = () => {
    if (pageTitle) return pageTitle;
    const path = location.pathname;
    if (path.includes('dashboard')) return 'Portfolio Overview';
    if (path.includes('portfolios')) return 'My Portfolios';
    if (path.includes('portfolio/')) return 'Portfolio Details';
    if (path.includes('holdings')) return 'Investment Holdings';
    if (path.includes('transactions')) return 'Transaction Ledger';
    if (path.includes('analytics')) return 'Portfolio Analytics';
    if (path.includes('risk')) return 'Risk Intelligence Analysis';
    if (path.includes('diversification')) return 'Diversification Breakdown';
    if (path.includes('learn')) return 'Learn';
    if (path.includes('ai-advisor')) return 'CapitalMind AI Advisor';
    if (path.includes('recommendations')) return 'Actionable Recommendations';
    if (path.includes('reports')) return 'Reports & Audits';
    if (path.includes('notifications')) return 'Notification Center';
    if (path.includes('profile')) return 'User Profile';
    if (path.includes('settings')) return 'Account Settings';
    if (path.includes('admin')) return 'System Administration';
    return 'CapitalMind';
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 md:px-8 bg-white/80 backdrop-blur-md border-b border-silver-border">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-muted rounded-xl lg:hidden hover:text-graphite hover:bg-silver-light"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base md:text-lg font-bold text-graphite tracking-tight">
            {getTitle()}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Portfolio Selector */}
        <div className="relative">
          <button
            onClick={() => setIsPortfolioDropdownOpen(!isPortfolioDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-graphite bg-silver-light/80 hover:bg-silver border border-silver-border rounded-xl transition-all shadow-silver-sm"
          >
            <Briefcase className="w-3.5 h-3.5 text-muted shrink-0" />
            <span className="hidden sm:inline text-muted font-normal">Portfolio:</span>
            <span className="font-semibold truncate max-w-[120px] md:max-w-[160px]">
              {currentPortfolio?.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0" />
          </button>

          {isPortfolioDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-silver-border rounded-2xl shadow-silver-lg py-2 z-40 animate-fadeIn">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-wider">
                Select Active Portfolio
              </div>
              {portfolios.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPortfolioId(p.id);
                    setIsPortfolioDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 text-xs text-left transition-colors ${
                    p.id === selectedPortfolioId
                      ? 'bg-silver-light font-semibold text-graphite border-l-2 border-graphite'
                      : 'text-muted hover:text-graphite hover:bg-silver-light/50'
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-[11px] text-muted">₹{(p.totalValue / 1000).toFixed(1)}k</span>
                </button>
              ))}
              <div className="border-t border-silver-border mt-1 pt-1 px-2">
                <button
                  onClick={() => {
                    setIsPortfolioDropdownOpen(false);
                    navigate('/portfolios');
                  }}
                  className="w-full text-center py-1.5 text-xs text-graphite font-semibold hover:bg-silver-light rounded-lg"
                >
                  + Create / Manage Portfolios
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Global Search Trigger */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted bg-silver-light/60 hover:bg-silver border border-silver-border rounded-xl transition-colors"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">Search assets, holdings...</span>
          <kbd className="hidden md:inline px-1.5 py-0.5 text-[9px] bg-white border border-silver-border rounded font-mono">⌘K</kbd>
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-muted rounded-xl hover:text-graphite hover:bg-silver-light transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-financial-negative ring-2 ring-white"></span>
          )}
        </button>

        {/* User Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-silver-light transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-silver-dark to-platinum text-graphite font-bold text-xs flex items-center justify-center border border-silver-border shadow-silver-sm">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-graphite">
              {user.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted hidden sm:inline" />
          </button>

          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-silver-border rounded-2xl shadow-silver-lg py-2 z-40 animate-fadeIn">
              <div className="px-4 py-2 border-b border-silver-border">
                <p className="text-xs font-bold text-graphite">{user.name}</p>
                <p className="text-[11px] text-muted truncate">{user.email}</p>
              </div>
              <button
                onClick={() => { setIsUserDropdownOpen(false); navigate('/profile'); }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-xs text-muted hover:text-graphite hover:bg-silver-light"
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile</span>
              </button>
              <button
                onClick={() => { setIsUserDropdownOpen(false); navigate('/settings'); }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-xs text-muted hover:text-graphite hover:bg-silver-light"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
              <div className="border-t border-silver-border my-1"></div>
              <button
                onClick={() => {
                  setIsUserDropdownOpen(false);
                  logout();
                  navigate('/login');
                }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-xs text-financial-negative hover:bg-financial-negativeBg"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

