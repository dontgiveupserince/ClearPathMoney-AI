import { RotateCcw, Database } from 'lucide-react';
import { AppSettings } from '../types/finance';
import { loadDemoData } from '../lib/storage';

interface Props {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onDemoLoaded: () => void;
}

export default function Settings({ settings, onChange, onDemoLoaded }: Props) {
  function handleCurrencyChange(currency: string) {
    onChange({ ...settings, currency });
  }

  function handleLoadDemo() {
    if (!confirm('Load demo data? This will replace your current data.')) return;
    loadDemoData();
    onDemoLoaded();
  }

  function handleClearAll() {
    if (!confirm('Clear all your data? This cannot be undone.')) return;
    localStorage.clear();
    window.location.reload();
  }

  const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white';

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="font-heading font-bold text-2xl text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">App preferences. Income lives in its own section.</p>
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
        <p className="text-sm text-gray-500">Income lives in your account on Supabase. Categories, expenses, and debts are kept locally in this browser.</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleLoadDemo}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors w-fit"
          >
            <Database size={15} />
            Load Demo Data
          </button>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors w-fit"
          >
            <RotateCcw size={15} />
            Clear Local Data
          </button>
          <p className="text-xs text-gray-400">Clearing local data won't remove income sources from your account.</p>
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
