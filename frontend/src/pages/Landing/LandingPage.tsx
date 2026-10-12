import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  BarChart3,
  PieChart,
  Lock,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-graphite font-sans selection:bg-silver selection:text-graphite">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-silver-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-graphite text-white font-bold flex items-center justify-center text-sm shadow-silver-sm">
              C
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-graphite">CapitalMind</span>
              <span className="hidden sm:inline text-[10px] text-muted tracking-wider uppercase ml-2 font-semibold">AI Intelligence</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate('/register')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-32 bg-gradient-to-b from-white via-background-secondary/50 to-white">
        {/* Soft background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-silver-light rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <Badge variant="silver" className="py-1 px-3">
              <Sparkles className="w-3.5 h-3.5 text-graphite" />
              Next-Gen AI Portfolio Intelligence for India
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-graphite leading-[1.15]">
              Understand Your Portfolio. <br />
              <span className="bg-gradient-to-r from-graphite via-muted to-graphite-light bg-clip-text text-transparent">
                Think Beyond the Numbers.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              CapitalMind combines portfolio analytics, risk intelligence, and AI-powered explanations to help investors understand what is happening inside their portfolio.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-4">
              <Button size="lg" icon={<ArrowRight className="w-4 h-4" />} onClick={() => navigate('/register')}>
                Start Understanding Your Portfolio
              </Button>
              <Button variant="secondary" size="lg" onClick={() => navigate('/dashboard')}>
                Explore CapitalMind Demo
              </Button>
            </div>

            <div className="pt-6 flex items-center justify-center lg:justify-start gap-6 text-xs text-muted">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-graphite" /> No Brokerage Lock-in
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-graphite" /> Indian Retail Market Data
              </div>
            </div>
          </div>

          {/* Floating Preview Card */}
          <div className="lg:col-span-5 relative">
            <div className="p-6 bg-white/90 backdrop-blur-xl rounded-3xl border border-silver-dark/40 shadow-silver-lg relative overflow-hidden transition-transform hover:scale-[1.01] duration-300">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-silver-border">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-financial-positive" />
                  <span className="text-xs font-bold text-graphite">Live Portfolio Intelligence</span>
                </div>
                <Badge variant="neutral" size="sm">Long-Term Growth</Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-medium text-muted uppercase">Portfolio Value</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <h2 className="text-3xl font-extrabold text-graphite">₹8,42,000</h2>
                    <span className="text-xs font-bold text-financial-positive bg-financial-positiveBg px-2 py-0.5 rounded-full border border-financial-positiveBorder">
                      +₹95,800 (+12.8%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-silver-light/60 rounded-2xl border border-silver-border">
                    <span className="text-[10px] font-semibold text-muted uppercase">Risk Score</span>
                    <p className="text-xl font-bold text-financial-warning mt-0.5">72 <span className="text-xs font-normal text-muted">/ 100</span></p>
                    <span className="text-[10px] font-bold text-financial-warning uppercase">High Sector Risk</span>
                  </div>

                  <div className="p-3 bg-silver-light/60 rounded-2xl border border-silver-border">
                    <span className="text-[10px] font-semibold text-muted uppercase">Diversification</span>
                    <p className="text-xl font-bold text-graphite mt-0.5">58 <span className="text-xs font-normal text-muted">/ 100</span></p>
                    <span className="text-[10px] font-semibold text-muted">Moderate Clustering</span>
                  </div>
                </div>

                <div className="p-3 bg-graphite text-white rounded-2xl text-xs space-y-1 shadow-silver-sm">
                  <div className="flex items-center gap-1.5 font-bold text-silver">
                    <Sparkles className="w-3.5 h-3.5" /> CapitalMind AI Observation
                  </div>
                  <p className="text-[11px] text-silver-light leading-relaxed">
                    Banking-sector exposure is relatively high at 34.5%. Review sector concentration to match your intended risk level.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-20 bg-background-secondary border-y border-silver-border">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold text-graphite tracking-tight">
              Intelligence Built for Modern Investors
            </h2>
            <p className="text-sm text-muted">
              Move beyond simple tracking apps. Gain institutional-grade portfolio breakdown in clean, intuitive terms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-white rounded-2xl border border-silver-border shadow-silver-sm hover:shadow-silver-md transition-all">
              <div className="p-3 rounded-2xl bg-silver-light w-fit text-graphite mb-4 border border-silver-border">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-graphite">Portfolio Intelligence</h3>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Understand the complete portfolio value, real gains, allocations, and asset breakdown rather than isolated individual stocks.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-silver-border shadow-silver-sm hover:shadow-silver-md transition-all">
              <div className="p-3 rounded-2xl bg-silver-light w-fit text-graphite mb-4 border border-silver-border">
                <PieChart className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-graphite">Risk Intelligence</h3>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Identify concentration risks, industry sector exposure, single-asset dominance, and portfolio volatility factors.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-silver-border shadow-silver-sm hover:shadow-silver-md transition-all">
              <div className="p-3 rounded-2xl bg-silver-light w-fit text-graphite mb-4 border border-silver-border">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-graphite">AI Advisor</h3>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Receive simple-language, structured explanations grounded in structured analytical portfolio calculations.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-silver-border shadow-silver-sm hover:shadow-silver-md transition-all">
              <div className="p-3 rounded-2xl bg-silver-light w-fit text-graphite mb-4 border border-silver-border">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-graphite">Audit Reports</h3>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Generate and preview comprehensive PDF reports for performance audits, risk breakdowns, and diversification analysis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-4">
            <Badge variant="silver">Enterprise Security Standards</Badge>
            <h2 className="text-3xl font-bold text-graphite tracking-tight">
              Protected & Transparent Data Layer
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              CapitalMind adheres to strict privacy and data isolation guidelines. Your portfolio metadata is encrypted, protected, and used solely for your personal analytical insights.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-4 text-xs font-semibold text-graphite">
              <div className="p-3 rounded-xl bg-silver-light/50 border border-silver-border flex items-center gap-2">
                <Lock className="w-4 h-4 text-graphite" /> Secure Auth & MFA
              </div>
              <div className="p-3 rounded-xl bg-silver-light/50 border border-silver-border flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-graphite" /> HTTPS & Encrypted APIs
              </div>
              <div className="p-3 rounded-xl bg-silver-light/50 border border-silver-border flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-graphite" /> Role-Based Access
              </div>
              <div className="p-3 rounded-xl bg-silver-light/50 border border-silver-border flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-graphite" /> Secure Data Storage
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-8 bg-gradient-to-tr from-graphite via-graphite-dark to-graphite text-white rounded-3xl shadow-silver-lg space-y-6">
            <h3 className="text-2xl font-bold">Start Understanding Your Portfolio</h3>
            <p className="text-xs text-silver-light leading-relaxed">
              Join Indian retail investors taking control of portfolio risk, sector concentration, and intelligent asset allocation.
            </p>
            <Button size="lg" className="w-full bg-white text-graphite hover:bg-silver-light border-0" onClick={() => navigate('/register')}>
              Create Free Prototype Account
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-background-secondary border-t border-silver-border text-center text-xs text-muted">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 CapitalMind AI Fintech Prototype. Designed for Indian Retail Investors.</p>
          <p className="text-[11px] text-muted">Educational & Analytical System • Non-Financial Advisory</p>
        </div>
      </footer>
    </div>
  );
};

