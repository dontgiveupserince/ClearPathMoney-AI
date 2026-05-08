import React, { useState } from 'react';
import { TrendingDown, AlertTriangle, DollarSign, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Debt, AppSettings } from '../../types/finance';
import { calculatePayoff } from '../../lib/payoff';
import { formatCurrency } from '../../lib/calculations';
import EmptyState from '../shared/EmptyState';

interface Props {
  debts: Debt[];
  settings: AppSettings;
  onSettingsChange: (s: AppSettings) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-teal-600">{formatCurrency(payload[0]?.value ?? 0)}</p>
    </div>
  );
};

export default function DebtPayoffPlanner({ debts, settings, onSettingsChange }: Props) {
  const [showSchedule, setShowSchedule] = useState(false);

  const plan = calculatePayoff(debts, settings.payoffMethod, settings.extraDebtPayment);

  const debtProjection = plan
    ? plan.schedule
        .filter((_, i) => i % 2 === 0 || i === 0)
        .slice(0, 24)
        .map((m) => ({ label: m.label, balance: Math.round(m.totalBalance) }))
    : [];

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinPayment = debts.reduce((s, d) => s + d.minimumPayment, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-gray-900">Debt Payoff Planner</h1>
        <p className="text-gray-500 text-sm mt-1">Build your path to financial freedom, one payment at a time.</p>
      </div>

      {debts.length === 0 ? (
        <EmptyState
          icon={TrendingDown}
          title="No debts to plan"
          description="Add your debts in the Debts section to see a personalized payoff plan and your estimated debt-free date."
        />
      ) : (
        <>
          {/* Controls */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-heading font-semibold text-gray-900 mb-4">Payoff Strategy</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Method</label>
                <div className="flex gap-2">
                  {(['avalanche', 'snowball'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => onSettingsChange({ ...settings, payoffMethod: m })}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                        settings.payoffMethod === m
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {m === 'avalanche' ? 'Avalanche' : 'Snowball'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {settings.payoffMethod === 'avalanche'
                    ? 'Highest APR first — saves the most interest.'
                    : 'Smallest balance first — quick wins for motivation.'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Extra Monthly Payment
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={settings.extraDebtPayment || ''}
                    onChange={(e) => onSettingsChange({ ...settings, extraDebtPayment: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Applied to your current target debt each month.</p>
              </div>
            </div>
          </div>

          {/* Warning */}
          {plan && plan.warningDebts.length > 0 && (
            <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Minimum payment warning</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  The minimum payment on {plan.warningDebts.join(', ')} is less than the monthly interest — the balance will grow. Consider increasing your payment.
                </p>
              </div>
            </div>
          )}

          {/* Summary cards */}
          {plan && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center mb-2">
                  <Calendar size={16} className="text-teal-600" />
                </div>
                <p className="text-xs text-gray-500">Debt-Free Date</p>
                <p className="font-heading font-bold text-gray-900 text-sm mt-0.5">{plan.debtFreeDate}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
                  <TrendingDown size={16} className="text-blue-600" />
                </div>
                <p className="text-xs text-gray-500">Total Months</p>
                <p className="font-heading font-bold text-gray-900 text-sm mt-0.5">{plan.totalMonths} months</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center mb-2">
                  <DollarSign size={16} className="text-red-500" />
                </div>
                <p className="text-xs text-gray-500">Total Interest Paid</p>
                <p className="font-heading font-bold text-gray-900 text-sm mt-0.5">{formatCurrency(plan.totalInterest)}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-2">
                  <DollarSign size={16} className="text-amber-600" />
                </div>
                <p className="text-xs text-gray-500">Monthly Commitment</p>
                <p className="font-heading font-bold text-gray-900 text-sm mt-0.5">{formatCurrency(totalMinPayment + settings.extraDebtPayment)}</p>
              </div>
            </div>
          )}

          {/* Projection chart */}
          {debtProjection.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-heading font-semibold text-gray-900 mb-4">Balance Over Time</h2>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={debtProjection} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="planGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F766E" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="balance" stroke="#0F766E" strokeWidth={2.5} fill="url(#planGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Payoff order */}
          {plan && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-heading font-semibold text-gray-900 mb-4">Payoff Order</h2>
              <div className="space-y-3">
                {[...debts]
                  .sort((a, b) =>
                    settings.payoffMethod === 'avalanche' ? b.apr - a.apr : a.balance - b.balance
                  )
                  .map((debt, i) => (
                    <div key={debt.id} className="flex items-center gap-4">
                      <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-900">{debt.name}</span>
                          <span className="text-gray-500">{formatCurrency(debt.balance)} · {debt.apr}% APR</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-teal-500"
                            style={{ width: `${Math.min(100, (debt.balance / totalDebt) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Monthly schedule toggle */}
          {plan && plan.schedule.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setShowSchedule(!showSchedule)}
              >
                <span className="font-heading font-semibold text-gray-900">Month-by-Month Schedule</span>
                {showSchedule ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </button>
              {showSchedule && (
                <div className="border-t border-gray-100 max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Month</th>
                        <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Balance</th>
                        <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Interest</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {plan.schedule.map((m, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-5 py-3 text-gray-700">{m.label}</td>
                          <td className="px-5 py-3 text-right font-medium text-gray-900">{formatCurrency(m.totalBalance)}</td>
                          <td className="px-5 py-3 text-right text-red-500">{formatCurrency(m.totalInterest)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
