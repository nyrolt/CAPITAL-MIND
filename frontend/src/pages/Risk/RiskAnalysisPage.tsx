import React, { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { RiskGauge } from '../../components/risk/RiskGauge';
import { RiskFactorCard } from '../../components/risk/RiskFactorCard';
import { useApp } from '../../context/AppContext';
import { riskService } from '../../services/riskService';
import { PortfolioRiskAssessment } from '../../types';
import {
  ShieldAlert,
  AlertCircle,
  RefreshCw,
  Clock,
  TrendingUp,
  BarChart2,
  Layers,
} from 'lucide-react';

function formatTimestamp(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) + ' IST';
  } catch {
    return iso;
  }
}

function getRiskProfileBadge(level: string) {
  if (level === 'Very High' || level === 'High') {
    return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
  }
  if (level === 'Moderate') {
    return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
  }
  if (level === 'Insufficient data') {
    return { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };
  }
  return { bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC' };
}

export const RiskAnalysisPage: React.FC = () => {
  const { selectedPortfolio } = useApp();
  const p = selectedPortfolio;

  const [assessment, setAssessment] = useState<PortfolioRiskAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessment = useCallback(async () => {
    if (!p?.id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await riskService.getRiskAssessment(p);
      setAssessment(result);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load risk assessment. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [p?.id]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  const riskScore = assessment?.riskScore ?? p.riskScore;
  const riskLevel = assessment?.riskLevel ?? p.riskLevel;
  const riskFactors = assessment?.riskFactors ?? [];
  const divScore = assessment?.diversificationScore ?? null;
  const divLevel = assessment?.diversificationLevel ?? '—';
  const topHolding = assessment?.diversificationMetrics?.topHoldingConcentration ?? null;

  const sortedFactors = [...riskFactors].sort((a, b) => b.score - a.score);
  const topRiskFactor = sortedFactors[0] ?? null;
  const elevatedCount = riskFactors.filter(f => f.status === 'High' || f.status === 'Moderate').length;

  const badgeConfig = getRiskProfileBadge(riskLevel);

  return (
    <AppShell pageTitle="Portfolio Risk Analysis">
      <div className="space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-graphite tracking-tight">
              Risk Assessment
              {p?.name && <span className="ml-2 text-base font-normal text-muted">· {p.name}</span>}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Live quantitative assessment of concentration, sector exposure, and portfolio drawdown risk
            </p>
          </div>
          <button
            onClick={fetchAssessment}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-graphite bg-silver-light border border-silver-border hover:bg-silver-border transition-all disabled:opacity-50 shrink-0"
            aria-label="Refresh risk analysis"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* ── Error Banner ── */}
        {error && !loading && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3 text-xs text-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span><strong>Error: </strong>{error}</span>
            </div>
            <button
              onClick={fetchAssessment}
              className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-900 font-semibold text-xs shrink-0 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Top Overview Grid (Gauge Card + Metrics Summary) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Left: Clean Risk Gauge Card (Matching Reference Screenshot) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-silver-border shadow-silver-sm p-6 flex flex-col items-center justify-center">
            {loading ? (
              <div className="w-48 h-40 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-muted animate-spin" />
              </div>
            ) : (
              <>
                <RiskGauge score={riskScore ?? 0} level={riskLevel} size="lg" />
                {assessment?.calculatedAt && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted mt-4">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Calculated {formatTimestamp(assessment.calculatedAt)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Portfolio Risk Profile Summary */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-silver-border shadow-silver-sm p-6 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Overall Risk Profile
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border"
                  style={{
                    backgroundColor: badgeConfig.bg,
                    color: badgeConfig.text,
                    borderColor: badgeConfig.border,
                  }}
                >
                  {riskLevel} Risk
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-graphite">
                {topRiskFactor ? (
                  <>
                    Primary Risk Driver:{' '}
                    <span style={{ color: badgeConfig.text }}>{topRiskFactor.name}</span>
                    <span className="ml-1.5 text-xs font-mono font-bold text-muted">
                      ({topRiskFactor.score}/100)
                    </span>
                  </>
                ) : (
                  'Live Portfolio Risk Metrics'
                )}
              </h3>

              <p className="text-xs text-muted leading-relaxed mt-1.5">
                {loading ? (
                  'Computing risk metrics from your current holdings…'
                ) : topRiskFactor ? (
                  topRiskFactor.explanation
                ) : (
                  'Add holdings to this portfolio to generate a personalized risk assessment.'
                )}
              </p>
            </div>

            {/* Key Summary Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-silver-border">
              {/* Diversification */}
              <div className="p-3.5 rounded-xl bg-silver-light/60 border border-silver-border flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
                  <span>Diversification</span>
                  <BarChart2 className="w-3.5 h-3.5 text-muted" />
                </div>
                <div className="text-xl font-bold font-mono text-graphite my-1">
                  {divScore !== null ? divScore : '—'}
                </div>
                <div className="text-[10px] font-medium text-muted">
                  Level: <strong className="text-graphite">{divLevel}</strong>
                </div>
              </div>

              {/* Top Holding Concentration */}
              <div className="p-3.5 rounded-xl bg-silver-light/60 border border-silver-border flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
                  <span>Top Holding</span>
                  <TrendingUp className="w-3.5 h-3.5 text-muted" />
                </div>
                <div className="text-xl font-bold font-mono text-graphite my-1">
                  {topHolding !== null ? `${topHolding.toFixed(1)}%` : '—'}
                </div>
                <div className="text-[10px] font-medium text-muted">
                  Concentration
                </div>
              </div>

              {/* Elevated Factors */}
              <div className="p-3.5 rounded-xl bg-silver-light/60 border border-silver-border flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
                  <span>Elevated Factors</span>
                  <Layers className="w-3.5 h-3.5 text-muted" />
                </div>
                <div className="text-xl font-bold font-mono text-graphite my-1">
                  {elevatedCount} <span className="text-xs font-normal text-muted">/ {riskFactors.length}</span>
                </div>
                <div className="text-[10px] font-medium text-muted">
                  Moderate or High Risk
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ── Core Portfolio Risk Factors ── */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-graphite" />
              <h3 className="text-base font-bold text-graphite">Core Portfolio Risk Factors</h3>
            </div>
            <span className="text-xs text-muted font-medium">
              {riskFactors.length} factors evaluated
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-silver-light border border-silver-border animate-pulse"
                />
              ))}
            </div>
          ) : sortedFactors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedFactors.map(factor => (
                <RiskFactorCard key={factor.id} factor={factor} />
              ))}
            </div>
          ) : !error ? (
            <div className="p-8 text-center rounded-2xl bg-white border border-silver-border text-sm text-muted">
              No risk factors computed — this portfolio may have no holdings.
            </div>
          ) : null}
        </div>

        {/* ── CapitalMind Educational Notice ── */}
        <div className="p-4 rounded-2xl bg-white border border-silver-border flex items-start gap-3 text-xs text-muted">
          <AlertCircle className="w-4 h-4 text-graphite shrink-0 mt-0.5" />
          <span>
            <strong>CapitalMind Educational Notice:</strong> Risk scores are computed from
            holdings' market values, sector classifications, and asset-class composition.
            This analysis does not guarantee investment safety or future performance, and is not
            personalised financial advice.
          </span>
        </div>

      </div>
    </AppShell>
  );
};
