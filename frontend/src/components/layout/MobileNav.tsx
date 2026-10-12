import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  X,
  LayoutDashboard,
  Briefcase,
  Layers,
  Receipt,
  BarChart3,
  ShieldAlert,
  Sparkles,
  Lightbulb,
  FileSpreadsheet,
  Bell,
  User,
  Settings,
  ShieldCheck,
  LogOut,
  Star,
  History,
  TrendingUp,
  BookOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MobileNav: React.FC = () => {
  const navigate = useNavigate();
  const { user, isMobileMenuOpen, setIsMobileMenuOpen, notifications, logout } = useApp();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!isMobileMenuOpen) return null;

  const mainNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Watchlist', path: '/watchlist', icon: Star },
    { name: 'My Portfolios', path: '/portfolios', icon: Briefcase },
    { name: 'Holdings', path: '/holdings', icon: Layers },
    { name: 'Transactions', path: '/transactions', icon: Receipt },
    { name: 'Paper Trading', path: '/paper-trading', icon: TrendingUp, badge: 'SIM' },
    { name: 'Paper Trades', path: '/trades', icon: History },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Risk Analysis', path: '/risk', icon: ShieldAlert },
    { name: 'Learn', path: '/learn', icon: BookOpen },
    { name: 'AI Advisor', path: '/ai-advisor', icon: Sparkles, badge: 'AI' },
    { name: 'Recommendations', path: '/recommendations', icon: Lightbulb },
    { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
    { name: 'Notifications', path: '/notifications', icon: Bell, count: unreadCount },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
    ...(user?.role === 'Admin' ? [{ name: 'Admin', path: '/admin', icon: ShieldCheck }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden bg-graphite/50 backdrop-blur-sm">
      <div className="w-4/5 max-w-xs bg-white h-full flex flex-col shadow-silver-lg border-r border-silver-border animate-slideRight">
        <div className="flex items-center justify-between p-4 border-b border-silver-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-graphite text-white font-bold flex items-center justify-center text-sm">
              C
            </div>
            <span className="font-bold text-sm text-graphite">CapitalMind</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1 rounded-lg text-muted hover:bg-silver-light"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {mainNavItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium ${
                    isActive
                      ? 'bg-silver-light text-graphite font-bold border border-silver-dark/30'
                      : 'text-muted hover:bg-silver-light'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-graphite text-white rounded">
                    {item.badge}
                  </span>
                )}
                {item.count !== undefined && item.count > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-financial-negative text-white rounded-full">
                    {item.count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-silver-border">
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              logout();
              navigate('/login');
            }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-medium text-financial-negative hover:bg-financial-negativeBg"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
    </div>
  );
};

