import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { portfolioService } from '../../services/portfolioService';
import { PortfolioHistoryPoint } from '../../types';
import { RefreshCw, Info, AlertTriangle } from 'lucide-react';

interface PerformanceChartProps {
  portfolioId?: string;
  currentPortfolioValue?: number;
  investedCapital?: number;
  headlineProfitLoss?: number;
  headlineReturnPercentage?: number;
  /** Portfolio inception date in 'YYYY-MM-DD' format */
  createdAt?: string;
}

type Timeframe = '1M' | '3M' | '6M' | '1Y' | 'ALL';

/**
 * Portfolio Performance Chart
 *
 * Requirements satisfied:
 * - 1M, 3M, 6M, 1Y, and ALL filters query the backend for exact timeframe history.
 * - Displays accurate dates and values calculated from underlying holdings and historical market prices.
 * - Shows period returns (start of period to end of period) and clearly explains why
 *   period return differs from headline all-time P/L.
 * - Honest limited-data / empty state when historical data is insufficient (< 2 points).
 *   No synthetic curves or fabricated data.
 */
export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  portfolioId,
  currentPortfolioValue,
  investedCapital,
  headlineProfitLoss,
  headlineReturnPercentage,
  createdAt,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [historyPoints, setHistoryPoints] = useState<PortfolioHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch real portfolio history for the selected timeframe
  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        let targetId = portfolioId;
        if (!targetId) {
          const list = await portfolioService.getPortfolios();
          if (list && list.length > 0) {
            targetId = list[0].id;
          }
        }

        if (targetId) {
          const data = await portfolioService.getPortfolioHistory(targetId, timeframe);
          if (!cancelled) {
            setHistoryPoints(Array.isArray(data) ? data : []);
          }
        } else {
          if (!cancelled) setHistoryPoints([]);
        }
      } catch (err: any) {
        if (!cancelled) {
          setLoadError('Historical performance data temporarily unavailable.');
          setHistoryPoints([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [portfolioId, timeframe]);

  /** True when at least one real snapshot has been received */
  const hasData = historyPoints.length >= 1;
  /** True when enough points exist to draw a meaningful trend line */
  const hasChart = historyPoints.length >= 2;

  // Period performance metrics
  const periodMetrics = useMemo(() => {
    if (!hasChart) {
      const fallbackVal = currentPortfolioValue || 0;
      return {
        startVal: investedCapital || fallbackVal,
        endVal: fallbackVal,
        changeVal: fallbackVal - (investedCapital || fallbackVal),
        changePct: investedCapital && investedCapital > 0
          ? ((fallbackVal - investedCapital) / investedCapital) * 100
          : 0,
        startDate: createdAt || 'Inception',
        endDate: 'Today',
      };
    }

    const first = historyPoints[0];
    const last = historyPoints[historyPoints.length - 1];
    const startVal = first.portfolioValue;
    const endVal = last.portfolioValue;
    const changeVal = endVal - startVal;
    const changePct = startVal > 0 ? (changeVal / startVal) * 100 : 0;

    return {
      startVal,
      endVal,
      changeVal,
      changePct,
      startDate: first.formatted_date || first.date,
      endDate: last.formatted_date || last.date,
    };
  }, [historyPoints, hasChart, currentPortfolioValue, investedCapital, createdAt]);

  const latestDisplayVal = hasChart
    ? periodMetrics.endVal
    : hasData
      ? historyPoints[historyPoints.length - 1].portfolioValue
      : (currentPortfolioValue || 0);

  return (
    <div className="p-6 bg-white rounded-2xl border border-silver-border shadow-silver-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-bold text-graphite tracking-tight">Portfolio Performance</h3>
          {latestDisplayVal > 0 ? (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xl font-bold text-graphite font-mono">
                ₹{Math.round(latestDisplayVal).toLocaleString('en-IN')}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  periodMetrics.changeVal >= 0
                    ? 'bg-financial-positiveBg text-financial-positive'
                    : 'bg-financial-negativeBg text-financial-negative'
                }`}
                title={`Return over the selected ${timeframe} timeframe`}
              >
                {periodMetrics.changeVal >= 0 ? '+' : ''}₹{Math.round(periodMetrics.changeVal).toLocaleString('en-IN')} ({periodMetrics.changePct.toFixed(2)}%) in {timeframe}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted mt-1">Add holdings to track performance</p>
          )}
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center bg-silver-light p-1 rounded-xl border border-silver-border text-xs">
          {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 font-semibold rounded-lg transition-all ${
                timeframe === tf
                  ? 'bg-white text-graphite shadow-silver-sm border border-silver-dark/30'
                  : 'text-muted hover:text-graphite'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs z-10 flex items-center justify-center rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-graphite bg-white px-3 py-1.5 rounded-xl border border-silver-border shadow-silver-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading performance data ({timeframe})…</span>
            </div>
          </div>
        )}

        {!hasData && !isLoading ? (
          <div className="h-64 flex items-center justify-center border border-dashed border-silver-border rounded-xl bg-silver-light/20">
            <div className="text-center space-y-2 p-6 max-w-sm">
              <AlertTriangle className="w-8 h-8 text-muted mx-auto" />
              <p className="text-sm font-semibold text-graphite">Insufficient Historical Data</p>
              <p className="text-xs text-muted leading-relaxed">
                {loadError ||
                  `Historical valuations for ${timeframe} are currently unavailable. The system is now capturing daily snapshots — performance history will build up over time.`}
              </p>
            </div>
          </div>
        ) : !hasChart && !isLoading ? (
          // Single-point honest display — one snapshot captured, more needed for a trend
          <div className="h-64 flex items-center justify-center border border-silver-border rounded-xl bg-silver-light/10">
            <div className="text-center space-y-3 p-6 max-w-xs">
              <div className="w-10 h-10 rounded-full bg-financial-positiveBg flex items-center justify-center mx-auto">
                <span className="text-financial-positive text-lg font-bold">₹</span>
              </div>
              <p className="text-sm font-bold text-graphite">
                ₹{Math.round(historyPoints[0].portfolioValue).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-muted leading-relaxed">
                First valuation snapshot captured on <strong>{historyPoints[0].formatted_date}</strong>.
                Daily EOD snapshots are now being collected — a performance trend line will appear here as data accumulates.
              </p>
              {historyPoints[0].priceSource && (
                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-silver-light border border-silver-border text-muted uppercase tracking-wide">
                  {historyPoints[0].priceSource === 'eod' ? 'EOD Close' : historyPoints[0].priceSource}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={periodMetrics.changeVal >= 0 ? '#16A34A' : '#DC2626'}
                      stopOpacity={0.12}
                    />
                    <stop
                      offset="95%"
                      stopColor={periodMetrics.changeVal >= 0 ? '#16A34A' : '#DC2626'}
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>
                <ReferenceLine
                  y={periodMetrics.startVal}
                  stroke="#A1A1A6"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{
                    value: 'Period Start',
                    fill: '#86868B',
                    fontSize: 9,
                    position: 'right',
                  }}
                />
                <XAxis
                  dataKey="formatted_date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#6B6B70' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#6B6B70' }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  domain={['auto', 'auto']}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E2E5',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, _name: any, item: any) => [
                    `₹${Number(value).toLocaleString('en-IN')} (${item?.payload?.periodReturnPercentage ?? 0}%)`,
                    'Portfolio Valuation',
                  ]}
                  labelFormatter={(label: any) => `Date: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="portfolioValue"
                  stroke={periodMetrics.changeVal >= 0 ? '#16A34A' : '#DC2626'}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#perfGradient)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>


      {/* Honest data & metric reconciliation disclosure */}
      {hasChart && (
        <div className="mt-3 pt-3 border-t border-silver-border flex items-start gap-2 text-[11px] text-muted leading-relaxed">
          <Info className="w-4 h-4 shrink-0 text-graphite/60 mt-0.5" />
          <span>
            <strong>Period performance ({timeframe}):</strong> From ₹{Math.round(periodMetrics.startVal).toLocaleString('en-IN')} ({periodMetrics.startDate}) to ₹{Math.round(periodMetrics.endVal).toLocaleString('en-IN')} ({periodMetrics.endDate}).{' '}
            {headlineProfitLoss !== undefined && (
              <span className="text-graphite/70">
                Headline P/L ({headlineProfitLoss >= 0 ? '+' : ''}₹{Math.round(headlineProfitLoss).toLocaleString('en-IN')}) measures cumulative all-time gain since inception vs invested capital.
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};
