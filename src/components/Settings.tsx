import React, { useState } from 'react';
import { Save, RotateCcw, Database, Eye, EyeOff, Key, CheckCircle2 } from 'lucide-react';
import { AppSettings } from '../types/finance';
import { loadDemoData } from '../lib/storage';

interface Props {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onDemoLoaded: () => void;
}

export default function Settings({ settings, onChange, onDemoLoaded }: Props) {
  const [income, setIncome] = useState(settings.monthlyIncome?.toString() ?? '');
  const [apiKey, setApiKey] = useState(settings.openAiApiKey ?? '');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    onChange({ ...settings, monthlyIncome: parseFloat(income) || 0 });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    onChange({ ...settings, openAiApiKey: apiKey.trim() });
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
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

  const maskedKey = apiKey ? apiKey.slice(0, 8) + '••••••••••••••••••••' + apiKey.slice(-4) : '';

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="font-heading font-bold text-2xl text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure your budget and preferences.</p>
      </div>

      {/* Budget Settings */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <h2 className="font-heading font-semibold text-gray-900">Budget Settings</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly Income ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="e.g. 5000"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">Used to calculate remaining budget and AI insights.</p>
        </div>
        <button
          type="submit"
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors"
        >
          {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </form>

      {/* AI Coach API Key */}
      <form onSubmit={handleSaveKey} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <Key size={14} className="text-teal-600" />
          </div>
          <h2 className="font-heading font-semibold text-gray-900">AI Coach — OpenAI API Key</h2>
        </div>
        <p className="text-sm text-gray-500">
          Your key is stored locally on your device and sent securely to the AI Coach. It is never shared with anyone else.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">OpenAI API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-proj-..."
              className="w-full pl-3.5 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {apiKey && !showKey && (
            <p className="text-xs text-gray-400 mt-1 font-mono">{maskedKey}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={!apiKey.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {keySaved ? <CheckCircle2 size={15} /> : <Save size={15} />}
          {keySaved ? 'Key Saved!' : 'Save API Key'}
        </button>
      </form>

      {/* Data Management */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <h2 className="font-heading font-semibold text-gray-900">Data Management</h2>
        <p className="text-sm text-gray-500">All your data is stored locally in your browser.</p>
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
            Clear All Data
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
