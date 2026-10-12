import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { ArrowRight, User, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useApp();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await register(email, password, fullName);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-background-secondary to-white flex items-center justify-center p-6 text-graphite font-sans relative overflow-hidden">
      <div className="w-full max-w-md bg-white rounded-3xl border border-silver-dark/40 shadow-silver-lg p-8 relative z-10">
        <div className="text-center space-y-2 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-graphite text-white font-bold text-lg flex items-center justify-center mx-auto shadow-silver-sm">
            C
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-graphite">Create CapitalMind Account</h2>
          <p className="text-xs text-muted">Join Indian retail investors optimizing portfolio risk</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-financial-negativeBg border border-financial-negative/30 flex items-start gap-2 text-xs text-financial-negative">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-graphite mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-muted" />
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Arjun Mehta"
                className="w-full pl-9 pr-3 py-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-graphite mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="arjun@capitalmind.ai"
                className="w-full pl-9 pr-3 py-2.5 bg-silver-light/40 border border-silver-border rounded-xl text-graphite outline-none focus:border-graphite"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-graphite mb-1">Password</label>
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

          <label className="flex items-start gap-2 cursor-pointer pt-1">
            <input type="checkbox" required defaultChecked className="mt-0.5 rounded border-silver-dark text-graphite focus:ring-0" />
            <span className="text-[11px] text-muted leading-tight">
              I agree to CapitalMind's <a href="#terms" className="underline text-graphite">Terms of Service</a> and <a href="#privacy" className="underline text-graphite">Privacy Policy</a>.
            </span>
          </label>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3"
            icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-graphite underline hover:text-muted">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
