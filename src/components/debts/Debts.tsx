import { useState } from 'react';
import { Plus, CreditCard as Edit2, Trash2, CreditCard, Percent } from 'lucide-react';
import { Debt, DEBT_TYPES } from '../../types/finance';
import { formatCurrency } from '../../lib/calculations';
import Modal from '../shared/Modal';
import EmptyState from '../shared/EmptyState';
import DebtForm from './DebtForm';

interface Props {
  debts: Debt[];
  onSave: (data: Omit<Debt, 'id'>, id?: string) => Promise<{ error: string | null }>;
  onDelete: (id: string) => Promise<{ error: string | null }>;
}

const TYPE_COLORS: Record<Debt['type'], string> = {
  credit_card: '#DC2626',
  student_loan: '#2563EB',
  auto_loan: '#D97706',
  mortgage: '#0F766E',
  personal_loan: '#7C3AED',
  medical: '#EA580C',
  other: '#6B7280',
};

export default function Debts({ debts, onSave, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSave(data: Omit<Debt, 'id'>) {
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
    if (!confirm('Remove this debt?')) return;
    const { error } = await onDelete(id);
    if (error) alert(`Could not delete: ${error}`);
  }

  function openAdd() { setEditing(null); setServerError(null); setShowForm(true); }
  function openEdit(d: Debt) { setEditing(d); setServerError(null); setShowForm(true); }
  function closeForm() { if (saving) return; setShowForm(false); setEditing(null); setServerError(null); }

  const totalBalance = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinPayment = debts.reduce((s, d) => s + d.minimumPayment, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-gray-900">Your Debts</h1>
          <p className="text-gray-500 text-sm mt-1">Track every balance and stay on the path to freedom.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors"
        >
          <Plus size={16} />
          Add Debt
        </button>
      </div>

      {debts.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Total Owed</p>
            <p className="font-heading font-bold text-2xl text-gray-900">{formatCurrency(totalBalance)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Min. Monthly Payments</p>
            <p className="font-heading font-bold text-2xl text-gray-900">{formatCurrency(totalMinPayment)}</p>
          </div>
        </div>
      )}

      {debts.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No debts tracked"
          description="Add your debts here to see your total balance, plan your payoff, and estimate your debt-free date."
          action={{ label: 'Add your first debt', onClick: openAdd }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {debts.map((debt) => {
            const color = TYPE_COLORS[debt.type];
            const monthlyInterest = (debt.apr / 100 / 12) * debt.balance;
            const isWarning = debt.minimumPayment < monthlyInterest;
            return (
              <div key={debt.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: color }} />
                <div className="flex items-start justify-between mb-4 pt-1">
                  <div>
                    <p className="font-heading font-semibold text-gray-900">{debt.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{DEBT_TYPES[debt.type]}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(debt)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(debt.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="font-heading font-bold text-2xl text-gray-900 mb-3">{formatCurrency(debt.balance)}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1"><Percent size={12} /> APR</span>
                    <span className="font-semibold text-gray-700">{debt.apr}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Min. Payment</span>
                    <span className="font-semibold text-gray-700">{formatCurrency(debt.minimumPayment)}/mo</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Monthly Interest</span>
                    <span className="font-semibold" style={{ color }}>{formatCurrency(monthlyInterest)}</span>
                  </div>
                </div>
                {isWarning && (
                  <div className="mt-3 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-700 font-medium">Min. payment is below monthly interest — balance will grow.</p>
                  </div>
                )}
                {debt.dueDate && (
                  <p className="mt-2 text-xs text-gray-400">Due: {debt.dueDate}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Debt' : 'Add Debt'} onClose={closeForm}>
          <DebtForm
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
