import React, { useState } from 'react';
import {
  BookOpen,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { AuthUser } from '../types';
import { loginAdmin } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState<string>('jessetemp923@gmail.com');
  const [password, setPassword] = useState<string>('Admin@123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please provide a valid administrative email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your administrator password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginAdmin({ email: cleanEmail, password });
      if (res.success && res.data) {
        const userObj: AuthUser = {
          email: res.data.user.email,
          name: res.data.user.name,
          role: res.data.user.role,
          token: res.data.token,
          department: res.data.user.department,
        };

        if (rememberMe) {
          localStorage.setItem('libtrack_admin_user', JSON.stringify(userObj));
        } else {
          sessionStorage.setItem('libtrack_admin_user', JSON.stringify(userObj));
        }

        onLoginSuccess(userObj);
      } else {
        const errorMsg = !res.success ? res.error.message : 'Authentication failed. Please verify your credentials.';
        setErrorMessage(errorMsg);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to connect to the authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Admin@123');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#080C14] relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-black">
      {/* Dynamic Ambient Space Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-10 left-10 w-[250px] h-[250px] bg-purple-500/08 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="glass-card rounded-3xl p-6 sm:p-9 border border-white/10 shadow-2xl relative overflow-hidden">
          {/* Subtle top specular border highlight */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />

          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-black shadow-glow-emerald ring-2 ring-emerald-500/30 mb-3.5 transform transition-transform hover:scale-105">
              <BookOpen className="w-7 h-7 stroke-[2.5]" aria-hidden="true" />
            </div>

            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold text-white tracking-tight">
                LibTrack
              </h1>
              <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                LIBRARIAN OS
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-1">
              Sign in to manage library circulation & dispatch notices
            </p>
          </div>

          {/* Sender Identity Notice Box */}
          <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-white">Automated Sender Identity: </span>
              Your logged-in email is dynamically used to dispatch automated due-soon alerts, overdue notices, and circulation receipts.
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-sans">
                Admin / Librarian Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jessetemp923@gmail.com"
                  className="w-full h-11 pl-10 pr-3.5 text-xs sm:text-sm bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 font-sans">
                  Administrator Password
                </label>
                <span className="text-[11px] font-mono text-emerald-400/80">Default: Admin@123</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full h-11 pl-10 pr-10 text-xs sm:text-sm bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/40 w-4 h-4"
                />
                <span>Remember session</span>
              </label>

              <span className="font-mono text-[11px] text-slate-400">VTU 2022 Scheme</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 btn-luminous rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-glow-emerald cursor-pointer disabled:opacity-50 transition-all active:scale-95"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Authorizing Session...</span>
                </>
              ) : (
                <>
                  <span>Enter Command Center</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Fill Chips */}
          <div className="mt-6 pt-5 border-t border-white/[0.08] text-center">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block mb-2.5">
              Admin Sender Profile
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoFill('jessetemp923@gmail.com')}
                className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 text-[11px] font-mono text-emerald-300 font-bold transition-all shadow-glow-emerald"
              >
                jessetemp923@gmail.com
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('admin@libtrack.edu')}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/10 text-[11px] font-mono text-slate-300 hover:text-emerald-300 transition-all"
              >
                admin@libtrack.edu
              </button>
            </div>
          </div>
        </div>

        {/* Security & Version Micro-Footer */}
        <div className="flex items-center justify-center gap-4 mt-5 text-[11px] font-mono text-slate-500 text-center">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            256-Bit TLS Secured
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Central Library OS
          </span>
        </div>
      </div>
    </div>
  );
};
