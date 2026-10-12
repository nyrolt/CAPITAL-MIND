import React from 'react';
import { AIInsight } from '../../types';
import { Sparkles, AlertCircle, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import { Badge } from '../common/Badge';

interface AIInsightCardProps {
  insight: AIInsight;
  onOpenFullAdvisor?: () => void;
  compact?: boolean;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
  insight,
  onOpenFullAdvisor,
  compact = false,
}) => {
  return (
    <div className="p-6 bg-gradient-to-b from-white via-background-secondary/30 to-white rounded-2xl border border-silver-dark/60 shadow-silver-md relative overflow-hidden">
      {/* Top Silver Glass Glow Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-silver-dark via-graphite to-silver-dark" />

      <div className="flex items-center justify-between mb-4 pb-3 border-b border-silver-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-graphite text-white shadow-silver-sm">
            <Sparkles className="w-4 h-4 text-silver-light" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-graphite tracking-tight">CapitalMind Intelligence</h3>
            <p className="text-[11px] text-muted">AI Portfolio Insight • {insight.category}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {insight.isLiveAI ? (
            <Badge variant="positive" size="sm">
              ✨ Live Gemini AI ({insight.modelName || 'gemini-flash-lite-latest'})
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">
              ⚙️ {insight.modelName || 'Rule-based Engine'}
            </Badge>
          )}
          <Badge variant="silver" size="sm">
            Educational & Analytical
          </Badge>
        </div>
      </div>

      {/* Structured Sections */}
      <div className="space-y-3 text-xs text-graphite">
        {insight.query && (
          <div className="p-2.5 rounded-xl bg-silver-light/60 border border-silver-border text-muted italic">
            "{insight.query}"
          </div>
        )}

        <div className="p-3 rounded-xl bg-white border border-silver-border">
          <span className="font-semibold text-muted text-[11px] uppercase tracking-wider block mb-1">
            Portfolio Summary
          </span>
          <p className="leading-relaxed">{insight.portfolioSummary}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-financial-warningBg/60 border border-financial-warningBorder">
            <span className="font-semibold text-financial-warning text-[11px] uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Risk Observation
            </span>
            <p className="leading-relaxed text-graphite">{insight.riskObservation}</p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-silver-border">
            <span className="font-semibold text-muted text-[11px] uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Diversification Observation
            </span>
            <p className="leading-relaxed">{insight.diversificationObservation}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-graphite text-white shadow-silver-sm">
          <span className="font-semibold text-silver text-[10px] uppercase tracking-wider block mb-1">
            Recommendation
          </span>
          <p className="leading-relaxed font-medium">{insight.recommendation}</p>
        </div>
      </div>

      {/* Footer Disclaimer & Action */}
      <div className="mt-4 pt-3 border-t border-silver-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[10px] text-muted">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-muted" />
          <span>CapitalMind provides analytical insight based on data. Does not constitute regulated financial advice.</span>
        </div>

        {onOpenFullAdvisor && (
          <button
            onClick={onOpenFullAdvisor}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-graphite hover:text-muted transition-colors shrink-0"
          >
            <span>Open AI Advisor</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

