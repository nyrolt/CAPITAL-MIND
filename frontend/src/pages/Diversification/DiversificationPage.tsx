import React, { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { Badge } from '../../components/common/Badge';
import { useApp } from '../../context/AppContext';
import { riskService } from '../../services/riskService';
import { PortfolioRiskAssessment } from '../../types';
import { PieChart, AlertCircle, CheckCircle2, Info, RefreshCw } from 'lucide-react';

export const DiversificationPage: React.FC = () => {
  const { selectedPortfolio } = useApp();
  const p = selectedPortfolio;

  const [assessment, setAssessment] = useState<PortfolioRiskAssessment | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!p?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await riskService.getRiskAssessment(p);
      setAssessment(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch diversification metrics');
    } finally {
      setLoading(false);
    }
  }, [p?.id]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const divMetrics = assessment?.diversificationMetrics;
  const hhi = divMetrics?.hhiIndex ?? 0;
  const top2Conc = divMetrics?.topHoldingConcentration ?? 0;
  const assetScore = divMetrics?.assetDiversificationScore ?? (p.diversificationScore ?? 0);
  const sectorScore = divMetrics?.sectorDiversificationScore ?? (p.diversificationScore ?? 0);

  return (
    <AppShell pageTitle="Diversification Breakdown">
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-graphite tracking-tight">Diversification Audit: {p.name}</h2>
            <p className="text-xs text-muted mt-0.5">Asset dispersion and concentration measures computed from live holdings</p>
          </div>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-silver-border bg-white text-xs font-semibold text-graphite hover:bg-silver-light transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Recalculate
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-financial-negativeBg border border-financial-negativeBorder text-financial-negative text-xs">
            {error}
          </div>
        )}

        {/* Score Header */}
        <div className="p-8 bg-white rounded-3xl border border-silver-border shadow-silver-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <Badge variant="positive">Diversification Score</Badge>
            <h1 className="text-4xl font-extrabold text-graphite tracking-tight">
              {p.diversificationScore !== null && p.diversificationScore !== undefined ? p.diversificationScore : '—'} <span className="text-lg font-normal text-muted">/ 100</span>
            </h1>
            <p className="text-xs text-muted max-w-lg leading-relaxed">
              Your portfolio is distributed across {p.holdings.length} assets, with an HHI concentration factor of {hhi.toFixed(3)}.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="p-4 rounded-2xl bg-silver-light/60 border border-silver-border text-center">
              <span className="text-[10px] uppercase font-semibold text-muted">HHI Index</span>
              <p className="text-xl font-mono font-bold text-graphite mt-1">{hhi.toFixed(3)}</p>
              <span className="text-[10px] text-muted">Concentration Metric</span>
            </div>

            <div className="p-4 rounded-2xl bg-silver-light/60 border border-silver-border text-center">
              <span className="text-[10px] uppercase font-semibold text-muted">Top Holding Concentration</span>
              <p className="text-xl font-mono font-bold text-graphite mt-1">{top2Conc}%</p>
              <span className="text-[10px] text-muted">{p.holdings[0]?.symbol || 'None'}</span>
            </div>
          </div>
        </div>

        {/* HHI Index Explainer */}
        <div className="p-6 bg-gradient-to-r from-silver-light/80 via-white to-silver-light/80 rounded-3xl border border-silver-border shadow-silver-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-graphite text-sm">
            <Info className="w-4 h-4 text-graphite" />
            <span>Understanding the Herfindahl-Hirschman Index (HHI)</span>
          </div>
          <p className="text-xs text-graphite/90 leading-relaxed">
            {divMetrics?.hhiExplanation || `HHI is evaluated across your holdings to measure asset concentration. Lower values indicate healthy diversification, whereas higher scores indicate vulnerability to single-holding downturns.`}
          </p>
          <div className="p-3 bg-white rounded-xl border border-silver-border text-[11px] text-muted">
            Disclaimer: HHI is an analytical tool used in CapitalMind for educational comparison and is not investment advice.
          </div>
        </div>

        {/* Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-silver-border shadow-silver-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-graphite flex items-center gap-2">
                <PieChart className="w-4 h-4" /> Asset Class Diversification
              </h3>
              <Badge variant="neutral">{assetScore}/100</Badge>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Your capital is spread across {p.assetAllocation.length} asset classes: {p.assetAllocation.map(a => `${a.assetType} (${a.percentage}%)`).join(', ') || 'None'}.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-silver-border shadow-silver-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-graphite flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Sector Diversification
              </h3>
              <Badge variant="warning">{sectorScore}/100</Badge>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Direct exposure spans {p.sectorAllocation.length} industry sectors. The largest sector ({p.sectorAllocation[0]?.sector || 'None'}) represents {p.sectorAllocation[0]?.percentage || 0}%.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
};


