import React, { useState } from 'react';
import { Income, INCOME_TYPES, INCOME_FREQUENCIES } from '../../types/finance';

interface Props {
  initial?: Income;
  onSave: (data: Omit<Income, 'id'>) => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  serverError?: string | null;
}

export default function IncomeForm({ initial, onSave, onCancel, saving, serverError }: Props) {
  const [sourceName, setSourceName] = useState(initial?.sourceName ?? '');
  const [type, setType] = useState<Income['type']>(initial?.type ?? 'salary');
  const [grossAmount, setGrossAmount] = useState(initial?.grossAmount?.toString() ?? '');
  const [netAmount, setNetAmount] = useState(initial?.netAmount?.toString() ?? '');
  const [frequency, setFrequency] = useState<Income['frequency']>(initial?.frequency ?? 'monthly');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!sourceName.trim()) e.sourceName = 'Source name is required';
    if (!grossAmount || isNaN(Number(grossAmount)) || Number(grossAmount) < 0) {
      e.grossAmount = 'Enter a valid gross amount';
    }
    if (!netAmount || isNaN(Number(netAmount)) || Number(netAmount) < 0) {
      e.netAmount = 'Enter a valid net amount';
    }
    if (!e.grossAmount && !e.netAmount && Number(netAmount) > Number(grossAmount)) {
      e.netAmount = 'Net cannot exceed gross';
    }
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    onSave({
      sourceName: sourceName.trim(),
      type,
      grossAmount: parseFloat(grossAmount),
      netAmount: parseFloat(netAmount),
      frequency,
      notes: notes.trim() || undefined,
    });
  }

  const inputCls = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Income Source Name</label>
        <input
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
          placeholder="e.g. Job, Side Business, Rental Property"
          className={inputCls}
        />
        {errors.sourceName && <p className="text-red-500 text-xs mt-1">{errors.sourceName}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Income Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as Income['type'])}
          className={inputCls + ' bg-white'}
        >
          {Object.entries(INCOME_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Gross Income ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={grossAmount}
            onChange={(e) => setGrossAmount(e.target.value)}
            placeholder="0.00"
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">Before tax</p>
          {errors.grossAmount && <p className="text-red-500 text-xs mt-1">{errors.grossAmount}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Net Income ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={netAmount}
            onChange={(e) => setNetAmount(e.target.value)}
            placeholder="0.00"
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">After tax</p>
          {errors.netAmount && <p className="text-red-500 text-xs mt-1">{errors.netAmount}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Frequency</label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as Income['frequency'])}
          className={inputCls + ' bg-white'}
        >
          {Object.entries(INCOME_FREQUENCIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything worth remembering about this source"
          className={inputCls}
        />
      </div>

      {serverError && (
        <p className="text-red-500 text-sm">{serverError}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Income'}
        </button>
      </div>
    </form>
  );
}
