import React, { useState } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Receipt, Search, Filter } from 'lucide-react';
import { Transaction, Category } from '../../types/finance';
import { formatCurrency, formatDate } from '../../lib/calculations';
import Modal from '../shared/Modal';
import EmptyState from '../shared/EmptyState';
import ExpenseForm from './ExpenseForm';

interface Props {
  transactions: Transaction[];
  categories: Category[];
  onChange: (txns: Transaction[]) => void;
}

export default function Expenses({ transactions, categories, onChange }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');

  function handleSave(data: Omit<Transaction, 'id'>) {
    if (editing) {
      onChange(transactions.map((t) => (t.id === editing.id ? { ...editing, ...data } : t)));
    } else {
      onChange([{ ...data, id: `txn_${Date.now()}` }, ...transactions]);
    }
    setShowForm(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return;
    onChange(transactions.filter((t) => t.id !== id));
  }

  const filtered = transactions
    .filter((t) => {
      const matchSearch = !search || t.merchant.toLowerCase().includes(search.toLowerCase()) || (t.note ?? '').toLowerCase().includes(search.toLowerCase());
      const matchCat = !filterCat || t.categoryId === filterCat;
      return matchSearch && matchCat;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const total = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-gray-900">Expenses</h1>
          <p className="text-gray-500 text-sm mt-1">Track every dollar that goes out.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors"
        >
          <Plus size={16} />
          Add Expense
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white appearance-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-600">
            Total: {formatCurrency(total)}
          </div>
        )}
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Start logging your expenses to see where your money goes and stay on top of your budget."
          action={{ label: 'Log your first expense', onClick: () => setShowForm(true) }}
        />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
          <p className="text-gray-500 text-sm">No transactions match your search.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map((t) => {
              const cat = categories.find((c) => c.id === t.categoryId);
              return (
                <div key={t.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: (cat?.color ?? '#6B7280') + '20' }}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat?.color ?? '#6B7280' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{t.merchant}</p>
                    <p className="text-xs text-gray-500">{cat?.name ?? 'Uncategorized'} · {formatDate(t.date)}</p>
                    {t.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{t.note}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{t.type}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditing(t); setShowForm(true); }}
                      className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showForm && (
        <Modal
          title={editing ? 'Edit Expense' : 'Add Expense'}
          onClose={() => { setShowForm(false); setEditing(null); }}
        >
          <ExpenseForm
            initial={editing ?? undefined}
            categories={categories}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </Modal>
      )}
    </div>
  );
}
