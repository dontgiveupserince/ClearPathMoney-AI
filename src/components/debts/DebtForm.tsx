import React, { useState } from 'react';
import { Debt, DEBT_TYPES } from '../../types/finance';

interface Props {
  initial?: Debt;
  onSave: (data: Omit<Debt, 'id'>) => void;
  onCancel: () => void;
}

export default function DebtForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<Debt['type']>(initial?.type ?? 'credit_card');
  const [balance, setBalance] = useState(initial?.balance?.toString() ?? '');
  const [apr, setApr] = useState(initial?.apr?.toString() ?? '');
  const [minimumPayment, setMinimumPayment] = useState(initial?.minimumPayment?.toString() ?? '');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!balance || isNaN(Number(balance)) || Number(balance) < 0) e.balance = 'Enter a valid balance';
    if (!apr || isNaN(Number(apr)) || Number(apr) < 0) e.apr = 'Enter a valid APR';
    if (!minimumPayment || isNaN(Number(minimumPayment)) || Number(minimumPayment) < 0) e.minimumPayment = 'Enter a valid minimum payment';
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave({
      name: name.trim(),
      type,
      balance: parseFloat(balance),
      apr: parseFloat(apr),
      minimumPayment: parseFloat(minimumPayment),
      dueDate: dueDate || undefined,
    });
  }

  const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Debt Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chase Visa" className={inputCls} />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value as Debt['type'])} className={inputCls + ' bg-white'}>
          {Object.entries(DEBT_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Balance ($)</label>
          <input type="number" min="0" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00" className={inputCls} />
          {errors.balance && <p className="text-red-500 text-xs mt-1">{errors.balance}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">APR (%)</label>
          <input type="number" min="0" step="0.01" value={apr} onChange={(e) => setApr(e.target.value)} placeholder="0.00" className={inputCls} />
          {errors.apr && <p className="text-red-500 text-xs mt-1">{errors.apr}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Min. Monthly Payment ($)</label>
          <input type="number" min="0" step="0.01" value={minimumPayment} onChange={(e) => setMinimumPayment(e.target.value)} placeholder="0.00" className={inputCls} />
          {errors.minimumPayment && <p className="text-red-500 text-xs mt-1">{errors.minimumPayment}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date (optional)</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="submit" className="flex-1 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors">
          {initial ? 'Save Changes' : 'Add Debt'}
        </button>
      </div>
    </form>
  );
}
