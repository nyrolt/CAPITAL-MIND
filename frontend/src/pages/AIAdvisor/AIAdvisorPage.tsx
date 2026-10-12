import React, { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { AIInsightCard } from '../../components/ai/AIInsightCard';
import { AIPromptSelector } from '../../components/ai/AIPromptSelector';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useApp } from '../../context/AppContext';
import { Sparkles, Send, ShieldCheck } from 'lucide-react';

export const AIAdvisorPage: React.FC = () => {
  const { selectedPortfolio, aiInsights, askAIAdvisor } = useApp();
  const [customInput, setCustomInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRunPrompt = (promptText: string) => {
    setIsGenerating(true);
    setTimeout(() => {
      askAIAdvisor(promptText);
      setIsGenerating(false);
      setCustomInput('');
    }, 400);
  };

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    handleRunPrompt(customInput);
  };

  return (
    <AppShell pageTitle="CapitalMind AI Advisor">
      <div className="space-y-6">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-graphite via-graphite-dark to-graphite text-white rounded-3xl shadow-silver-lg space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/10 text-silver-light">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">CapitalMind AI Advisor</h2>
            <Badge variant="silver" size="sm">Prototype AI Engine</Badge>
          </div>
          <p className="text-xs text-silver-light leading-relaxed">
            Understand what your portfolio analytics are telling you. Structured, data-grounded insights designed for clear decision making.
          </p>
        </div>

        {/* Prompt Launcher & Input Box */}
        <div className="p-6 bg-white rounded-3xl border border-silver-border shadow-silver-sm space-y-4">
          <AIPromptSelector onSelectPrompt={handleRunPrompt} isLoading={isGenerating} />

          <form onSubmit={handleSubmitCustom} className="flex gap-2 pt-2 border-t border-silver-border">
            <input
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              placeholder="Ask AI Advisor about your portfolio risk, allocations, or drawdown exposure..."
              className="flex-1 px-4 py-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-xs text-graphite placeholder-muted outline-none focus:border-graphite"
            />
            <Button
              type="submit"
              disabled={isGenerating || !customInput.trim()}
              icon={<Send className="w-4 h-4" />}
            >
              Ask AI
            </Button>
          </form>
        </div>

        {/* Financial Safety Banner */}
        <div className="p-3.5 rounded-2xl bg-white border border-silver-border flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted">
            <ShieldCheck className="w-4 h-4 text-graphite shrink-0" />
            <span>
              <strong>CapitalMind Provides Analytical & Educational Insights:</strong> Does not guarantee returns or constitute regulated financial advice.
            </span>
          </div>
          <Badge variant="neutral" size="sm">Analytical Model</Badge>
        </div>

        {/* Insights Stream */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-graphite uppercase tracking-wider text-muted">
            AI Advisory Results ({aiInsights.length})
          </h3>

          <div className="space-y-6">
            {aiInsights.map(insight => (
              <AIInsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

