import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, ShieldAlert, Layers, Briefcase } from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    {
      title: "Welcome to CapitalMind",
      subtitle: "Portfolio Intelligence & Risk Advisory for Indian Retail Investors",
      icon: Sparkles,
      content: (
        <div className="space-y-4 text-xs text-graphite text-left">
          <p className="leading-relaxed text-muted">
            CapitalMind helps you understand your portfolio value, gain/loss metrics, sector concentration, and risk factors through intuitive structured intelligence.
          </p>
          <div className="p-4 rounded-2xl bg-silver-light/60 border border-silver-border space-y-2">
            <div className="flex items-center gap-2 font-bold text-graphite">
              <CheckCircle2 className="w-4 h-4 text-financial-positive" /> Core Product Message
            </div>
            <p className="italic text-muted">"Understand Your Portfolio. Think Beyond the Numbers."</p>
          </div>
        </div>
      ),
    },
    {
      title: "Create Your First Portfolio",
      subtitle: "Organize assets into customized investment buckets",
      icon: Briefcase,
      content: (
        <div className="space-y-3 text-xs text-left">
          <div className="p-4 bg-white rounded-2xl border border-silver-border shadow-silver-sm">
            <label className="block font-semibold text-graphite mb-1">Portfolio Name</label>
            <input
              type="text"
              readOnly
              value="Long-Term Growth"
              className="w-full p-2.5 bg-silver-light/50 border border-silver-border rounded-xl font-bold text-graphite"
            />
          </div>
          <div className="p-4 bg-white rounded-2xl border border-silver-border shadow-silver-sm">
            <label className="block font-semibold text-graphite mb-1">Target Risk Preference</label>
            <span className="inline-block px-3 py-1 bg-graphite text-white rounded-lg text-xs font-semibold">
              Aggressive Equity Tilt
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Add Your Investments",
      subtitle: "Track Stocks, Mutual Funds, ETFs, Bonds & Gold",
      icon: Layers,
      content: (
        <div className="space-y-3 text-xs text-left">
          <p className="text-muted">Sample assets pre-configured for your demo:</p>
          <div className="space-y-2">
            <div className="p-3 bg-white rounded-xl border border-silver-border flex justify-between items-center">
              <div>
                <span className="font-bold">HDFCBANK</span> — HDFC Bank Ltd.
                <span className="block text-[10px] text-muted">Banking • Stock</span>
              </div>
              <span className="font-mono font-bold">₹2,04,700</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-silver-border flex justify-between items-center">
              <div>
                <span className="font-bold">RELIANCE</span> — Reliance Industries Ltd.
                <span className="block text-[10px] text-muted">Energy • Stock</span>
              </div>
              <span className="font-mono font-bold">₹1,98,750</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Understand Your Risk Factors",
      subtitle: "Real-time sector concentration & volatility breakdown",
      icon: ShieldAlert,
      content: (
        <div className="space-y-3 text-xs text-left">
          <div className="p-4 bg-financial-warningBg rounded-2xl border border-financial-warningBorder flex items-center justify-between">
            <div>
              <span className="font-bold text-graphite">Portfolio Risk Score</span>
              <p className="text-[11px] text-muted mt-0.5">Driven by 34.5% Banking Exposure</p>
            </div>
            <Badge variant="warning">72 / 100 — High</Badge>
          </div>
        </div>
      ),
    },
    {
      title: "Get AI-Powered Insights",
      subtitle: "Educational explanations without guaranteed-return hype",
      icon: Sparkles,
      content: (
        <div className="space-y-3 text-xs text-left">
          <div className="p-4 bg-graphite text-white rounded-2xl space-y-2 shadow-silver-sm">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-silver">CapitalMind Intelligence</span>
            <p className="leading-relaxed text-silver-light">
              Your banking sector concentration contributes significantly to your overall portfolio risk score. Consider reviewing your asset allocation.
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-silver-light text-[10px] text-muted text-center border border-silver-border">
            Educational & Analytical Insight • Non-Financial Advice
          </div>
        </div>
      ),
    },
  ];

  const currentStepData = steps[currentStep - 1];

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-background-secondary to-white flex items-center justify-center p-6 text-graphite font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-silver-dark/40 shadow-silver-lg p-8 space-y-6 text-center">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted font-semibold">
            <span>Step {currentStep} of 5</span>
            <span>{Math.round((currentStep / 5) * 100)}% Complete</span>
          </div>
          <div className="w-full h-2 bg-silver-light rounded-full overflow-hidden border border-silver-border">
            <div
              className="h-full bg-graphite transition-all duration-300"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Header */}
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-silver-light border border-silver-border text-graphite flex items-center justify-center mx-auto shadow-silver-sm">
            <currentStepData.icon className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-graphite">{currentStepData.title}</h2>
          <p className="text-xs text-muted">{currentStepData.subtitle}</p>
        </div>

        {/* Step Body */}
        <div className="py-2">{currentStepData.content}</div>

        {/* Step Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-silver-border">
          {currentStep > 1 ? (
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          <Button size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />} onClick={handleNext}>
            {currentStep === 5 ? "Go to Dashboard" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
};

