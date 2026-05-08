import React, { useState } from 'react';
import { Sparkles, Shield, AlertCircle, CheckCircle2, Lightbulb, Send, RefreshCw, TrendingDown } from 'lucide-react';
import { Category, Transaction, Debt, AppSettings, AIInsight } from '../../types/finance';
import { getCategorySpending, getTotalExpenses } from '../../lib/calculations';

interface Props {
  categories: Category[];
  transactions: Transaction[];
  debts: Debt[];
  settings: AppSettings;
  insight: AIInsight | null;
  onInsightGenerated: (insight: AIInsight) => void;
  onSettingsChange: (s: AppSettings) => void;
  monthlyNetIncome: number;
  monthlyGrossIncome: number;
}

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function buildContext(
  categories: Category[],
  transactions: Transaction[],
  debts: Debt[],
  settings: AppSettings,
  monthlyNetIncome: number,
  monthlyGrossIncome: number,
) {
  const categorySpending = getCategorySpending(transactions, categories);
  const totalExpenses = getTotalExpenses(transactions);
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  return {
    monthlyIncome: monthlyNetIncome,
    monthlyGrossIncome,
    totalExpenses,
    totalDebt,
    categories: categorySpending.map((c) => ({
      name: c.category.name,
      spent: c.spent,
      limit: c.category.monthlyLimit,
      percentage: c.percentage,
    })),
    debts: debts.map((d) => ({ name: d.name, balance: d.balance, apr: d.apr, type: d.type })),
    payoffMethod: settings.payoffMethod,
    extraDebtPayment: settings.extraDebtPayment,
  };
}

async function callEdge(body: object): Promise<{ data?: unknown; error?: string }> {
  try {
    const res = await fetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || json.error) return { error: json.error ?? 'Request failed' };
    return { data: json };
  } catch (err) {
    return { error: String(err) };
  }
}

export default function AICoach({ categories, transactions, debts, settings, insight, onInsightGenerated, onSettingsChange, monthlyNetIncome, monthlyGrossIncome }: Props) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [generating, setGenerating] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState('');

  function acknowledgePrivacy() {
    onSettingsChange({ ...settings, aiPrivacyAcknowledged: true });
  }

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    const context = buildContext(categories, transactions, debts, settings, monthlyNetIncome, monthlyGrossIncome);
    const { data, error: err } = await callEdge({ action: 'generate_plan', context });
    setGenerating(false);
    if (err) { setError(err); return; }
    const d = data as { summary: string; alerts: string[]; actions: string[]; debtAdvice: string; savingsOpportunities: string[] };
    onInsightGenerated({
      generatedAt: new Date().toISOString(),
      summary: d.summary ?? '',
      alerts: d.alerts ?? [],
      actions: d.actions ?? [],
      debtAdvice: d.debtAdvice ?? '',
      savingsOpportunities: d.savingsOpportunities ?? [],
    });
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setAnswering(true);
    setError('');
    const context = buildContext(categories, transactions, debts, settings, monthlyNetIncome, monthlyGrossIncome);
    const { data, error: err } = await callEdge({ action: 'ask_question', context, question });
    setAnswering(false);
    if (err) { setError(err); return; }
    setAnswer((data as { answer: string }).answer ?? '');
    setQuestion('');
  }

  if (!settings.aiPrivacyAcknowledged) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-gray-900">AI Coach</h1>
          <p className="text-gray-500 text-sm mt-1">Personalized, shame-free financial guidance.</p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 max-w-lg mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <Shield size={24} className="text-teal-600" />
          </div>
          <h2 className="font-heading font-bold text-xl text-gray-900 mb-3">Privacy & Disclaimer</h2>
          <div className="text-sm text-gray-600 space-y-3 text-left mb-6">
            <p>Your financial data is sent to OpenAI via a secure server function to generate personalized insights. No data is stored by us.</p>
            <div className="flex gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800">This app provides educational budgeting guidance, not professional financial advice. Always consult a qualified advisor for major financial decisions.</p>
            </div>
          </div>
          <button
            onClick={acknowledgePrivacy}
            className="w-full py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors"
          >
            I understand — let's go
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl text-gray-900">AI Coach</h1>
          <p className="text-gray-500 text-sm mt-1">Your personalized financial action plan.</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {generating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? 'Analyzing...' : insight ? 'Regenerate Plan' : 'Generate Weekly Plan'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!insight && !generating && (
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-teal-200 flex items-center justify-center mx-auto mb-4">
            <TrendingDown size={28} className="text-teal-700" />
          </div>
          <h2 className="font-heading font-bold text-xl text-teal-900 mb-2">Ready to coach you</h2>
          <p className="text-teal-700 text-sm max-w-sm mx-auto">
            Click "Generate Weekly Plan" to get a personalized budget analysis, debt advice, and actionable next steps powered by GPT-4o mini.
          </p>
        </div>
      )}

      {generating && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={22} className="text-teal-600 animate-pulse" />
          </div>
          <p className="text-gray-700 font-medium">Analyzing your finances with AI...</p>
          <p className="text-gray-400 text-sm mt-1">Reviewing budget, debts, and spending patterns.</p>
        </div>
      )}

      {insight && !generating && (
        <>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-teal-600" />
              <h2 className="font-heading font-semibold text-gray-900">Weekly Summary</h2>
              <span className="ml-auto text-xs text-gray-400">
                {new Date(insight.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{insight.summary}</p>
          </div>

          {insight.alerts.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={16} className="text-amber-500" />
                <h2 className="font-heading font-semibold text-gray-900">Alerts</h2>
              </div>
              <div className="space-y-2">
                {insight.alerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-800">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={16} className="text-teal-600" />
              <h2 className="font-heading font-semibold text-gray-900">Recommended Actions</h2>
            </div>
            <div className="space-y-2.5">
              {insight.actions.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                  <p className="text-sm text-gray-700 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={16} className="text-blue-600" />
              <h2 className="font-heading font-semibold text-gray-900">Debt Strategy</h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{insight.debtAdvice}</p>
          </div>

          {insight.savingsOpportunities.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={16} className="text-green-600" />
                <h2 className="font-heading font-semibold text-gray-900">Savings Opportunities</h2>
              </div>
              <div className="space-y-2">
                {insight.savingsOpportunities.map((o, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 bg-green-50 rounded-xl border border-green-100">
                    <Lightbulb size={14} className="text-green-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-green-800">{o}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Ask my budget */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <Sparkles size={14} className="text-teal-600" />
          </div>
          <h2 className="font-heading font-semibold text-gray-900">Ask My Budget</h2>
        </div>
        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. How much did I spend on dining?"
            disabled={answering}
            className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={answering || !question.trim()}
            className="px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {answering ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
        {answer && (
          <div className="mt-3 p-4 bg-teal-50 rounded-xl border border-teal-100">
            <p className="text-sm text-teal-900 leading-relaxed">{answer}</p>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">
          Powered by GPT-4o mini. Educational guidance only — not professional financial advice.
        </p>
      </div>
    </div>
  );
}
