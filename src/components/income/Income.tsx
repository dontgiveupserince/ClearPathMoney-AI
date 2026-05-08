import { useState } from 'react';
import {
  Plus, CreditCard as Edit2, Trash2, Briefcase, Wallet, TrendingUp, Building2,
} from 'lucide-react';
import { Income as IncomeT, INCOME_TYPES, INCOME_FREQUENCIES } from '../../types/finance';
import { formatCurrency } from '../../lib/calculations';
import { monthlyAmount, totalMonthlyNet, totalMonthlyGross } from '../../lib/incomes';
import Modal from '../shared/Modal';
import EmptyState from '../shared/EmptyState';
import IncomeForm from './IncomeForm';

interface Props {
  incomes: IncomeT[];
  configured: boolean;
  onSave: (data: Omit<IncomeT, 'id'>, id?: string) => Promise<{ error: string | null }>;
  onDelete: (id: string) => Promise<{ error: string | null }>;
}

const TYPE_COLORS: Record<IncomeT['type'], string> = {
  salary: '#0F766E',
  business: '#7C3AED',
  investment: '#2563EB',
  rental: '#D97706',
  pension: '#0891B2',
  government: '#16A34A',
  other: '#6B7280',
};

export default function Income({ incomes, configured, onSave, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<IncomeT | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSave(data: Omit<IncomeT, 'id'>) {
    setSaving(true);
    setServerError(null);
    const { error } = await onSave(data, editing?.id);
    setSaving(false);
    if (error) {
      setServerError(error);
      return;
    }
    setShowForm(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this income source?')) return;
    const { error } = await onDelete(id);
    if (error) alert(`Could not delete: ${error}`);
  }

  function openAdd() {
    setEditing(null);
    setServerError(null);
    setShowForm(true);
  }

  function openEdit(income: IncomeT) {
    setEditing(income);
    setServerError(null);
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditing(null);
    setServerError(null);
  }

  const monthlyNet = totalMonthlyNet(incomes);
  const monthlyGross = totalMonthlyGross(incomes);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl text-gray-900">Your Income</h1>
          <p className="text-gray-500 text-sm mt-1">Every source that powers your monthly budget.</p>
        </div>
        <button
          onClick={openAdd}
          disabled={!configured}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          <Plus size={16} />
          Add Income
        </button>
      </div>

      {!configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          Income tracking requires Supabase to be configured. Sign in with a real account to start adding sources.
        </div>
      )}

      {incomes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                <Wallet size={15} className="text-teal-600" />
              </div>
              <p className="text-sm text-gray-500">Total Monthly Net</p>
            </div>
            <p className="font-heading font-bold text-2xl text-gray-900">{formatCurrency(monthlyNet)}</p>
            <p className="text-xs text-gray-400 mt-1">After tax — used for budgeting</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <TrendingUp size={15} className="text-blue-600" />
              </div>
              <p className="text-sm text-gray-500">Total Monthly Gross</p>
            </div>
            <p className="font-heading font-bold text-2xl text-gray-900">{formatCurrency(monthlyGross)}</p>
            <p className="text-xs text-gray-400 mt-1">Before tax</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <Building2 size={15} className="text-violet-600" />
              </div>
              <p className="text-sm text-gray-500">Income Sources</p>
            </div>
            <p className="font-heading font-bold text-2xl text-gray-900">{incomes.length}</p>
            <p className="text-xs text-gray-400 mt-1">{incomes.length === 1 ? 'Active source' : 'Active sources'}</p>
          </div>
        </div>
      )}

      {incomes.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No income sources yet"
          description="Add your salary, side business, rental, or any other source to power budgeting and AI insights."
          action={configured ? { label: 'Add your first income', onClick: openAdd } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {incomes.map((income) => {
            const color = TYPE_COLORS[income.type];
            const monthlyNetAmt = monthlyAmount(income.netAmount, income.frequency);
            const freqLabel = INCOME_FREQUENCIES[income.frequency].toLowerCase();
            return (
              <div
                key={income.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: color }} />
                <div className="flex items-start justify-between mb-4 pt-1">
                  <div className="min-w-0">
                    <p className="font-heading font-semibold text-gray-900 truncate">{income.sourceName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{INCOME_TYPES[income.type]}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(income)}
                      className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      aria-label="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(income.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="font-heading font-bold text-2xl text-gray-900">{formatCurrency(income.netAmount)}</p>
                <p className="text-xs text-gray-500 mb-3">net / {freqLabel}</p>
                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Gross</span>
                    <span className="font-semibold text-gray-700">
                      {formatCurrency(income.grossAmount)} / {freqLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Monthly net</span>
                    <span className="font-semibold" style={{ color }}>{formatCurrency(monthlyNetAmt)}</span>
                  </div>
                </div>
                {income.notes && (
                  <p className="mt-3 text-xs text-gray-400 italic line-clamp-2">{income.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Income' : 'Add Income'} onClose={closeForm}>
          <IncomeForm
            initial={editing ?? undefined}
            onSave={handleSave}
            onCancel={closeForm}
            saving={saving}
            serverError={serverError}
          />
        </Modal>
      )}
    </div>
  );
}
