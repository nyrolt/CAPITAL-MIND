import React from 'react';
import { SectorAllocation } from '../../types';

interface SectorBarChartProps {
  sectors: SectorAllocation[];
}

export const SectorBarChart: React.FC<SectorBarChartProps> = ({ sectors }) => {
  const maxPct = Math.max(...sectors.map(s => s.percentage), 1);

  return (
    <div className="p-6 bg-white rounded-2xl border border-silver-border shadow-silver-sm flex flex-col justify-between h-full">
      <div className="mb-4">
        <h3 className="text-base font-bold text-graphite">Sector Exposure</h3>
        <p className="text-xs text-muted mt-0.5">Concentration breakdown by industry</p>
      </div>

      <div className="space-y-3.5 flex-1 justify-center flex flex-col">
        {sectors.map(s => {
          const isHighConcentration = s.percentage > 30;
          return (
            <div key={s.sector} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-graphite flex items-center gap-1.5">
                  {s.sector}
                  {isHighConcentration && (
                    <span className="px-1.5 py-0.2 text-[9px] font-bold bg-financial-warningBg text-financial-warning border border-financial-warningBorder rounded">
                      High
                    </span>
                  )}
                </span>
                <span className="font-mono text-muted">
                  ₹{(s.value / 1000).toFixed(1)}k ({s.percentage}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-silver-light rounded-full overflow-hidden border border-silver-border/60">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isHighConcentration
                      ? 'bg-gradient-to-r from-graphite to-financial-warning'
                      : 'bg-graphite'
                  }`}
                  style={{ width: `${(s.percentage / maxPct) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

