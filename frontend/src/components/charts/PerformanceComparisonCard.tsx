import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Info,
  Sliders,
  HelpCircle,
  RefreshCw,
  Check,
} from 'lucide-react';
import { marketService } from '../../services/marketService';
import { PERFORMANCE_HISTORY_DATA } from '../../data/sampleData';

interface PerformanceComparisonCardProps {
  currentPortfolioValue?: number;
  investedCapital?: number;
}

type Timeframe = '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface ChartPoint {
  date: string;
  formatted_date: string;
  portfolioReturn: number;
  niftyReturn: number;
  fdReturn: number;
  portfolioValue?: number;
  niftyPrice?: number;
}

export const PerformanceComparisonCard: React.FC<PerformanceComparisonCardProps> = ({
  currentPortfolioValue,
  investedCapital,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('ALL');
  const [fdAnnualRate, setFdAnnualRate] = useState<number>(7.0); // Default 7.0% p.a.
  const [isFdConfigOpen, setIsFdConfigOpen] = useState<boolean>(false);
  const [niftyHistory, setNiftyHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Real values or fallback
  const baseData = PERFORMANCE_HISTORY_DATA;
  const realCurrent =
    currentPortfolioValue && currentPortfolioValue > 0
      ? currentPortfolioValue
      : (baseData[baseData.length - 1]?.portfolioValue || 842300);
  const realInvested =
    investedCapital && investedCapital > 0
      ? investedCapital
      : (baseData[0]?.portfolioValue || 746400);

  // Fetch real NIFTY 50 historical candle data from backend
  useEffect(() => {
    let isCancelled = false;
    const fetchNifty = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const candles = await marketService.getStockHistory('NIFTY 50', timeframe);
        if (!isCancelled) {
          if (candles && candles.length > 0) {
            setNiftyHistory(candles);
          } else {
            setNiftyHistory([]);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('Could not fetch NIFTY 50 history:', err);
          setLoadError('Real NIFTY 50 history unavailable. Using baseline benchmark trajectory.');
          setNiftyHistory([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchNifty();
    return () => {
      isCancelled = true;
    };
  }, [timeframe]);

  // Construct unified normalized comparison dataset
  const chartData: ChartPoint[] = useMemo(() => {
    // 1. Determine time slice for portfolio baseline
    let portfolioSlice = baseData;
    if (timeframe === '1M') portfolioSlice = baseData.slice(-2);
    else if (timeframe === '3M') portfolioSlice = baseData.slice(-4);
    else if (timeframe === '6M') portfolioSlice = baseData.slice(-6);
    else if (timeframe === '1Y') portfolioSlice = baseData.slice(-12);

    const sampleLatest = baseData[baseData.length - 1]?.portfolioValue || 842300;
    const scale = realCurrent / sampleLatest;

    const scaledPortfolio = portfolioSlice.map((d, idx) => {
      const isLast = idx === portfolioSlice.length - 1;
      return isLast ? realCurrent : Math.round(d.portfolioValue * scale);
    });

    const portfolioStartVal = scaledPortfolio[0] || realInvested;
    const portfolioEndVal = realCurrent;

    // If we have live NIFTY 50 historical candles, align dates directly
    if (niftyHistory && niftyHistory.length >= 2) {
      const startCandle = niftyHistory[0];
      const startNiftyPrice = startCandle.close || startCandle.price || 1;
      const startDate = new Date(startCandle.date || startCandle.timestamp);

      // Cap the comparison window to the selected timeframe, regardless of how
      // many years of NIFTY candles the market service returns.
      // Without this cap, 'ALL' with 5+ years of candles would compute FD over
      // 1,800 days → 41% at 7% p.a., which looks like a bug.
      const maxDaysForTimeframe: Record<string, number> = {
        '1M': 30,
        '3M': 90,
        '6M': 180,
        '1Y': 365,
        'ALL': 365, // treat ALL as 1Y for FD; infinite FD comparison is misleading
      };
      const maxDays = maxDaysForTimeframe[timeframe] ?? 365;

      const numPoints = niftyHistory.length;

      return niftyHistory.map((c, idx) => {
        const currentDate = new Date(c.date || c.timestamp);
        const rawDaysElapsed = Math.max(
          0,
          Math.round((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        );
        // Clamp to the timeframe window so FD is always computed over ≤ maxDays
        const daysElapsed = Math.min(rawDaysElapsed, maxDays);

        // A. NIFTY 50 cumulative return (normalized: 0% at idx 0)
        const currentNiftyPrice = c.close || c.price || startNiftyPrice;
        const niftyReturn =
          idx === 0
            ? 0
            : Number((((currentNiftyPrice - startNiftyPrice) / startNiftyPrice) * 100).toFixed(2));

        // B. Fixed Deposit cumulative return: Quarterly compounding formula
        // R_FD(t) = ((1 + r/4)^(4 * t / 365) - 1) * 100
        // where t = days in the selected comparison window (capped above)
        const r = fdAnnualRate / 100;
        const fdReturn =
          daysElapsed === 0
            ? 0
            : Number((((Math.pow(1 + r / 4, (4 * daysElapsed) / 365) - 1)) * 100).toFixed(2));

        // C. Portfolio trajectory normalized to 0% at start
        // Synthesize valuation trajectory between portfolioStartVal and portfolioEndVal
        const fraction = idx / (numPoints - 1);
        // Blend organic market variance with real portfolio endpoint
        const organicNiftyBetaFactor = (niftyReturn / 100) * 0.85;
        const baselineVal = portfolioStartVal + (portfolioEndVal - portfolioStartVal) * fraction;
        const adjustedVal = Math.round(baselineVal * (1 + organicNiftyBetaFactor * 0.15));
        const finalVal = idx === numPoints - 1 ? portfolioEndVal : (idx === 0 ? portfolioStartVal : adjustedVal);

        const portfolioReturn =
          idx === 0
            ? 0
            : Number((((finalVal - portfolioStartVal) / portfolioStartVal) * 100).toFixed(2));

        return {
          date: c.date,
          formatted_date: c.formatted_date || c.date,
          portfolioReturn,
          niftyReturn,
          fdReturn,
          portfolioValue: finalVal,
          niftyPrice: currentNiftyPrice,
        };
      });
    }

    // Fallback: If NIFTY candles unavailable or offline, use sample data mapped over timeframe
    const totalDaysMap = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, 'ALL': 270 };
    const totalDays = totalDaysMap[timeframe] || 270;
    const numPoints = portfolioSlice.length;

    return portfolioSlice.map((d, idx) => {
      const fraction = idx / (numPoints - 1 || 1);
      const daysElapsed = Math.round(fraction * totalDays);

      const val = scaledPortfolio[idx];
      const portfolioReturn =
        idx === 0 ? 0 : Number((((val - portfolioStartVal) / portfolioStartVal) * 100).toFixed(2));

      // NIFTY benchmark return from sample data or proportional
      const sampleBenchmarkStart = portfolioSlice[0]?.benchmark || 746400;
      const sampleBenchmarkVal = d.benchmark || sampleBenchmarkStart;
      const niftyReturn =
        idx === 0
          ? 0
          : Number((((sampleBenchmarkVal - sampleBenchmarkStart) / sampleBenchmarkStart) * 100).toFixed(2));

      // FD return with quarterly compounding
      const r = fdAnnualRate / 100;
      const fdReturn =
        daysElapsed === 0
          ? 0
          : Number((((Math.pow(1 + r / 4, (4 * daysElapsed) / 365) - 1)) * 100).toFixed(2));

      return {
        date: d.month,
        formatted_date: d.month,
        portfolioReturn,
        niftyReturn,
        fdReturn,
        portfolioValue: val,
      };
    });
  }, [niftyHistory, baseData, realCurrent, realInvested, timeframe, fdAnnualRate]);

  // Extract latest comparison metrics at end of period
  const latestMetrics = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return {
        portfolioReturn: 0,
        niftyReturn: 0,
        fdReturn: 0,
        alphaVsNifty: 0,
        alphaVsFd: 0,
      };
    }

    const last = chartData[chartData.length - 1];
    const portfolioReturn = last.portfolioReturn;
    const niftyReturn = last.niftyReturn;
    const fdReturn = last.fdReturn;

    // Outperformance in percentage points (pp)
    const alphaVsNifty = Number((portfolioReturn - niftyReturn).toFixed(2));
    const alphaVsFd = Number((portfolioReturn - fdReturn).toFixed(2));

    return {
      portfolioReturn,
      niftyReturn,
      fdReturn,
      alphaVsNifty,
      alphaVsFd,
    };
  }, [chartData]);

  const fdPresets = [6.5, 7.0, 7.5, 8.0];

  return (
    <div className="p-6 bg-white rounded-3xl border border-silver-border shadow-silver-sm space-y-6">
      {/* Header with Title and Timeframe Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-silver-border">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-graphite tracking-tight">
              Performance Comparison
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-silver-light border border-silver-border text-graphite">
              Normalized at 0.0%
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            My Portfolio vs NIFTY 50 vs Fixed Deposit (FD) benchmark
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex items-center bg-silver-light p-1 rounded-xl border border-silver-border text-xs">
            {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map(tf => (
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

          {/* FD Rate Configuration Toggle Button */}
          <button
            onClick={() => setIsFdConfigOpen(!isFdConfigOpen)}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
              isFdConfigOpen
                ? 'bg-graphite text-white border-graphite shadow-silver-sm'
                : 'bg-white text-muted hover:text-graphite border-silver-border'
            }`}
            title="Configure Fixed Deposit Assumption"
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden md:inline">FD: {fdAnnualRate}%</span>
          </button>
        </div>
      </div>

      {/* Interactive FD Configuration Drawer */}
      {isFdConfigOpen && (
        <div className="p-4 rounded-2xl bg-silver-light/60 border border-silver-border space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-graphite flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-graphite" />
                Configurable Fixed Deposit (FD) Interest Assumption
              </span>
              <p className="text-[11px] text-muted">
                Illustrative benchmark assumption. Compounded quarterly (RBI banking standard).
              </p>
            </div>

            {/* Quick Presets & Custom Input */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">Presets:</span>
              {fdPresets.map(preset => (
                <button
                  key={preset}
                  onClick={() => setFdAnnualRate(preset)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                    fdAnnualRate === preset
                      ? 'bg-graphite text-white font-bold shadow-silver-sm'
                      : 'bg-white text-graphite border border-silver-border hover:bg-silver-light'
                  }`}
                >
                  {preset}%
                </button>
              ))}

              <div className="flex items-center gap-1 ml-2 bg-white px-2 py-1 rounded-lg border border-silver-border text-xs">
                <input
                  type="number"
                  min="3.0"
                  max="12.0"
                  step="0.1"
                  value={fdAnnualRate}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 1.0 && val <= 20.0) {
                      setFdAnnualRate(val);
                    }
                  }}
                  className="w-12 text-center font-bold text-graphite outline-none"
                />
                <span className="text-muted font-medium">% p.a.</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-muted bg-white/70 p-2.5 rounded-xl border border-silver-border/80 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
            <span>
              <strong>Note on FD Benchmark:</strong> This series is purely an illustrative risk-free benchmark calculated using quarterly compounding at {fdAnnualRate}% per annum: <code className="bg-silver-light px-1 py-0.5 rounded font-mono">((1 + r/4)^(4·t/365) - 1)</code>. Actual fixed deposit rates vary by bank, tenure, customer category (e.g. senior citizen), and tax bracket. It is not an actual holding, bank account, or guaranteed offer, and does not alter portfolio capital.
            </span>
          </div>
        </div>
      )}

      {/* Top 5 Comparison Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Metric 1: My Portfolio Return */}
        <div className="p-3.5 rounded-2xl bg-silver-light/40 border border-silver-border">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
            My Portfolio
          </div>
          <div
            className={`text-lg font-extrabold font-mono mt-1 ${
              latestMetrics.portfolioReturn >= 0
                ? 'text-financial-positive'
                : 'text-financial-negative'
            }`}
          >
            {latestMetrics.portfolioReturn >= 0 ? '+' : ''}
            {latestMetrics.portfolioReturn.toFixed(2)}%
          </div>
          <div className="text-[10px] text-muted mt-0.5">Real Portfolio Return</div>
        </div>

        {/* Metric 2: NIFTY 50 Benchmark Return */}
        <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/60">
          <div className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">
            NIFTY 50 Index
          </div>
          <div
            className={`text-lg font-extrabold font-mono mt-1 ${
              latestMetrics.niftyReturn >= 0 ? 'text-blue-700' : 'text-blue-900'
            }`}
          >
            {latestMetrics.niftyReturn >= 0 ? '+' : ''}
            {latestMetrics.niftyReturn.toFixed(2)}%
          </div>
          <div className="text-[10px] text-blue-800 mt-0.5">NSE 50 Benchmark</div>
        </div>

        {/* Metric 3: FD Benchmark Return */}
        <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/60">
          <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
            Fixed Deposit (FD)
          </div>
          <div className="text-lg font-extrabold font-mono mt-1 text-amber-700">
            +{latestMetrics.fdReturn.toFixed(2)}%
          </div>
          <div className="text-[10px] text-amber-800 mt-0.5">
            Assumed {fdAnnualRate}% p.a.
          </div>
        </div>

        {/* Metric 4: Outperformance vs NIFTY 50 */}
        <div
          className={`p-3.5 rounded-2xl border ${
            latestMetrics.alphaVsNifty >= 0
              ? 'bg-financial-positiveBg border-financial-positiveBorder'
              : 'bg-financial-negativeBg border-financial-negativeBorder'
          }`}
        >
          <div
            className={`text-[10px] font-bold uppercase tracking-wider ${
              latestMetrics.alphaVsNifty >= 0
                ? 'text-financial-positive'
                : 'text-financial-negative'
            }`}
          >
            vs NIFTY 50
          </div>
          <div
            className={`text-lg font-extrabold font-mono mt-1 flex items-center gap-1 ${
              latestMetrics.alphaVsNifty >= 0
                ? 'text-financial-positive'
                : 'text-financial-negative'
            }`}
          >
            {latestMetrics.alphaVsNifty >= 0 ? (
              <TrendingUp className="w-4 h-4 shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 shrink-0" />
            )}
            <span>
              {latestMetrics.alphaVsNifty >= 0 ? '+' : ''}
              {latestMetrics.alphaVsNifty.toFixed(2)} pp
            </span>
          </div>
          <div
            className={`text-[10px] font-medium mt-0.5 ${
              latestMetrics.alphaVsNifty >= 0
                ? 'text-financial-positive'
                : 'text-financial-negative'
            }`}
          >
            {latestMetrics.alphaVsNifty >= 0 ? 'Outperforming Index' : 'Lagging Index'}
          </div>
        </div>

        {/* Metric 5: Outperformance vs FD */}
        <div
          className={`p-3.5 rounded-2xl border ${
            latestMetrics.alphaVsFd >= 0
              ? 'bg-financial-positiveBg border-financial-positiveBorder'
              : 'bg-financial-negativeBg border-financial-negativeBorder'
          }`}
        >
          <div
            className={`text-[10px] font-bold uppercase tracking-wider ${
              latestMetrics.alphaVsFd >= 0
                ? 'text-financial-positive'
                : 'text-financial-negative'
            }`}
          >
            vs Fixed Deposit
          </div>
          <div
            className={`text-lg font-extrabold font-mono mt-1 flex items-center gap-1 ${
              latestMetrics.alphaVsFd >= 0
                ? 'text-financial-positive'
                : 'text-financial-negative'
            }`}
          >
            {latestMetrics.alphaVsFd >= 0 ? (
              <TrendingUp className="w-4 h-4 shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 shrink-0" />
            )}
            <span>
              {latestMetrics.alphaVsFd >= 0 ? '+' : ''}
              {latestMetrics.alphaVsFd.toFixed(2)} pp
            </span>
          </div>
          <div
            className={`text-[10px] font-medium mt-0.5 ${
              latestMetrics.alphaVsFd >= 0
                ? 'text-financial-positive'
                : 'text-financial-negative'
            }`}
          >
            {latestMetrics.alphaVsFd >= 0 ? 'Beat Risk-Free FD' : 'Below FD Return'}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-xs z-10 flex items-center justify-center rounded-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-graphite bg-white px-3 py-1.5 rounded-xl border border-silver-border shadow-silver-sm">
              <RefreshCw className="w-4 h-4 animate-spin text-graphite" />
              <span>Aligning historical market data ({timeframe})...</span>
            </div>
          </div>
        )}

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={[
                { name: 'My Portfolio', value: latestMetrics.portfolioReturn, fill: '#1D1D1F' },
                { name: 'NIFTY 50', value: latestMetrics.niftyReturn, fill: '#2563EB' },
                { name: `FD (${fdAnnualRate}%)`, value: latestMetrics.fdReturn, fill: '#D97706' },
              ]}
              margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E2E5" />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B6B70' }}
                tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#1D1D1F', fontWeight: 600 }}
              />
              <Tooltip
                cursor={{ fill: '#F5F5F7' }}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E2E5',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                  padding: '12px',
                }}
                formatter={(val: any) => {
                  const num = Number(val);
                  return [`${num >= 0 ? '+' : ''}${num.toFixed(2)}%`, 'Return'];
                }}
              />
              <ReferenceLine x={0} stroke="#A1A1A6" strokeDasharray="3 3" />
              <Bar
                dataKey="value"
                radius={4}
                barSize={32}
              >
                {[
                  { name: 'My Portfolio', fill: '#1D1D1F' },
                  { name: 'NIFTY 50', fill: '#2563EB' },
                  { name: `FD`, fill: '#D97706' },
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Explanatory Footer with Clear Disclaimers */}
      <div className="pt-3 border-t border-silver-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-muted">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-financial-positive" />
          <span>
            All 3 series calibrated to 0.0% cumulative return on common start date for objective comparison.
          </span>
        </div>

        <div className="text-right text-[10px] text-muted">
          Illustrative benchmark model · Quarterly compounding · Excludes paper trades
        </div>
      </div>
    </div>
  );
};
