import React, { useState } from 'react';
import { Transaction, Category } from '../../types/finance';
import { today } from '../../lib/calculations';

interface Props {
  initial?: Transaction;
  categories: Category[];
  onSave: (data: Omit<Transaction, 'id'>) => void;
  onCancel: () => void;
}

export default function ExpenseForm({ initial, categories, onSave, onCancel }: Props) {
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '');
  const [date, setDate] = useState(initial?.date ?? today());
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? (categories[0]?.id ?? ''));
  const [merchant, setMerchant] = useState(initial?.merchant ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [type, setType] = useState<'expense' | 'income'>(initial?.type ?? 'expense');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = 'Enter a valid amount';
    if (!date) e.date = 'Date is required';
    if (!merchant.trim()) e.merchant = 'Merchant / description is required';
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave({ amount: parseFloat(amount), date, categoryId, merchant: merchant.trim(), note: note.trim() || undefined, type });
  }

  const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-3">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              type === t
                ? t === 'expense' ? 'bg-red-500 text-white border-red-500' : 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t === 'expense' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount ($)</label>
        <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputCls} />
        {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Merchant / Description</label>
        <input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Whole Foods" className={inputCls} />
        {errors.merchant && <p className="text-red-500 text-xs mt-1">{errors.merchant}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls + ' bg-white'}>
            {categories.length === 0 && <option value="">No categories</option>}
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Note (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any additional details..." className={inputCls} />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="submit" className="flex-1 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors">
          {initial ? 'Save Changes' : 'Add Expense'}
        </button>
      </div>
    </form>
  );
}
