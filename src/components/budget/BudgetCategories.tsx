import { useState } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Tag } from 'lucide-react';
import { Category, Transaction } from '../../types/finance';
import { getCategorySpending, formatCurrency } from '../../lib/calculations';
import Modal from '../shared/Modal';
import EmptyState from '../shared/EmptyState';
import CategoryForm from './CategoryForm';

interface Props {
  categories: Category[];
  transactions: Transaction[];
  onSave: (data: Omit<Category, 'id'>, id?: string) => Promise<{ error: string | null }>;
  onDelete: (id: string) => Promise<{ error: string | null }>;
}

export default function BudgetCategories({ categories, transactions, onSave, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const spending = getCategorySpending(transactions, categories);

  async function handleSave(data: Omit<Category, 'id'>) {
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
    if (!confirm('Delete this category? Expenses linked to it will remain.')) return;
    const { error } = await onDelete(id);
    if (error) alert(`Could not delete: ${error}`);
  }

  function openAdd() { setEditing(null); setServerError(null); setShowForm(true); }
  function openEdit(c: Category) { setEditing(c); setServerError(null); setShowForm(true); }
  function closeForm() { if (saving) return; setShowForm(false); setEditing(null); setServerError(null); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-gray-900">Budget Categories</h1>
          <p className="text-gray-500 text-sm mt-1">Set monthly spending limits for each area of your life.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors"
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No categories yet"
          description="Create budget categories to organize your spending and set monthly limits."
          action={{ label: 'Add your first category', onClick: openAdd }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const s = spending.find((x) => x.category.id === cat.id);
            const pct = s?.percentage ?? 0;
            const spent = s?.spent ?? 0;
            return (
              <div key={cat.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-gray-900">{cat.name}</p>
                      <p className="text-xs text-gray-500">Limit: {formatCurrency(cat.monthlyLimit)}/mo</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(cat)}
                      className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Spent this month</span>
                    <span className={`font-semibold ${pct >= 100 ? 'text-red-500' : pct >= 80 ? 'text-amber-600' : 'text-gray-700'}`}>
                      {formatCurrency(spent)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        backgroundColor: pct >= 100 ? '#DC2626' : pct >= 80 ? '#D97706' : cat.color,
                      }}
                    />
                  </div>
                  <p className={`text-xs ${pct >= 100 ? 'text-red-500 font-medium' : pct >= 80 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {pct >= 100 ? `Over by ${formatCurrency(spent - cat.monthlyLimit)}` : `${formatCurrency(cat.monthlyLimit - spent)} remaining`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Category' : 'Add Category'} onClose={closeForm}>
          <CategoryForm
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
