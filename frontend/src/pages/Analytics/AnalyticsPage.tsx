import React, { useMemo } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { PerformanceComparisonCard } from '../../components/charts/PerformanceComparisonCard';
import { AllocationDonut } from '../../components/charts/AllocationDonut';
import { SectorDiversificationCard } from '../../components/charts/SectorDiversificationCard';
import { MetricCard } from '../../components/portfolio/MetricCard';
import { useApp } from '../../context/AppContext';
import { useMarketData } from '../../hooks/useMarketData';
import { Wallet, TrendingUp, BarChart2, Award, AlertTriangle, Layers, LineChart } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { selectedPortfolio } = useApp();
  const p = selectedPortfolio;

  const safeHoldings = useMemo(() => p?.holdings || [], [p?.holdings]);
  const symbols = useMemo(() => safeHoldings.map(h => h.symbol), [safeHoldings]);
  const { getTick } = useMarketData(symbols);

  // Compute live holding values based strictly on real portfolio holdings and live/market prices
  // holding value = quantity × current market price
  const computedRealHoldings = useMemo(() => {
    return safeHoldings.map(h => {
      const liveTick = getTick(h.symbol);
      const currentPrice =
        liveTick?.ltp && liveTick.ltp > 0
          ? liveTick.ltp
          : (h.currentPrice && h.currentPrice > 0 ? h.currentPrice : (h.avgPrice || 0));

      const holdingValue = Math.round(h.quantity * currentPrice * 100) / 100;
      const investedValue = Math.round(h.quantity * (h.avgPrice || 0) * 100) / 100;
      const profitLoss = Math.round((holdingValue - investedValue) * 100) / 100;
      const returnPercentage = investedValue > 0 ? (profitLoss / investedValue) * 100 : 0;

      return {
        ...h,
        currentPrice,
        currentValue: holdingValue,
        investedValue,
        profitLoss,
        returnPercentage,
      };
    });
  }, [safeHoldings, getTick]);

  // Total Real Portfolio Value = sum of all real holding values
  const totalRealPortfolioValue = useMemo(() => {
    return computedRealHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  }, [computedRealHoldings]);

  const totalInvested = useMemo(() => {
    return computedRealHoldings.reduce((sum, h) => sum + h.investedValue, 0);
  }, [computedRealHoldings]);

  const totalRealizedPL = p?.realizedProfitLoss || 0;
  const totalUnrealizedPL = Math.round((totalRealPortfolioValue - totalInvested) * 100) / 100;
  const totalProfitLoss = totalUnrealizedPL + totalRealizedPL;
  const totalReturnPct = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  // A. SECTOR DIVERSIFICATION
  // sector holding value = sum(holding value in sector)
  // sector percentage = sector holding value / total real portfolio value × 100
  const realSectorAllocation = useMemo(() => {
    const sectorMap: Record<string, number> = {};
    computedRealHoldings.forEach(h => {
      const sec = h.sector && h.sector.trim() !== '' ? h.sector : 'Unclassified';
      sectorMap[sec] = (sectorMap[sec] || 0) + h.currentValue;
    });

    return Object.entries(sectorMap)
      .map(([sector, val]) => ({
        sector,
        value: Math.round(val * 100) / 100,
        percentage:
          totalRealPortfolioValue > 0
            ? Number(((val / totalRealPortfolioValue) * 100).toFixed(2))
            : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [computedRealHoldings, totalRealPortfolioValue]);

  // B. SEGMENT / ASSET ALLOCATION
  // segment holding value = sum(holding value in segment)
  // segment percentage = segment holding value / total real portfolio value × 100
  const realSegmentAllocation = useMemo(() => {
    const segmentMap: Record<string, number> = {};
    computedRealHoldings.forEach(h => {
      let seg = h.assetType || 'Equity';
      // Normalize asset segments
      if (seg === 'Stock') seg = 'Equity';
      else if (seg === 'ETF' || (seg === 'Mutual Fund' && (h.symbol.includes('BEES') || h.name.includes('ETF')))) seg = 'ETF';
      else if (seg === 'Bond') seg = 'Bond/Debt';

      segmentMap[seg] = (segmentMap[seg] || 0) + h.currentValue;
    });

    return Object.entries(segmentMap)
      .map(([assetType, val]) => ({
        assetType: assetType as any,
        value: Math.round(val * 100) / 100,
        percentage:
          totalRealPortfolioValue > 0
            ? Number(((val / totalRealPortfolioValue) * 100).toFixed(2))
            : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [computedRealHoldings, totalRealPortfolioValue]);

  const sortedHoldings = useMemo(() => {
    return [...computedRealHoldings].sort((a, b) => b.returnPercentage - a.returnPercentage);
  }, [computedRealHoldings]);

  const topGainers = sortedHoldings.slice(0, 3);
  const bottomPerformers = sortedHoldings.slice(-3).reverse();

  return (
    <AppShell pageTitle="Portfolio Analytics">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-graphite tracking-tight">
              Analytics Breakdown: {p.name}
            </h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-silver-light border border-silver-border text-muted">
              Real Portfolio Holdings
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Quantitative performance metrics and real holdings diversification breakdown
          </p>
        </div>

        {/* Top Quantitative Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Real Portfolio Value"
            value={`₹${Math.round(totalRealPortfolioValue).toLocaleString('en-IN')}`}
            subtitle={`Invested: ₹${Math.round(totalInvested).toLocaleString('en-IN')}`}
            icon={<Wallet className="w-5 h-5 text-graphite" />}
          />

          <MetricCard
            title="Net Profit / Loss"
            value={`${totalProfitLoss >= 0 ? '+' : ''}₹${Math.round(totalProfitLoss).toLocaleString('en-IN')}`}
            badgeText={`${totalProfitLoss >= 0 ? '+' : ''}${totalReturnPct.toFixed(2)}%`}
            badgeVariant={totalProfitLoss >= 0 ? 'positive' : 'negative'}
            subtitle={totalRealizedPL !== 0 ? `Unrealized: ₹${Math.round(totalUnrealizedPL).toLocaleString('en-IN')} | Realized: ₹${Math.round(totalRealizedPL).toLocaleString('en-IN')}` : "Return on Invested Cost"}
            icon={<TrendingUp className="w-5 h-5 text-graphite" />}
          />

          <MetricCard
            title="Active Holdings"
            value={`${computedRealHoldings.length} Assets`}
            subtitle={`${realSectorAllocation.length} Distinct Sectors`}
            icon={<BarChart2 className="w-5 h-5 text-graphite" />}
          />

          <MetricCard
            title="Top Asset Segment"
            value={realSegmentAllocation[0]?.assetType || 'Equity'}
            badgeText={`${realSegmentAllocation[0]?.percentage || 0}%`}
            badgeVariant="silver"
            subtitle="Dominant Asset Class"
            icon={<Award className="w-5 h-5 text-graphite" />}
          />
        </div>

        {/* Performance Comparison & Asset Segment Donut */}
        <div className="space-y-6">
          {/* Unified Performance Comparison: My Portfolio vs NIFTY 50 vs Fixed Deposit */}
          <div className="flex items-center gap-2 mb-1">
            <LineChart className="w-4 h-4 text-graphite" />
            <h3 className="text-sm font-bold text-graphite tracking-tight uppercase">
              Performance Comparison
            </h3>
          </div>
          <PerformanceComparisonCard
            currentPortfolioValue={totalRealPortfolioValue}
            investedCapital={totalInvested}
          />

          {/* Asset Segment Allocation Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
              <AllocationDonut allocations={realSegmentAllocation} />
            </div>
          </div>
        </div>

        {/* Portfolio Diversification Analytics Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-graphite" />
            <h3 className="text-sm font-bold text-graphite tracking-tight uppercase">
              Portfolio Diversification Analytics
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sector Diversification (Interactive Donut & Bar chart) */}
            <div className="lg:col-span-6">
              <SectorDiversificationCard
                sectors={realSectorAllocation}
                totalPortfolioValue={totalRealPortfolioValue}
              />
            </div>

            {/* Top Outperformers & Underperformers */}
            <div className="lg:col-span-6 space-y-4">
              {/* Top Gainers */}
              <div className="p-5 bg-white rounded-2xl border border-silver-border shadow-silver-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-financial-positive" />
                  <h3 className="text-sm font-bold text-graphite">Top Gainers</h3>
                </div>
                {topGainers.length === 0 ? (
                  <p className="text-xs text-muted py-4 text-center">No holdings to rank</p>
                ) : (
                  <div className="space-y-2">
                    {topGainers.map(h => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-silver-light/40 border border-silver-border text-xs"
                      >
                        <div>
                          <span className="font-bold text-graphite">{h.symbol}</span>
                          <span className="text-[10px] text-muted block truncate max-w-[180px]">
                            {h.name} · {h.sector}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-financial-positive">
                            +{h.returnPercentage.toFixed(2)}%
                          </span>
                          <span className="text-[10px] text-muted block">
                            ₹{h.profitLoss.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lower Relative Performance */}
              <div className="p-5 bg-white rounded-2xl border border-silver-border shadow-silver-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-muted" />
                  <h3 className="text-sm font-bold text-graphite">Lower Relative Performance</h3>
                </div>
                {bottomPerformers.length === 0 ? (
                  <p className="text-xs text-muted py-4 text-center">No holdings to rank</p>
                ) : (
                  <div className="space-y-2">
                    {bottomPerformers.map(h => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-silver-light/40 border border-silver-border text-xs"
                      >
                        <div>
                          <span className="font-bold text-graphite">{h.symbol}</span>
                          <span className="text-[10px] text-muted block truncate max-w-[180px]">
                            {h.name} · {h.sector}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span
                            className={`font-bold ${
                              h.profitLoss >= 0 ? 'text-graphite' : 'text-financial-negative'
                            }`}
                          >
                            {h.profitLoss >= 0 ? '+' : ''}
                            {h.returnPercentage.toFixed(2)}%
                          </span>
                          <span className="text-[10px] text-muted block">
                            ₹{h.profitLoss.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
