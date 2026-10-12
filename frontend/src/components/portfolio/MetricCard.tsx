import React from 'react';
import { Badge } from '../common/Badge';

interface MetricCardProps {
  title: string;
  value: string;
  subValue?: string;
  badgeText?: string;
  badgeVariant?: 'positive' | 'negative' | 'warning' | 'neutral' | 'silver';
  icon?: React.ReactNode;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subValue,
  badgeText,
  badgeVariant = 'neutral',
  icon,
  subtitle,
}) => {
  return (
    <div className="p-5 bg-white rounded-2xl border border-silver-border shadow-silver-sm hover:shadow-silver-md transition-all duration-200 group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted tracking-wide uppercase">{title}</span>
        {icon && (
          <div className="p-2 rounded-xl bg-silver-light border border-silver-border/60 text-graphite group-hover:bg-silver transition-colors">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-graphite font-sans">
          {value}
        </h2>
        {badgeText && <Badge variant={badgeVariant}>{badgeText}</Badge>}
      </div>

      {(subValue || subtitle) && (
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          {subValue && <span className="font-semibold text-graphite">{subValue}</span>}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
};

