import React from 'react';
import { RiskFactor } from '../../types';
import { AlertTriangle, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

interface RiskFactorCardProps {
  factor: RiskFactor;
}

const getSeverityConfig = (status: string) => {
  if (status === 'Very High' || status === 'High') {
    return {
      barColor: '#EF4444',
      badgeBg: '#FEE2E2',
      badgeText: '#DC2626',
      icon: ShieldAlert,
    };
  }
  if (status === 'Moderate') {
    return {
      barColor: '#F59E0B',
      badgeBg: '#FEF3C7',
      badgeText: '#D97706',
      icon: AlertTriangle,
    };
  }
  if (status === 'Insufficient data') {
    return {
      barColor: '#94A3B8',
      badgeBg: '#F1F5F9',
      badgeText: '#64748B',
      icon: AlertCircle,
    };
  }
  return {
    barColor: '#10B981',
    badgeBg: '#DCFCE7',
    badgeText: '#16A34A',
    icon: CheckCircle2,
  };
};

export const RiskFactorCard: React.FC<RiskFactorCardProps> = ({ factor }) => {
  const cfg = getSeverityConfig(factor.status);
  const Icon = cfg.icon;

  return (
    <div className="relative bg-white rounded-2xl border border-silver-border shadow-silver-sm hover:shadow-silver-md hover:border-silver-dark transition-all duration-200 overflow-hidden flex flex-col justify-between p-5 space-y-3">
      {/* Left accent bar */}
      <div
        className="absolute top-0 left-0 w-1 h-full"
        style={{ backgroundColor: cfg.barColor }}
      />

      <div className="space-y-2.5">
        {/* Header: Icon + Title + Status Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-4.5 h-4.5 shrink-0" style={{ color: cfg.barColor }} />
            <h4 className="text-sm font-bold text-graphite truncate">{factor.name}</h4>
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0"
            style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeText }}
          >
            {factor.status}
          </span>
        </div>

        {/* Score & Progress Bar */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-[11px] text-muted font-medium">Risk Score</span>
            <span className="text-xs font-bold font-mono" style={{ color: cfg.barColor }}>
              {factor.score}/100
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-silver-light border border-silver-border/60 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${factor.score}%`,
                backgroundColor: cfg.barColor,
              }}
            />
          </div>
        </div>

        {/* Explanation text */}
        <p className="text-xs text-muted leading-relaxed">
          {factor.explanation}
        </p>
      </div>
    </div>
  );
};
