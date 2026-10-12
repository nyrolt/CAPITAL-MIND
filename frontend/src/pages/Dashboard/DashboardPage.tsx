import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { MetricCard } from '../../components/portfolio/MetricCard';
import { PerformanceChart } from '../../components/charts/PerformanceChart';
import { AllocationDonut } from '../../components/charts/AllocationDonut';
import { SectorBarChart } from '../../components/charts/SectorBarChart';
import { RiskFactorCard } from '../../components/risk/RiskFactorCard';
import { DiversificationCard } from '../../components/risk/DiversificationCard';
import { AIInsightCard } from '../../components/ai/AIInsightCard';
import { HoldingTable } from '../../components/portfolio/HoldingTable';
import { TransactionTable } from '../../components/portfolio/TransactionTable';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { useApp } from '../../context/AppContext';
import { riskService } from '../../services/riskService';
import { RiskFactor } from '../../types';
import {
  Wallet,
  TrendingUp,
  ShieldAlert,
  PieChart,
  ArrowRight,
  Bell,
  Sparkles,
  Layers,
  Receipt,
  Activity,
  FileText
} from 'lucide-react';
import { tradingService } from '../../services/tradingService';
import { PaperAccount } from '../../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [paperAccount, setPaperAccount] = React.useState<PaperAccount | null>(null);
  const [liveRiskFactors, setLiveRiskFactors] = React.useState<RiskFactor[]>([]);
  const [riskLoading, setRiskLoading] = React.useState(false);

  const {
    selectedPortfolio,
    user,
    aiInsights,
    notifications,
    isLoading,
    error,
    refreshPortfolios,
    portfolios,
  } = useApp();

  React.useEffect(() => {
    tradingService.getPaperAccount().then(setPaperAccount).catch(() => {});
  }, [selectedPortfolio.totalValue]);

  // Fetch live risk factors from backend whenever the selected portfolio changes
  React.useEffect(() => {
    if (!selectedPortfolio?.id) return;
    setRiskLoading(true);
    riskService.getRiskAssessment(selectedPortfolio)
      .then(assessment => {
        setLiveRiskFactors(assessment.riskFactors ?? []);
      })
      .catch(() => {
        // On failure keep existing (or empty) — don't fall back to demo data
        setLiveRiskFactors([]);
      })
      .finally(() => setRiskLoading(false));
  }, [selectedPortfolio?.id]);

  const p = selectedPortfolio;
  const topSector = p.sectorAllocation[0];
  const latestInsight = aiInsights[0] || {
    id: 'ai_dash',
    portfolioId: p.id,
    portfolioSummary: `Your portfolio currently has an invested capital of ₹${p.investedCapital.toLocaleString('en-IN')} with total net value standing at ₹${p.totalValue.toLocaleString('en-IN')}.`,
    riskObservation: topSector
      ? `${topSector.sector} is your dominant sector at ${topSector.percentage.toFixed(1)}%, contributing to your Risk Score of ${p.riskScore ?? 'N/A'}/100 (${p.riskLevel}).`
      : `Your Risk Score is ${p.riskScore ?? 'N/A'}/100 (${p.riskLevel}).`,
    diversificationObservation: p.holdings.length > 0
      ? `Portfolio spans ${p.holdings.length} holdings across ${p.sectorAllocation.length} sector(s) and ${p.assetAllocation.length} asset class(es).`
      : 'No holdings in this portfolio yet.',
    recommendation: `Review sector concentration and consider whether the current allocation aligns with your intended target risk level.`,
    priority: 'High' as const,
    timestamp: 'Just now',
    category: 'Sector Risk Audit',
  };

  const riskAlerts = notifications.filter(n => n.category === 'Risk' || !n.isRead).slice(0, 3);

  return (
    <AppShell pageTitle="Portfolio Intelligence Overview">
      <div className="space-y-8 pb-12">
        {error && (
          <div className="p-4 rounded-2xl bg-financial-negativeBg border border-financial-negative/30 flex items-center justify-between text-xs text-financial-negative">
            <span>{error}</span>
            <button
              onClick={() => refreshPortfolios()}
              className="font-bold underline hover:no-underline ml-4"
            >
              Retry
            </button>
          </div>
        )}
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-white via-background-secondary to-white rounded-3xl border border-silver-border shadow-silver-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">Good evening,</span>
              <span className="text-xs font-bold text-graphite">{user.name}</span>
              <Badge variant="silver" size="sm">Retail Investor</Badge>
            </div>
            <h1 className="text-2xl font-extrabold text-graphite tracking-tight mt-1">
              Here's your portfolio intelligence overview.
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={<Sparkles className="w-4 h-4 text-graphite" />}
              onClick={() => navigate('/ai-advisor')}
            >
              Open AI Advisor
            </Button>
            <Button
              size="sm"
              icon={<Layers className="w-4 h-4" />}
              onClick={() => navigate('/holdings')}
            >
              View Holdings
            </Button>
          </div>
        </div>

        {/* Paper Trading Account Overview Bar */}
        <div className="p-5 bg-gradient-to-r from-silver-light/80 via-white to-silver-light/80 rounded-3xl border border-silver-border flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-silver-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-graphite text-white flex items-center justify-center font-bold shadow-silver-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-graphite uppercase tracking-wider">Paper Trading Account</span>
                <Badge variant="silver" size="sm">SIMULATED</Badge>
              </div>
              <p className="text-[11px] text-muted">Virtual cash balance and simulated investment results</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 sm:gap-8 text-xs">
            <div>
              <p className="text-[10px] text-muted uppercase font-semibold">Available Paper Cash</p>
              <p className="text-sm font-black text-graphite">
                ₹{paperAccount ? paperAccount.available_cash.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '10,00,000.00'}
              </p>
            </div>
            <div className="h-8 w-px bg-silver-border hidden sm:block" />
            <div>
              <p className="text-[10px] text-muted uppercase font-semibold">Paper Portfolio Value</p>
              <p className="text-sm font-black text-graphite">
                ₹{paperAccount ? paperAccount.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '10,00,000.00'}
              </p>
            </div>
            <div className="h-8 w-px bg-silver-border hidden sm:block" />
            <div>
              <p className="text-[10px] text-muted uppercase font-semibold">Paper Total P/L</p>
              <p className={`text-sm font-black ${paperAccount && paperAccount.total_pnl >= 0 ? 'text-financial-positive' : 'text-financial-negative'}`}>
                {paperAccount && paperAccount.total_pnl >= 0 ? '+' : ''}₹{paperAccount ? paperAccount.total_pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/orders')}
                icon={<FileText className="w-3.5 h-3.5" />}
              >
                Orders
              </Button>
            </div>
          </div>
        </div>

        {/* 4 Main Metric Cards */}
        {isLoading ? (
          <LoadingSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Portfolio Value"
              value={`₹${p.totalValue.toLocaleString('en-IN')}`}
              subtitle={`Invested: ₹${p.investedCapital.toLocaleString('en-IN')}`}
              icon={<Wallet className="w-5 h-5 text-graphite" />}
            />

            <MetricCard
              title="Total Profit / Loss"
              value={`${p.profitLoss >= 0 ? '+' : ''}₹${p.profitLoss.toLocaleString('en-IN')}`}
              badgeText={`${p.profitLoss >= 0 ? '+' : ''}${p.returnPercentage.toFixed(2)}%`}
              badgeVariant={p.profitLoss >= 0 ? 'positive' : 'negative'}
              subtitle={p.realizedProfitLoss && p.realizedProfitLoss !== 0 ? `Unrealized: ₹${Math.round(p.unrealizedProfitLoss || 0).toLocaleString('en-IN')} | Realized: ₹${Math.round(p.realizedProfitLoss).toLocaleString('en-IN')}` : "Overall Return on Cost"}
              icon={<TrendingUp className="w-5 h-5 text-graphite" />}
            />

            <MetricCard
              title="Risk Score"
              value={p.riskScore !== null && p.riskScore !== undefined ? `${p.riskScore} / 100` : 'Insufficient data'}
              badgeText={p.riskLevel}
              badgeVariant={p.riskScore && p.riskScore > 65 ? 'warning' : 'neutral'}
              subtitle="Primary Risk Level"
              icon={<ShieldAlert className="w-5 h-5 text-graphite" />}
            />

            <MetricCard
              title="Diversification"
              value={p.diversificationScore !== null && p.diversificationScore !== undefined ? `${p.diversificationScore} / 100` : 'Insufficient data'}
              badgeText={p.diversificationLevel}
              badgeVariant={p.diversificationScore && p.diversificationScore >= 70 ? 'positive' : 'neutral'}
              subtitle="HHI Clustering Metric"
              icon={<PieChart className="w-5 h-5 text-graphite" />}
            />
          </div>
        )}

        {/* Performance Chart & Allocation Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <PerformanceChart
              portfolioId={p?.id}
              currentPortfolioValue={p?.totalValue}
              investedCapital={p?.investedCapital}
              headlineProfitLoss={p?.profitLoss}
              headlineReturnPercentage={p?.returnPercentage}
              createdAt={p?.createdAt}
            />
          </div>

          <div className="lg:col-span-4">
            <AllocationDonut allocations={p.assetAllocation} />
          </div>
        </div>

        {/* AI Insight Panel & Sector Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <AIInsightCard
              insight={latestInsight}
              onOpenFullAdvisor={() => navigate('/ai-advisor')}
            />
          </div>

          <div className="lg:col-span-5">
            <SectorBarChart sectors={p.sectorAllocation} />
          </div>
        </div>

        {/* Risk Intelligence & Diversification Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-graphite" />
                <h3 className="text-base font-bold text-graphite">Risk Intelligence</h3>
              </div>
              <button
                onClick={() => navigate('/risk')}
                className="text-xs font-bold text-graphite hover:text-muted flex items-center gap-1"
              >
                View Detailed Risk Analysis <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {riskLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-2xl bg-silver-light border border-silver-border animate-pulse" />
                ))
              ) : liveRiskFactors.length > 0 ? (
                liveRiskFactors.slice(0, 4).map(rf => (
                  <RiskFactorCard key={rf.id} factor={rf} />
                ))
              ) : (
                // Risk factors not yet loaded — show placeholder prompt
                <div className="col-span-2 p-4 text-xs text-muted text-center rounded-2xl bg-silver-light border border-silver-border">
                  Risk factors will appear once live data is available. Visit{' '}
                  <button
                    className="font-semibold underline hover:no-underline"
                    onClick={() => navigate('/risk')}
                  >
                    Risk Analysis
                  </button>{' '}for detailed metrics.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <DiversificationCard
              score={p.diversificationScore ?? 0}
              level={p.diversificationLevel}
              explanation={
                topSector
                  ? `Your portfolio '${p.name}' spans ${p.holdings.length} holdings across ${p.sectorAllocation.length} sector(s). The dominant sector is ${topSector.sector} at ${topSector.percentage.toFixed(1)}% of total value.`
                  : `Your portfolio '${p.name}' has ${p.holdings.length} holding(s). Add more holdings to improve diversification.`
              }
            />
          </div>
        </div>

        {/* Top Holdings Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-graphite" />
              <h3 className="text-base font-bold text-graphite">Top Portfolio Holdings</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/holdings')}
            >
              View All Holdings
            </Button>
          </div>

          <HoldingTable holdings={p.holdings.slice(0, 5)} showActions={false} />
        </div>

        {/* Transactions & Alerts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-graphite" />
                <h3 className="text-base font-bold text-graphite">Recent Transactions</h3>
              </div>
              <button
                onClick={() => navigate('/transactions')}
                className="text-xs font-bold text-graphite hover:text-muted flex items-center gap-1"
              >
                Full Ledger <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <TransactionTable transactions={p.transactions.slice(0, 4)} />
          </div>

          {/* Risk Alerts Panel */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-graphite" />
                <h3 className="text-base font-bold text-graphite">Risk & Intelligence Alerts</h3>
              </div>
              <button
                onClick={() => navigate('/notifications')}
                className="text-xs font-bold text-graphite hover:text-muted"
              >
                View All
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-silver-border shadow-silver-sm space-y-3">
              {riskAlerts.map(alt => (
                <div key={alt.id} className="p-3 rounded-xl bg-silver-light/50 border border-silver-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-graphite">{alt.title}</span>
                    <span className="text-[10px] text-muted">{alt.timestamp}</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{alt.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

