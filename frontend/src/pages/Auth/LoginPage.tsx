import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { ArrowRight, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useApp();
  const [email, setEmail] = useState('demo@capitalmind.ai');
  const [password, setPassword] = useState('demo123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@capitalmind.ai');
    setPassword('demo123');
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await login('demo@capitalmind.ai', 'demo123');
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-background-secondary to-white flex items-center justify-center p-6 text-graphite font-sans relative overflow-hidden">
      {/* Silver abstract background shapes */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-silver-light rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-silver-dark/30 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl border border-silver-dark/40 shadow-silver-lg p-8 relative z-10">
        <div className="text-center space-y-2 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-graphite text-white font-bold text-lg flex items-center justify-center mx-auto shadow-silver-sm">
            C
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-graphite">Welcome to CapitalMind</h2>
          <p className="text-xs text-muted">Sign in to your portfolio intelligence dashboard</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-financial-negativeBg border border-financial-negative/30 flex items-start gap-2 text-xs text-financial-negative">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-graphite mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="investor@capitalmind.ai"
                className="w-full pl-9 pr-3 py-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-graphite">Password</label>
              <a
                href="#forgot"
                onClick={e => {
                  e.preventDefault();
                  alert('Password reset link sent to ' + email);
                }}
                className="text-[11px] text-muted hover:text-graphite font-medium"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-silver-dark text-graphite focus:ring-0" />
              <span className="text-muted">Remember this browser</span>
            </label>
            <button
              type="button"
              onClick={handleDemoLogin}
              className="text-[11px] font-semibold text-graphite hover:underline"
            >
              Fill Demo Credentials
            </button>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3"
            icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-silver-border" />
          <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Or continue with</span>
          <div className="flex-1 h-px bg-silver-border" />
        </div>

        <Button
          variant="outline"
          className="w-full py-2.5"
          onClick={handleDemoLogin}
        >
          Quick Demo Login (Arjun Mehta)
        </Button>

        <p className="text-center text-xs text-muted mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-graphite underline hover:text-muted">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
};
