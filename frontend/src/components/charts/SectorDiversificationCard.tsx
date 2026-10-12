import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { SectorAllocation } from '../../types';
import { PieChart as PieIcon, BarChart2, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface SectorDiversificationCardProps {
  sectors: SectorAllocation[];
  totalPortfolioValue: number;
}

const SECTOR_PALETTE = [
  '#1D1D1F', // Graphite
  '#0284C7', // Sky Blue
  '#059669', // Emerald
  '#D97706', // Amber
  '#7C3AED', // Violet
  '#DC2626', // Crimson
  '#0D9488', // Teal
  '#475569', // Slate
  '#DB2777', // Rose
  '#EA580C', // Orange
  '#6366F1', // Indigo
];

export const SectorDiversificationCard: React.FC<SectorDiversificationCardProps> = ({
  sectors,
  totalPortfolioValue,
}) => {
  const [viewMode, setViewMode] = useState<'donut' | 'bar'>('donut');

  const safeSectors = sectors || [];
  const maxPct = Math.max(...safeSectors.map(s => s.percentage), 1);
  const topSector = safeSectors[0];
  const isHighConcentration = topSector && topSector.percentage > 35;

  const chartData = safeSectors.map(s => ({
    name: s.sector,
    value: s.value,
    percentage: s.percentage,
  }));

  return (
    <div className="p-6 bg-white rounded-2xl border border-silver-border shadow-silver-sm flex flex-col justify-between h-full">
      {/* Header with Title and View Switcher */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-graphite tracking-tight">Sector Diversification</h3>
            {safeSectors.length > 0 && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isHighConcentration
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {isHighConcentration ? (
                  <>
                    <ShieldAlert className="w-3 h-3" /> Concentrated
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> Diversified
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5">
            Distribution of real holdings across company sectors (quantity × current price)
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-silver-light/80 p-0.5 rounded-xl border border-silver-border">
          <button
            onClick={() => setViewMode('donut')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'donut'
                ? 'bg-white text-graphite shadow-silver-sm'
                : 'text-muted hover:text-graphite'
            }`}
            title="Donut Chart View"
          >
            <PieIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('bar')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'bar'
                ? 'bg-white text-graphite shadow-silver-sm'
                : 'text-muted hover:text-graphite'
            }`}
            title="Bar Breakdown View"
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Body */}
      {safeSectors.length === 0 ? (
        <div className="py-12 text-center text-muted text-xs flex flex-col items-center justify-center">
          <p className="font-semibold text-graphite">No Holdings in Real Portfolio</p>
          <p className="mt-1">Add actual stocks to view real-time sector allocation metrics.</p>
        </div>
      ) : (
        <>
          {viewMode === 'donut' ? (
            <div className="flex flex-col">
              {/* Donut Chart */}
              <div className="relative h-48 my-2 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((_, index) => (
                        <Cell
                          key={`sector-cell-${index}`}
                          fill={SECTOR_PALETTE[index % SECTOR_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E2E2E5',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                      }}
                      formatter={(val: any, name: any, item: any) => [
                        `₹${Number(val).toLocaleString('en-IN')} (${item.payload.percentage}%)`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Sector List Breakdown */}
              <div className="space-y-2 pt-3 border-t border-silver-border max-h-48 overflow-y-auto pr-1">
                {safeSectors.map((s, index) => (
                  <div key={s.sector} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: SECTOR_PALETTE[index % SECTOR_PALETTE.length] }}
                      />
                      <span className="font-semibold text-graphite truncate">{s.sector}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono flex-shrink-0 ml-2">
                      <span className="text-muted text-[11px]">₹{s.value.toLocaleString('en-IN')}</span>
                      <span className="font-bold text-graphite text-[11px] w-12 text-right">
                        {s.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Bar Breakdown View */
            <div className="space-y-3.5 my-2 max-h-80 overflow-y-auto pr-1">
              {safeSectors.map((s, index) => {
                const isTop = index === 0 && s.percentage > 30;
                return (
                  <div key={s.sector} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-graphite flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: SECTOR_PALETTE[index % SECTOR_PALETTE.length] }}
                        />
                        {s.sector}
                        {isTop && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                            Dominant
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-muted text-[11px]">
                        ₹{s.value.toLocaleString('en-IN')} ({s.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-silver-light rounded-full overflow-hidden border border-silver-border/60">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(s.percentage / maxPct) * 100}%`,
                          backgroundColor: SECTOR_PALETTE[index % SECTOR_PALETTE.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Footer Summary */}
      {safeSectors.length > 0 && (
        <div className="pt-3 mt-3 border-t border-silver-border flex items-center justify-between text-[11px] text-muted">
          <span>Distinct Sectors: <strong className="text-graphite">{safeSectors.length}</strong></span>
          <span>
            Total Value:{' '}
            <strong className="text-graphite font-mono">
              ₹{totalPortfolioValue.toLocaleString('en-IN')}
            </strong>
          </span>
        </div>
      )}
    </div>
  );
};
