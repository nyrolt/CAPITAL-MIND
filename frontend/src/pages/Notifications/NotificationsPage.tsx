import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useApp } from '../../context/AppContext';
import { Bell, CheckCheck, ShieldAlert, Sparkles, Briefcase, Info } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useApp();
  const [tab, setTab] = useState<string>('All');

  const categories = ['All', 'Risk', 'Portfolio', 'AI', 'System'];

  const filtered = notifications.filter(n => tab === 'All' || n.category === tab);

  const getIcon = (cat: string) => {
    if (cat === 'Risk') return <ShieldAlert className="w-4 h-4 text-financial-warning" />;
    if (cat === 'AI') return <Sparkles className="w-4 h-4 text-graphite" />;
    if (cat === 'Portfolio') return <Briefcase className="w-4 h-4 text-graphite" />;
    return <Info className="w-4 h-4 text-muted" />;
  };

  return (
    <AppShell pageTitle="Notification Center">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-graphite tracking-tight">System Alerts & Notifications</h2>
            <p className="text-xs text-muted mt-0.5">Real-time risk alerts, portfolio milestones, and AI advisories</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<CheckCheck className="w-4 h-4" />}
            onClick={markAllNotificationsAsRead}
          >
            Mark All as Read
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setTab(c)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                tab === c
                  ? 'bg-graphite text-white shadow-silver-sm'
                  : 'bg-white text-muted hover:text-graphite border border-silver-border'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-silver-border text-xs text-muted">
              No notifications in this category.
            </div>
          ) : (
            filtered.map(n => (
              <div
                key={n.id}
                onClick={() => {
                  markNotificationAsRead(n.id);
                  if (n.link) navigate(n.link);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  n.isRead
                    ? 'bg-white border-silver-border opacity-80'
                    : 'bg-gradient-to-r from-white via-background-secondary/60 to-white border-silver-dark shadow-silver-sm'
                }`}
              >
                <div className="p-2.5 rounded-xl bg-silver-light border border-silver-border shrink-0 mt-0.5">
                  {getIcon(n.category)}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-graphite flex items-center gap-2">
                      {n.title}
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-financial-negative" />}
                    </span>
                    <span className="text-[10px] text-muted font-mono">{n.timestamp}</span>
                  </div>

                  <p className="text-xs text-muted leading-relaxed">{n.message}</p>

                  <div className="pt-1 flex items-center gap-2">
                    <Badge variant="neutral" size="sm">{n.category}</Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
};

