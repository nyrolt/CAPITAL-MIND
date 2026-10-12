import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { MetricCard } from '../../components/portfolio/MetricCard';
import { PerformanceChart } from '../../components/charts/PerformanceChart';
import { AllocationDonut } from '../../components/charts/AllocationDonut';
import { SectorBarChart } from '../../components/charts/SectorBarChart';
import { HoldingTable } from '../../components/portfolio/HoldingTable';
import { AIInsightCard } from '../../components/ai/AIInsightCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useApp } from '../../context/AppContext';
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  ShieldAlert,
  PieChart,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';

export const PortfolioDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { portfolios, aiInsights, isLoading } = useApp();
  const [showMethodology, setShowMethodology] = useState(false);

  if (isLoading) {
    return (
      <AppShell pageTitle="Portfolio Details">
        <div className="space-y-6">
          <LoadingSkeleton count={4} />
        </div>
      </AppShell>
    );
  }

  const portfolio = portfolios.find((p) => p.id === id) || (id ? null : portfolios[0]);

  if (!portfolio) {
    return (
      <AppShell pageTitle="Portfolio Not Found">
        <div className="space-y-6">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/portfolios')}
          >
            Back to All Portfolios
          </Button>
          <EmptyState
            title="Portfolio Not Found"
            description="The requested portfolio could not be found or you do not have permission to view it."
            icon={<Wallet className="w-8 h-8" />}
            actionText="Return to Portfolios"
            onAction={() => navigate('/portfolios')}
          />
        </div>
      </AppShell>
    );
  }

  const insight = aiInsights.find((ai) => ai.portfolioId === portfolio.id) || aiInsights[0];
  const hasHoldings = portfolio.holdings && portfolio.holdings.length > 0;

  return (
    <AppShell pageTitle={`Portfolio: ${portfolio.name}`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/portfolios')}
          >
            Back to All Portfolios
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Info className="w-4 h-4 text-graphite/70" />}
              onClick={() => setShowMethodology(!showMethodology)}
            >
              {showMethodology ? 'Hide Methodology' : 'Score & Calculation Methodology'}
            </Button>
            <Badge variant="silver">{portfolio.riskPreference} Risk Target</Badge>
          </div>
        </div>

        {/* Methodology Card (Collapsible) */}
        {showMethodology && (
          <div className="p-6 bg-silver-light/40 rounded-3xl border border-silver-border shadow-silver-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-graphite" />
                <h3 className="text-base font-bold text-graphite">Analytics & Methodology Documentation</h3>
              </div>
              <button
                onClick={() => setShowMethodology(false)}
                className="text-xs text-muted hover:text-graphite font-semibold"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-graphite/85">
              <div className="p-4 bg-white rounded-2xl border border-silver-border space-y-2">
                <h4 className="font-bold text-graphite flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-financial-positive" />
                  Portfolio Metric Reconciliation
                </h4>
                <ul className="space-y-1 text-muted leading-relaxed">
                  <li>• <strong>Portfolio Value:</strong> Exact sum of current holding market values (₹{Math.round(portfolio.totalValue).toLocaleString('en-IN')}).</li>
                  <li>• <strong>Invested Capital:</strong> Sum of (quantity × average buy price) across all holdings (₹{Math.round(portfolio.investedCapital).toLocaleString('en-IN')}).</li>
                  <li>• <strong>Unrealised P/L:</strong> Portfolio Value − Invested Capital ({portfolio.profitLoss >= 0 ? '+' : ''}₹{Math.round(portfolio.profitLoss).toLocaleString('en-IN')}).</li>
                  <li>• <strong>Chart vs Headline P/L:</strong> Headline P/L is all-time cumulative gain since inception. Performance chart displays timeframe-specific returns (1M, 3M, etc.) from start of period to today.</li>
                </ul>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-silver-border space-y-2">
                <h4 className="font-bold text-graphite flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-graphite" />
                  Risk & Diversification Scoring
                </h4>
                <ul className="space-y-1 text-muted leading-relaxed">
                  <li>• <strong>Risk Score (0–100):</strong> Higher score = <em>greater concentration & drawdown risk</em> (NOT a health score). Formula: 40% position concentration (HHI) + 35% sector excess (&gt;30%) + 25% equity class weight.</li>
                  <li>• <strong>Diversification (0–100):</strong> Higher score = <em>broader asset & sector distribution</em>. Formula: 40% position breadth + 35% sector breadth + 25% multi-asset breadth.</li>
                  <li>• <strong>Missing Data:</strong> Portfolios with zero holdings display “Insufficient data” instead of an arbitrary score.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Overview Banner */}
        <div className="p-6 bg-white rounded-3xl border border-silver-border shadow-silver-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-extrabold text-graphite">{portfolio.name}</h1>
              <p className="text-xs text-muted">{portfolio.objective} • Created {portfolio.createdAt}</p>
            </div>
            <span className="text-xs font-mono font-semibold text-graphite bg-silver-light px-3 py-1.5 rounded-xl border border-silver-border">
              {portfolio.holdings.length} Assets Held
            </span>
          </div>
          <p className="text-xs text-graphite/80 leading-relaxed max-w-3xl">
            {portfolio.description || 'Custom user investment portfolio.'}
          </p>
        </div>

        {/* Key Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Portfolio Market Value"
            value={`₹${Math.round(portfolio.totalValue).toLocaleString('en-IN')}`}
            subtitle={`Cost Basis: ₹${Math.round(portfolio.investedCapital).toLocaleString('en-IN')}`}
            icon={<Wallet className="w-5 h-5 text-graphite" />}
          />

          <MetricCard
            title="Total Profit / Loss"
            value={`${portfolio.profitLoss >= 0 ? '+' : ''}₹${Math.round(portfolio.profitLoss).toLocaleString('en-IN')}`}
            badgeText={`${portfolio.profitLoss >= 0 ? '+' : ''}${portfolio.returnPercentage.toFixed(2)}%`}
            badgeVariant={portfolio.profitLoss >= 0 ? 'positive' : 'negative'}
            icon={<TrendingUp className="w-5 h-5 text-graphite" />}
            subtitle={portfolio.realizedProfitLoss && portfolio.realizedProfitLoss !== 0 ? `Unrealized: ₹${Math.round(portfolio.unrealizedProfitLoss || 0).toLocaleString('en-IN')} | Realized: ₹${Math.round(portfolio.realizedProfitLoss).toLocaleString('en-IN')}` : "Return on remaining cost basis"}
          />

          {/* Risk Score */}
          <div
            className="p-5 bg-white rounded-2xl border border-silver-border shadow-silver-sm hover:shadow-silver-md transition-all duration-200 group"
            title="Risk Score: higher score = more concentrated / higher market drawdown risk"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted tracking-wide uppercase">Risk Score</span>
              <div className="p-2 rounded-xl bg-silver-light border border-silver-border/60 text-graphite">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-graphite font-sans">
                {hasHoldings && portfolio.riskScore !== null && portfolio.riskScore !== undefined
                  ? `${portfolio.riskScore} / 100`
                  : 'Insufficient data'}
              </h2>
              <Badge variant={portfolio.riskScore && portfolio.riskScore >= 60 ? 'warning' : 'neutral'}>
                {portfolio.riskLevel}
              </Badge>
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-muted">
              <Info className="w-3 h-3 shrink-0" />
              <span>Higher score = higher concentration risk (not health)</span>
            </div>
          </div>

          {/* Diversification Score */}
          <div
            className="p-5 bg-white rounded-2xl border border-silver-border shadow-silver-sm hover:shadow-silver-md transition-all duration-200 group"
            title="Diversification Score: higher score = better spread across positions and sectors"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted tracking-wide uppercase">Diversification</span>
              <div className="p-2 rounded-xl bg-silver-light border border-silver-border/60 text-graphite">
                <PieChart className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-graphite font-sans">
                {hasHoldings && portfolio.diversificationScore !== null && portfolio.diversificationScore !== undefined
                  ? `${portfolio.diversificationScore} / 100`
                  : 'Insufficient data'}
              </h2>
              <Badge variant={portfolio.diversificationScore && portfolio.diversificationScore >= 70 ? 'positive' : 'neutral'}>
                {portfolio.diversificationLevel}
              </Badge>
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-muted">
              <Info className="w-3 h-3 shrink-0" />
              <span>Higher score = more diversified</span>
            </div>
          </div>
        </div>

        {/* Performance Chart + Asset Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <PerformanceChart
              portfolioId={portfolio.id}
              currentPortfolioValue={portfolio.totalValue}
              investedCapital={portfolio.investedCapital}
              headlineProfitLoss={portfolio.profitLoss}
              headlineReturnPercentage={portfolio.returnPercentage}
              createdAt={portfolio.createdAt}
            />
          </div>
          <div className="lg:col-span-4">
            <AllocationDonut allocations={portfolio.assetAllocation} />
          </div>
        </div>

        {/* AI Insight + Sector Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            {insight && <AIInsightCard insight={insight} onOpenFullAdvisor={() => navigate('/ai-advisor')} />}
          </div>
          <div className="lg:col-span-5">
            <SectorBarChart sectors={portfolio.sectorAllocation} />
          </div>
        </div>

        {/* Holdings Table */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-graphite">Portfolio Holdings</h3>
          <HoldingTable holdings={portfolio.holdings} />
        </div>
      </div>
    </AppShell>
  );
};
