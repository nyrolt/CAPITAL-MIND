import React from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useApp } from '../../context/AppContext';
import { User, Mail, ShieldCheck, Briefcase, Calendar, Lock } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useApp();

  return (
    <AppShell pageTitle="User Profile">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="p-8 bg-white rounded-3xl border border-silver-border shadow-silver-md flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-silver-dark via-platinum to-silver text-graphite font-bold text-2xl flex items-center justify-center border border-silver-border shadow-silver-sm shrink-0">
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-extrabold text-graphite">{user.name}</h2>
              <Badge variant="silver">{user.role}</Badge>
            </div>
            <p className="text-xs text-muted flex items-center justify-center sm:justify-start gap-1">
              <Mail className="w-3.5 h-3.5 text-muted" /> {user.email}
            </p>
            <p className="text-[11px] text-muted flex items-center justify-center sm:justify-start gap-1">
              <Calendar className="w-3.5 h-3.5 text-muted" /> Member since {user.accountCreated}
            </p>
          </div>

          <Button variant="outline" size="sm" icon={<Lock className="w-3.5 h-3.5" />}>
            Edit Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-silver-border shadow-silver-sm space-y-4">
            <h3 className="text-sm font-bold text-graphite flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-graphite" /> Portfolio Summary
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-silver-border">
                <span className="text-muted">Total Portfolios Managed:</span>
                <span className="font-bold text-graphite">{user.portfolioCount}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-silver-border">
                <span className="text-muted">Primary Currency:</span>
                <span className="font-bold text-graphite">{user.currency}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted">Target Market:</span>
                <span className="font-bold text-graphite">Indian Retail (NSE / BSE)</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-silver-border shadow-silver-sm space-y-4">
            <h3 className="text-sm font-bold text-graphite flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-graphite" /> Security & Protection
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-silver-border">
                <span className="text-muted">Multi-Factor Auth (MFA):</span>
                <Badge variant="positive" size="sm">Enabled</Badge>
              </div>
              <div className="flex justify-between py-2 border-b border-silver-border">
                <span className="text-muted">API Access Key:</span>
                <span className="font-mono text-muted">••••••••••••3a9b</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted">Session Isolation:</span>
                <span className="font-bold text-financial-positive">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

