import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Shield, User, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ identifier, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email/employee ID or password');
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickAccount = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95">
        {/* Brand Logo & Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-700 p-2.5 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-700/30">
            <img src="/logo.png" alt="MSA Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Mastered Skill Academy</h1>
          <p className="text-xs font-semibold text-brand-700 uppercase tracking-widest mt-1">
            HR & Staff Portal
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Email or Employee ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="e.g. MSA-0001 or name@masteredskill.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-slate-50 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-slate-50 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-brand-600/30 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              'Signing In...'
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Sign In to Portal
              </>
            )}
          </button>
        </form>

        {/* Quick Account Fillers for Initial Seed / Testing */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Default Seed Accounts
          </p>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => fillQuickAccount('hrmanager@masteredskill.com', 'MsaManager@2026#')}
              className="px-2 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-[11px] text-slate-700 transition"
            >
              HR Manager
            </button>
            <button
              type="button"
              onClick={() => fillQuickAccount('hrexec@masteredskill.com', 'MsaExec@2026#')}
              className="px-2 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-[11px] text-slate-700 transition"
            >
              HR Executive
            </button>
            <button
              type="button"
              onClick={() => fillQuickAccount('employee@masteredskill.com', 'MsaStaff@2026#')}
              className="px-2 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-[11px] text-slate-700 transition"
            >
              Employee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
