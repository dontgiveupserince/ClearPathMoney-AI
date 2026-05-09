import { useState } from 'react';
import { RotateCcw, Database, Loader2 } from 'lucide-react';
import { AppSettings } from '../types/finance';

interface Props {
  settings: AppSettings;
  onChange: (s: AppSettings) => void | Promise<void>;
  onLoadDemo: () => Promise<{ error: string | null }>;
  onClearAll: () => Promise<{ error: string | null }>;
}

export default function Settings({ settings, onChange, onLoadDemo, onClearAll }: Props) {
  const [demoLoading, setDemoLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  function handleCurrencyChange(currency: string) {
    onChange({ ...settings, currency });
  }

  async function handleLoadDemo() {
    if (!confirm('Load demo data? This will replace your current data in your account.')) return;
    setDemoLoading(true);
    const { error } = await onLoadDemo();
    setDemoLoading(false);
    if (error) alert(`Could not load demo: ${error}`);
  }

  async function handleClearAll() {
    if (!confirm('Clear all of your data? This will delete every category, expense, debt, income, and setting in your account. This cannot be undone.')) return;
    setClearLoading(true);
    const { error } = await onClearAll();
    setClearLoading(false);
    if (error) alert(`Could not clear data: ${error}`);
  }

  const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white';

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="font-heading font-bold text-2xl text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">App preferences. Income, categories, debts, and expenses live in their own sections.</p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <h2 className="font-heading font-semibold text-gray-900">Preferences</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
          <select
            value={settings.currency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className={inputCls}
          >
            <option value="USD">USD — US Dollar</option>
            <option value="CAD">CAD — Canadian Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="AUD">AUD — Australian Dollar</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">Used for display formatting across the app.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <h2 className="font-heading font-semibold text-gray-900">Data Management</h2>
        <p className="text-sm text-gray-500">All your financial data is stored in your account on Supabase, scoped to you.</p>
        <div className="flex flex-col gap-3">
          <div>
            <button
              onClick={handleLoadDemo}
              disabled={demoLoading || clearLoading}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors w-fit disabled:opacity-50"
            >
              {demoLoading ? <Loader2 size={15} className="animate-spin" /> : <Database size={15} />}
              {demoLoading ? 'Loading demo…' : 'Reset to Demo Data'}
            </button>
            <p className="text-xs text-gray-400 mt-1.5">Replaces all your data with Sarah's sample budget, expenses, and debt.</p>
          </div>
          <button
            onClick={handleClearAll}
            disabled={demoLoading || clearLoading}
            className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors w-fit disabled:opacity-50"
          >
            {clearLoading ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
            {clearLoading ? 'Clearing…' : 'Clear All My Data'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-heading font-semibold text-gray-900 mb-3">About ClearPath Money</h2>
        <div className="text-sm text-gray-500 space-y-2">
          <p>ClearPath Money is a personal budget tracker with AI-assisted debt elimination planning.</p>
          <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
            This app provides educational budgeting guidance only — not professional financial advice. Always consult a qualified financial advisor for major financial decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
