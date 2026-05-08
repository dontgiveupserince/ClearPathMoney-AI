import React, { useState } from 'react';
import { Category } from '../../types/finance';

const PRESET_COLORS = [
  '#0F766E', '#2563EB', '#16A34A', '#D97706', '#EA580C',
  '#DC2626', '#0891B2', '#7C3AED', '#BE185D', '#059669',
  '#6B7280', '#78716C',
];

interface Props {
  initial?: Category;
  onSave: (data: Omit<Category, 'id'>) => void;
  onCancel: () => void;
}

export default function CategoryForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [monthlyLimit, setMonthlyLimit] = useState(initial?.monthlyLimit?.toString() ?? '');
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!monthlyLimit || isNaN(Number(monthlyLimit)) || Number(monthlyLimit) <= 0)
      e.monthlyLimit = 'Enter a valid monthly limit';
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave({ name: name.trim(), monthlyLimit: parseFloat(monthlyLimit), color });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Category Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Groceries"
          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Monthly Limit ($)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={monthlyLimit}
          onChange={(e) => setMonthlyLimit(e.target.value)}
          placeholder="0.00"
          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        {errors.monthlyLimit && <p className="text-red-500 text-xs mt-1">{errors.monthlyLimit}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-lg border-2 transition-all"
              style={{
                backgroundColor: c,
                borderColor: color === c ? '#111' : 'transparent',
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="submit" className="flex-1 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors">
          {initial ? 'Save Changes' : 'Add Category'}
        </button>
      </div>
    </form>
  );
}
