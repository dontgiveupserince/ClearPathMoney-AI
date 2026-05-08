import React, { useState } from 'react';
import { TrendingDown, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, User } from 'lucide-react';

type Mode = 'login' | 'signup' | 'reset';

export interface AuthHandlers {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

interface Props {
  handlers: AuthHandlers;
}

export default function AuthPage({ handlers }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function switchMode(m: Mode) {
    setMode(m);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) { setError('Please enter your email address.'); return; }

    if (mode === 'reset') {
      setLoading(true);
      const { error: err } = await handlers.resetPassword(email.trim());
      setLoading(false);
      if (err) { setError(err); return; }
      setSuccess('If an account exists for this email, a reset link has been sent.');
      return;
    }

    if (!password) { setError('Please enter your password.'); return; }

    if (mode === 'signup') {
      if (!firstName.trim()) { setError('Please enter your first name.'); return; }
      if (!lastName.trim()) { setError('Please enter your last name.'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
      setLoading(true);
      const { error: err } = await handlers.signUp(email.trim(), password, firstName.trim(), lastName.trim());
      setLoading(false);
      if (err === '__confirm__') {
        setSuccess('Account created! Please check your email to confirm your account, then sign in.');
        switchMode('login');
        return;
      }
      if (err) { setError(err); return; }
      return;
    }

    setLoading(true);
    const { error: err } = await handlers.signIn(email.trim(), password);
    setLoading(false);
    if (err) { setError(err); }
  }

  const inputCls = 'w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white placeholder:text-gray-400';

  const titles: Record<Mode, { heading: string; sub: string; btn: string }> = {
    login: { heading: 'Welcome back', sub: 'Sign in to your ClearPath account.', btn: 'Sign in' },
    signup: { heading: 'Create your account', sub: 'Start your journey to financial clarity.', btn: 'Create account' },
    reset: { heading: 'Reset password', sub: "We'll email you a reset link.", btn: 'Send reset link' },
  };

  const { heading, sub, btn } = titles[mode];

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <TrendingDown size={16} className="text-white" />
          </div>
          <div>
            <p className="font-heading font-bold text-gray-900 text-sm leading-none">ClearPath</p>
            <p className="text-xs text-teal-600 font-medium">Money</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-100 rounded-full text-xs font-medium text-teal-700 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              Calm, supportive financial coaching
            </div>
            <h1 className="font-heading font-bold text-3xl text-gray-900 mb-2">{heading}</h1>
            <p className="text-gray-500 text-sm">{sub}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* First / Last name — signup only */}
              {mode === 'signup' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      autoComplete="given-name"
                      className={inputCls}
                    />
                  </div>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      autoComplete="family-name"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  className={inputCls}
                />
              </div>

              {/* Password */}
              {mode !== 'reset' && (
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className={inputCls + ' pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              )}

              {/* Confirm password */}
              {mode === 'signup' && (
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    className={inputCls}
                  />
                </div>
              )}

              {/* Forgot password */}
              {mode === 'login' && (
                <div className="text-right -mt-1">
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="flex items-start gap-2.5 p-3 bg-green-50 border border-green-100 rounded-xl">
                  <CheckCircle2 size={15} className="text-green-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-60 mt-1"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {btn}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Switch mode */}
            <div className="mt-5 pt-5 border-t border-gray-100 text-center text-sm text-gray-500">
              {mode === 'login' && (
                <>
                  Don't have an account?{' '}
                  <button onClick={() => switchMode('signup')} className="text-teal-600 font-medium hover:text-teal-700">
                    Sign up free
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <>
                  Already have an account?{' '}
                  <button onClick={() => switchMode('login')} className="text-teal-600 font-medium hover:text-teal-700">
                    Sign in
                  </button>
                </>
              )}
              {mode === 'reset' && (
                <button onClick={() => switchMode('login')} className="text-teal-600 font-medium hover:text-teal-700">
                  Back to sign in
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
            Educational budgeting guidance only — not professional financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
