import React from 'react';
import { Sparkles } from 'lucide-react';

interface AIPromptSelectorProps {
  onSelectPrompt: (prompt: string) => void;
  isLoading?: boolean;
}

export const AIPromptSelector: React.FC<AIPromptSelectorProps> = ({
  onSelectPrompt,
  isLoading = false,
}) => {
  const prompts = [
    "Explain my current portfolio risk",
    "Why is my risk score high?",
    "What is causing my concentration?",
    "Explain my diversification",
    "Summarize my portfolio performance",
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted mb-2">
        <Sparkles className="w-3.5 h-3.5 text-graphite" />
        <span>Suggested AI Analysis Prompts</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {prompts.map(p => (
          <button
            key={p}
            disabled={isLoading}
            onClick={() => onSelectPrompt(p)}
            className="px-3 py-1.5 text-xs font-medium text-graphite bg-white hover:bg-silver-light border border-silver-border hover:border-silver-dark rounded-xl shadow-silver-sm transition-all text-left disabled:opacity-50"
          >
            "{p}"
          </button>
        ))}
      </div>
    </div>
  );
};

