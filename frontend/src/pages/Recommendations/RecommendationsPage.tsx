import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { useApp } from '../../context/AppContext';
import { recommendationService } from '../../services/recommendationService';
import { Recommendation } from '../../types';
import {
  AlertTriangle, RefreshCw, AlertCircle, CheckCircle2,
  ArrowUpRight, ShieldAlert, Layers
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSeverityStyles(severity: string) {
  if (severity === 'High') return {
    border: '#FCA5A5', bg: '#FEF2F2', accent: '#EF4444',
    text: '#991B1B', badgeBg: '#FEE2E2', badgeText: '#B91C1C',
    icon: <AlertTriangle className="w-4 h-4" style={{ color: '#EF4444' }} />,
  };
  if (severity === 'Medium') return {
    border: '#FCD34D', bg: '#FFFBEB', accent: '#F59E0B',
    text: '#92400E', badgeBg: '#FEF3C7', badgeText: '#92400E',
    icon: <AlertCircle className="w-4 h-4" style={{ color: '#F59E0B' }} />,
  };
  return {
    border: '#86EFAC', bg: '#F0FDF4', accent: '#22C55E',
    text: '#15803D', badgeBg: '#DCFCE7', badgeText: '#166534',
    icon: <CheckCircle2 className="w-4 h-4" style={{ color: '#22C55E' }} />,
  };
}

function getCategoryIcon(category: string) {
  if (category === 'Sector Concentration' || category === 'Concentration')
    return <ShieldAlert className="w-3.5 h-3.5" />;
  return <Layers className="w-3.5 h-3.5" />;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export const RecommendationsPage: React.FC = () => {
  const { selectedPortfolio } = useApp();
  const p = selectedPortfolio;

  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const fetchRecs = useCallback(async () => {
    if (!p?.id) return;
    setLoading(true); setError(null);
    try {
      const data = await recommendationService.getRecommendations(p.id);
      setRecs(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load recommendations.');
    } finally {
      setLoading(false);
    }
  }, [p?.id]);

  useEffect(() => { fetchRecs(); }, [fetchRecs]);

  // Derive categories from live data
  const categories = ['All', ...Array.from(new Set(recs.map(r => r.category)))];
  const filtered = filterCategory === 'All' ? recs : recs.filter(r => r.category === filterCategory);

  const highCount = recs.filter(r => r.severity === 'High').length;
  const medCount  = recs.filter(r => r.severity === 'Medium').length;

  return (
    <AppShell pageTitle="Actionable Recommendations">
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-graphite tracking-tight">
              Rebalancing Recommendations
              {p?.name && <span className="ml-2 text-base font-normal text-muted">· {p.name}</span>}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Prioritised structural adjustments computed from your portfolio's live risk metrics
            </p>
          </div>
          <button
            onClick={fetchRecs} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-graphite bg-silver-light border border-silver-border hover:bg-silver-border transition-all disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* ── Summary strip ── */}
        {!loading && !error && recs.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border bg-red-50 border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-bold text-red-700">{highCount}</span>
              <span className="text-xs text-red-600 font-medium">High Priority</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border bg-amber-50 border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold text-amber-700">{medCount}</span>
              <span className="text-xs text-amber-600 font-medium">Medium Priority</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border bg-silver-light border-silver-border">
              <ShieldAlert className="w-4 h-4 text-muted" />
              <span className="text-sm font-bold text-graphite">{recs.length}</span>
              <span className="text-xs text-muted font-medium">Total</span>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3 text-xs text-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span><strong>Error: </strong>{error}</span>
            </div>
            <button
              onClick={fetchRecs}
              className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-900 font-semibold text-xs shrink-0 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Category filter pills ── */}
        {!loading && !error && categories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                  filterCategory === cat
                    ? 'bg-graphite text-white shadow-silver-sm'
                    : 'bg-white text-muted hover:text-graphite border border-silver-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-silver-light border border-silver-border animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Recommendation cards ── */}
        {!loading && !error && (
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-2xl border border-silver-border text-sm text-muted">
                {recs.length === 0
                  ? 'No recommendations generated — your portfolio looks well-structured, or has no holdings.'
                  : 'No recommendations match the selected category.'}
              </div>
            ) : (
              filtered.map(rec => {
                const s = getSeverityStyles(rec.severity);
                return (
                  <div
                    key={rec.id}
                    className="rounded-2xl border shadow-silver-sm overflow-hidden hover:shadow-silver-md transition-all"
                    style={{ borderColor: s.border, backgroundColor: 'white' }}
                  >
                    {/* Coloured top stripe */}
                    <div className="h-1 w-full" style={{ backgroundColor: s.accent }} />

                    <div className="p-5 space-y-3">
                      {/* Top row: category + severity + date */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {/* Category chip */}
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-silver-light border border-silver-border text-muted">
                            {getCategoryIcon(rec.category)}
                            {rec.category}
                          </span>
                          {/* Severity badge */}
                          <span
                            className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide"
                            style={{ backgroundColor: s.badgeBg, color: s.badgeText }}
                          >
                            {s.icon && <span className="inline-block mr-1 align-middle">{s.icon}</span>}
                            {rec.severity} Priority
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-muted">
                          {rec.createdDate}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-graphite">{rec.title}</h3>

                      {/* Recommendation box */}
                      <div
                        className="p-3.5 rounded-xl text-xs font-medium leading-relaxed"
                        style={{ backgroundColor: s.bg, borderLeft: `3px solid ${s.accent}`, color: s.text }}
                      >
                        <strong>Recommendation:</strong>{' '}{rec.recommendation}
                      </div>

                      {/* Explanation */}
                      <p className="text-xs text-muted leading-relaxed">{rec.explanation}</p>

                      {/* Footer */}
                      <div className="pt-2 border-t border-silver-border flex items-center justify-between text-xs">
                        <span className="text-[11px] text-muted italic">
                          Analytical Recommendation · Educational Insight
                        </span>
                        <button className="flex items-center gap-1 text-[11px] font-semibold text-graphite hover:text-financial-warning transition-colors">
                          Review Allocation <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Disclaimer ── */}
        <div className="p-4 rounded-2xl bg-white border border-silver-border flex items-start gap-3 text-xs text-muted">
          <AlertCircle className="w-4 h-4 text-graphite shrink-0 mt-0.5" />
          <span>
            <strong>CapitalMind Educational Notice:</strong> Recommendations are generated
            algorithmically from your portfolio's quantitative risk metrics. They are not
            personalised financial advice and do not account for your tax situation,
            liquidity needs, or investment horizon.
          </span>
        </div>

      </div>
    </AppShell>
  );
};


