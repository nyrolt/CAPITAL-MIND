import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, ArrowRight } from 'lucide-react';
import { Badge } from '../common/Badge';

interface DiversificationCardProps {
  score: number;
  level: string;
  explanation?: string;
}

export const DiversificationCard: React.FC<DiversificationCardProps> = ({
  score,
  level,
  explanation = "Your portfolio is diversified across multiple assets, but sector concentration remains a key risk factor.",
}) => {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-white rounded-2xl border border-silver-border shadow-silver-sm flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-silver-light text-graphite border border-silver-border">
              <PieChart className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-graphite">Diversification Intelligence</h3>
          </div>
          <Badge variant={score >= 70 ? 'positive' : score >= 50 ? 'warning' : 'negative'}>
            Score: {score}/100 — {level}
          </Badge>
        </div>

        <div className="my-4 p-4 rounded-xl bg-background-secondary border border-silver-border">
          <p className="text-xs text-graphite leading-relaxed">{explanation}</p>
        </div>
      </div>

      <button
        onClick={() => navigate('/diversification')}
        className="flex items-center justify-between w-full pt-3 text-xs font-bold text-graphite hover:text-muted transition-colors border-t border-silver-border group"
      >
        <span>Analyze Diversification & HHI Index</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};

