import React from 'react';
import {
  Wallet, TrendingDown, PiggyBank, CreditCard, CalendarCheck,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { Category, Transaction, Debt, AppSettings, AIInsight } from '../../types/finance';
import { getTotalExpenses, getCategorySpending, formatCurrency } from '../../lib/calculations';
import { calculatePayoff } from '../../lib/payoff';
import EmptyState from '../shared/EmptyState';

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  sub?: string;
  subPositive?: boolean;
}

function SummaryCard({ label, value, icon: Icon, color, sub, subPositive }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-heading font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && (
        <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${subPositive ? 'text-green-600' : 'text-amber-600'}`}>
          {subPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {sub}
        </p>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

interface Props {
  categories: Category[];
  transactions: Transaction[];
  debts: Debt[];
  settings: AppSettings;
  aiInsight: AIInsight | null;
  onGoToCoach: () => void;
}

export default function Dashboard({ categories, transactions, debts, settings, aiInsight, onGoToCoach }: Props) {
  const totalExpenses = getTotalExpenses(transactions);
  const remaining = settings.monthlyIncome - totalExpenses;
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const categorySpending = getCategorySpending(transactions, categories);
  const plan = calculatePayoff(debts, settings.payoffMethod, settings.extraDebtPayment);

  const spendingData = categorySpending
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 8)
    .map((c) => ({ name: c.category.name, spent: c.spent, limit: c.category.monthlyLimit, color: c.category.color }));

  const debtProjection = plan
    ? plan.schedule
        .filter((_, i) => i % 3 === 0 || i === 0)
        .slice(0, 16)
        .map((m) => ({ label: m.label, balance: Math.round(m.totalBalance) }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-gray-900">Good to see you.</h1>
        <p className="text-gray-500 text-sm mt-1">Here's your financial snapshot for this month.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          label="Monthly Income"
          value={settings.monthlyIncome > 0 ? formatCurrency(settings.monthlyIncome) : '—'}
          icon={Wallet}
          color="bg-teal-600"
        />
        <SummaryCard
          label="Total Expenses"
          value={formatCurrency(totalExpenses)}
          icon={ArrowDownRight}
          color="bg-blue-600"
        />
        <SummaryCard
          label="Remaining Budget"
          value={settings.monthlyIncome > 0 ? formatCurrency(Math.abs(remaining)) : '—'}
          icon={PiggyBank}
          color={remaining < 0 ? 'bg-red-500' : 'bg-green-600'}
          sub={remaining < 0 ? 'Over budget' : undefined}
          subPositive={remaining >= 0}
        />
        <SummaryCard
          label="Total Debt"
          value={totalDebt > 0 ? formatCurrency(totalDebt) : '$0'}
          icon={CreditCard}
          color="bg-gray-600"
        />
        <SummaryCard
          label="Debt-Free Date"
          value={plan?.debtFreeDate ?? (debts.length === 0 ? 'No debts!' : '—')}
          icon={CalendarCheck}
          color="bg-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900 mb-4">Spending by Category</h2>
          {spendingData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              No expenses logged this month yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={spendingData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="spent" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {spendingData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Debt Projection */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900 mb-4">Debt Payoff Projection</h2>
          {debtProjection.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Add debts to see your payoff trajectory.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={debtProjection} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F766E" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="balance" stroke="#0F766E" strokeWidth={2.5} fill="url(#debtGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      {categorySpending.filter(c => c.spent > 0).length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900 mb-4">Budget Progress</h2>
          <div className="space-y-3">
            {categorySpending
              .filter((c) => c.spent > 0 || c.category.monthlyLimit > 0)
              .sort((a, b) => b.percentage - a.percentage)
              .slice(0, 8)
              .map(({ category, spent, percentage }) => (
                <div key={category.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{category.name}</span>
                    <span className={`font-semibold ${percentage >= 100 ? 'text-red-500' : percentage >= 80 ? 'text-amber-600' : 'text-gray-600'}`}>
                      {formatCurrency(spent)} / {formatCurrency(category.monthlyLimit)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, percentage)}%`,
                        backgroundColor: percentage >= 100 ? '#DC2626' : percentage >= 80 ? '#D97706' : category.color,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* AI Action Plan Preview */}
      <div className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <TrendingDown size={14} className="text-white" />
          </div>
          <h2 className="font-heading font-semibold text-violet-900">AI Weekly Action Plan</h2>
        </div>
        {aiInsight ? (
          <div>
            <p className="text-sm text-violet-800 leading-relaxed mb-3">{aiInsight.summary}</p>
            {aiInsight.actions.slice(0, 2).map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-violet-700 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <span>{a}</span>
              </div>
            ))}
            <button onClick={onGoToCoach} className="mt-3 text-sm font-medium text-violet-700 hover:text-violet-900 underline underline-offset-2">
              View full plan →
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-violet-700 mb-3">
              Get a personalized weekly action plan based on your spending, debts, and budget goals.
            </p>
            <button
              onClick={onGoToCoach}
              className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
            >
              Generate my plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
