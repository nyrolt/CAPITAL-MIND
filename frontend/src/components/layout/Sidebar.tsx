import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
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
  BookOpen,
  Newspaper
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user, notifications, logout } = useApp();
  const unreadCount = notifications.filter(n => !n.isRead).length;

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
    { name: 'Financial News', path: '/news', icon: Newspaper, badge: 'LIVE' },
    { name: 'Recommendations', path: '/recommendations', icon: Lightbulb },
    { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
    { name: 'Notifications', path: '/notifications', icon: Bell, count: unreadCount },
  ];

  const bottomNavItems = [
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
    ...(user?.role === 'Admin' ? [{ name: 'Admin', path: '/admin', icon: ShieldCheck }] : []),
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-silver-border bg-white h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-silver-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-graphite text-white font-bold text-lg shadow-silver-sm">
          C
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-graphite">CapitalMind</span>
          <span className="block text-[10px] text-muted tracking-wider uppercase font-semibold">Portfolio Intelligence</span>
        </div>
      </div>

      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Intelligence Suite
          </div>
          <nav className="space-y-1">
            {mainNavItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-gradient-to-r from-silver-light to-platinum/60 text-graphite border border-silver-dark/40 shadow-silver-sm font-semibold'
                        : 'text-muted hover:text-graphite hover:bg-silver-light'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-graphite text-white rounded-md">
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
        </div>

        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Management
          </div>
          <nav className="space-y-1">
            {bottomNavItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-gradient-to-r from-silver-light to-platinum/60 text-graphite border border-silver-dark/40 shadow-silver-sm font-semibold'
                        : 'text-muted hover:text-graphite hover:bg-silver-light'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-silver-border bg-background-secondary/50">
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-medium text-muted hover:text-financial-negative hover:bg-financial-negativeBg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

