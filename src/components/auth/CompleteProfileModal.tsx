import React, { useState } from 'react';
import { User, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

interface Props {
  onComplete: (firstName: string, lastName: string) => Promise<{ error: string | null }>;
}

export default function CompleteProfileModal({ onComplete }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!firstName.trim()) { setError('Please enter your first name.'); return; }
    if (!lastName.trim()) { setError('Please enter your last name.'); return; }
    setLoading(true);
    const { error: err } = await onComplete(firstName.trim(), lastName.trim());
    setLoading(false);
    if (err) setError(err);
  }

  const inputCls = 'w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white placeholder:text-gray-400';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-5 mx-auto">
          <Sparkles size={24} className="text-teal-600" />
        </div>

        <div className="text-center mb-6">
          <h2 className="font-heading font-bold text-2xl text-gray-900 mb-2">Complete your profile</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Please add your name to personalize your dashboard experience.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              autoComplete="given-name"
              autoFocus
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

          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-60 mt-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Continue to dashboard
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
