import React, { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useApp } from '../../context/AppContext';
import { User, Sliders, ShieldCheck, Database, RefreshCw } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateUserSettings, resetToDemoData } = useApp();
  const [activeTab, setActiveTab] = useState<'Account' | 'Preferences' | 'Security' | 'Privacy'>('Account');

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [mfa, setMfa] = useState(user.mfaEnabled);
  const [currency, setCurrency] = useState(user.currency);
  const [emailAlerts, setEmailAlerts] = useState(user.emailAlerts);
  const [aiEnabled, setAiEnabled] = useState(user.aiInsightsEnabled);

  const handleSave = () => {
    updateUserSettings({
      name,
      email,
      mfaEnabled: mfa,
      currency,
      emailAlerts,
      aiInsightsEnabled: aiEnabled,
    });
    alert('Settings saved successfully!');
  };

  return (
    <AppShell pageTitle="Account Settings">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-xl font-bold text-graphite tracking-tight">System & Account Configuration</h2>
          <p className="text-xs text-muted mt-0.5">Manage credentials, notification alerts, security policies, and AI parameters</p>
        </div>

        {/* Setting Tabs */}
        <div className="flex items-center gap-2 border-b border-silver-border pb-2">
          {[
            { id: 'Account', icon: User },
            { id: 'Preferences', icon: Sliders },
            { id: 'Security', icon: ShieldCheck },
            { id: 'Privacy', icon: Database },
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                  isActive
                    ? 'bg-graphite text-white shadow-silver-sm'
                    : 'text-muted hover:text-graphite hover:bg-silver-light'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.id}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 bg-white rounded-3xl border border-silver-border shadow-silver-sm space-y-6">
          {activeTab === 'Account' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-graphite">Account Identification</h3>
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-graphite mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-graphite mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Preferences' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-graphite">Display & Notification Preferences</h3>
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-graphite mb-1">Display Currency</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full p-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
                  >
                    <option value="INR (₹)">Indian Rupee (INR ₹)</option>
                    <option value="USD ($)">US Dollar (USD $)</option>
                  </select>
                </div>

                <label className="flex items-center justify-between p-3 rounded-xl bg-silver-light/40 border border-silver-border cursor-pointer">
                  <div>
                    <span className="font-semibold text-graphite block">Email Risk Alerts</span>
                    <span className="text-[10px] text-muted">Receive alerts when sector concentration crosses 30%</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={e => setEmailAlerts(e.target.checked)}
                    className="rounded border-silver-dark text-graphite"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-silver-light/40 border border-silver-border cursor-pointer">
                  <div>
                    <span className="font-semibold text-graphite block">CapitalMind AI Insights</span>
                    <span className="text-[10px] text-muted">Enable automatic AI portfolio summaries on dashboard</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiEnabled}
                    onChange={e => setAiEnabled(e.target.checked)}
                    className="rounded border-silver-dark text-graphite"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'Security' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-graphite">Authentication & Session Security</h3>
              <label className="flex items-center justify-between p-3 rounded-xl bg-silver-light/40 border border-silver-border cursor-pointer">
                <div>
                  <span className="font-semibold text-graphite block">Multi-Factor Authentication (MFA)</span>
                  <span className="text-[10px] text-muted">Require TOTP code upon sign-in</span>
                </div>
                <input
                  type="checkbox"
                  checked={mfa}
                  onChange={e => setMfa(e.target.checked)}
                  className="rounded border-silver-dark text-graphite"
                />
              </label>

              <div className="p-4 rounded-xl bg-silver-light/40 border border-silver-border space-y-2">
                <span className="font-semibold text-graphite block">Active Login Sessions</span>
                <div className="flex justify-between items-center text-[11px] text-muted">
                  <span>Chrome (Windows 11) • Current Session</span>
                  <Badge variant="positive" size="sm">Active</Badge>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Privacy' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-graphite">Data & Prototype Controls</h3>
              <p className="text-muted leading-relaxed">
                Reset prototype state to restore default sample holdings (HDFC Bank, Reliance, Infosys, ICICI Bank, Parag Parikh).
              </p>
              <div className="pt-2">
                <Button
                  variant="danger"
                  size="sm"
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={() => {
                    if (confirm('Reset prototype state to default sample data?')) {
                      resetToDemoData();
                      alert('Prototype state reset to default demo data.');
                    }
                  }}
                >
                  Reset Prototype to Demo State
                </Button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-silver-border flex justify-end">
            <Button onClick={handleSave}>Save Settings</Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

