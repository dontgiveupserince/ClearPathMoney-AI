import { useMemo, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Category, Transaction } from '../../types/finance';
import { formatCurrency } from '../../lib/calculations';
import {
  parseCsvText, detectColumnRoles, ColumnRole, ColumnMapping,
  DateFormat, DATE_FORMAT_LABELS, detectDateFormat,
  transformRows, dedupAgainstExisting,
} from '../../lib/csv';
import Modal from '../shared/Modal';

type Step = 'upload' | 'map' | 'preview' | 'done';

interface Props {
  categories: Category[];
  existing: Transaction[];
  onClose: () => void;
  onImport: (rows: Omit<Transaction, 'id'>[]) => Promise<{ imported: Transaction[]; error: string | null }>;
}

const NONE = -1;

const ROLE_LABEL: Record<ColumnRole, string> = {
  date: 'Date',
  amount: 'Amount (signed)',
  debit: 'Withdrawal / Debit',
  credit: 'Deposit / Credit',
  merchant: 'Description / Merchant',
  category: 'Category (from bank)',
  notes: 'Notes / Memo',
  ignore: '— ignore —',
};

export default function CsvImport({ categories, existing, onClose, onImport }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const [mapping, setMapping] = useState<ColumnMapping>({
    date: 0, amountMode: 'single', amount: 1, debit: 1, credit: 2, merchant: 2,
    category: NONE, notes: NONE,
    dateFormat: 'iso',
    signMode: 'negative_is_expense',
    defaultCategoryId: categories[0]?.id ?? '',
  });

  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<{ imported: number; skipped: number; errors: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function handleFile(file: File) {
    setParseError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const rows = parseCsvText(text);
      if (rows.length < 2) {
        setParseError('CSV needs a header row plus at least one transaction.');
        return;
      }
      const head = rows[0];
      const data = rows.slice(1);
      const roles = detectColumnRoles(head);

      // Pre-populate mapping based on detected roles.
      const findFirst = (role: ColumnRole) => roles.findIndex((r) => r === role);
      const dateIdx = findFirst('date');
      const amountIdx = findFirst('amount');
      const debitIdx = findFirst('debit');
      const creditIdx = findFirst('credit');
      const merchantIdx = findFirst('merchant');
      const catIdx = findFirst('category');
      const notesIdx = findFirst('notes');

      const sampleDates = data.slice(0, 8).map((r) => r[dateIdx >= 0 ? dateIdx : 0] ?? '');
      const detectedFormat: DateFormat = detectDateFormat(sampleDates);

      setHeaders(head);
      setDataRows(data);
      setMapping((prev) => ({
        ...prev,
        date: dateIdx >= 0 ? dateIdx : 0,
        amountMode: amountIdx >= 0 ? 'single' : (debitIdx >= 0 || creditIdx >= 0) ? 'split' : 'single',
        amount: amountIdx >= 0 ? amountIdx : 1,
        debit: debitIdx >= 0 ? debitIdx : 1,
        credit: creditIdx >= 0 ? creditIdx : 2,
        merchant: merchantIdx >= 0 ? merchantIdx : 2,
        category: catIdx,
        notes: notesIdx,
        dateFormat: detectedFormat,
      }));
      setStep('map');
    };
    reader.onerror = () => setParseError('Could not read file.');
    reader.readAsText(file);
  }

  const transformed = useMemo(() => {
    if (step !== 'preview' && step !== 'done') return null;
    return transformRows(dataRows, mapping, categories);
  }, [step, dataRows, mapping, categories]);

  const dedupResult = useMemo(() => {
    if (!transformed) return null;
    return dedupAgainstExisting(transformed.ok, existing);
  }, [transformed, existing]);

  async function handleImport() {
    if (!dedupResult) return;
    setImporting(true);
    setImportError(null);
    const { imported, error } = await onImport(dedupResult.unique);
    setImporting(false);
    if (error) {
      setImportError(error);
      return;
    }
    setSummary({
      imported: imported.length,
      skipped: dedupResult.skipped,
      errors: transformed?.errors.length ?? 0,
    });
    setStep('done');
  }

  const colOptions = headers.map((h, i) => ({ value: i, label: `${i + 1}. ${h || '(empty)'}` }));

  return (
    <Modal title="Import Expenses from CSV" onClose={onClose} size="lg">
      {step === 'upload' && <UploadStep onFile={handleFile} parseError={parseError} />}

      {step === 'map' && (
        <MapStep
          headers={headers}
          dataRows={dataRows}
          mapping={mapping}
          setMapping={setMapping}
          categories={categories}
          colOptions={colOptions}
          fileName={fileName}
          onBack={() => setStep('upload')}
          onNext={() => setStep('preview')}
        />
      )}

      {step === 'preview' && transformed && dedupResult && (
        <PreviewStep
          transformed={transformed}
          dedup={dedupResult}
          categories={categories}
          importing={importing}
          importError={importError}
          onBack={() => setStep('map')}
          onImport={handleImport}
        />
      )}

      {step === 'done' && summary && (
        <DoneStep summary={summary} onClose={onClose} />
      )}
    </Modal>
  );
}

// ---------- Step components ----------

function UploadStep({ onFile, parseError }: { onFile: (f: File) => void; parseError: string | null }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Upload a CSV exported from your bank. Most banks let you download monthly transactions
        as CSV from the statement page. We'll auto-detect the columns and let you confirm before importing.
      </p>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={`flex flex-col items-center justify-center gap-3 px-6 py-10 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
          dragOver ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:bg-gray-50'
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center">
          <Upload size={22} className="text-teal-600" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">Drop your CSV here, or click to browse</p>
          <p className="text-xs text-gray-400 mt-1">Plain CSV files only — up to a few thousand rows.</p>
        </div>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </label>

      {parseError && (
        <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{parseError}</p>
        </div>
      )}
    </div>
  );
}

function MapStep(props: {
  headers: string[];
  dataRows: string[][];
  mapping: ColumnMapping;
  setMapping: (fn: (prev: ColumnMapping) => ColumnMapping) => void;
  categories: Category[];
  colOptions: { value: number; label: string }[];
  fileName: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const { headers, dataRows, mapping, setMapping, categories, colOptions, fileName, onBack, onNext } = props;
  const sample = dataRows.slice(0, 3);
  const set = (patch: Partial<ColumnMapping>) => setMapping((prev) => ({ ...prev, ...patch }));

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white';

  const ready = (
    mapping.date >= 0 && mapping.merchant >= 0 &&
    (mapping.amountMode === 'single' ? mapping.amount >= 0 : mapping.debit >= 0 && mapping.credit >= 0)
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <FileText size={14} />
        <span className="truncate">{fileName}</span>
        <span className="ml-auto">{dataRows.length} row{dataRows.length === 1 ? '' : 's'}</span>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-900 mb-2">Sample rows</p>
        <div className="overflow-x-auto border border-gray-100 rounded-xl">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="text-left px-3 py-2 text-gray-600 font-medium whitespace-nowrap">{h || `Column ${i + 1}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sample.map((row, ri) => (
                <tr key={ri} className="border-t border-gray-100">
                  {headers.map((_, ci) => (
                    <td key={ci} className="px-3 py-2 text-gray-700 whitespace-nowrap">{row[ci] ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Date column">
          <select className={inputCls} value={mapping.date} onChange={(e) => set({ date: +e.target.value })}>
            {colOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Date format">
          <select className={inputCls} value={mapping.dateFormat} onChange={(e) => set({ dateFormat: e.target.value as DateFormat })}>
            {Object.entries(DATE_FORMAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>

        <Field label="Description / Merchant column">
          <select className={inputCls} value={mapping.merchant} onChange={(e) => set({ merchant: +e.target.value })}>
            {colOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field label="Amount layout">
          <select className={inputCls} value={mapping.amountMode} onChange={(e) => set({ amountMode: e.target.value as 'single' | 'split' })}>
            <option value="single">Single amount column</option>
            <option value="split">Separate Withdrawal + Deposit columns</option>
          </select>
        </Field>

        {mapping.amountMode === 'single' ? (
          <>
            <Field label="Amount column">
              <select className={inputCls} value={mapping.amount} onChange={(e) => set({ amount: +e.target.value })}>
                {colOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Sign convention">
              <select className={inputCls} value={mapping.signMode} onChange={(e) => set({ signMode: e.target.value as ColumnMapping['signMode'] })}>
                <option value="negative_is_expense">Negative = expense (most banks)</option>
                <option value="positive_is_expense">Positive = expense</option>
                <option value="all_expense">All rows are expenses</option>
                <option value="all_income">All rows are income</option>
              </select>
            </Field>
          </>
        ) : (
          <>
            <Field label="Withdrawal column">
              <select className={inputCls} value={mapping.debit} onChange={(e) => set({ debit: +e.target.value })}>
                {colOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Deposit column">
              <select className={inputCls} value={mapping.credit} onChange={(e) => set({ credit: +e.target.value })}>
                {colOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </>
        )}

        <Field label="Category column (optional)">
          <select className={inputCls} value={mapping.category} onChange={(e) => set({ category: +e.target.value })}>
            <option value={NONE}>{ROLE_LABEL.ignore}</option>
            {colOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Notes column (optional)">
          <select className={inputCls} value={mapping.notes} onChange={(e) => set({ notes: +e.target.value })}>
            <option value={NONE}>{ROLE_LABEL.ignore}</option>
            {colOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field label="Default category (used when no match)">
          <select className={inputCls} value={mapping.defaultCategoryId} onChange={(e) => set({ defaultCategoryId: e.target.value })}>
            <option value="">— Uncategorized —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
          <ArrowLeft size={14} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!ready}
          className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          Preview <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function PreviewStep({
  transformed, dedup, categories, importing, importError, onBack, onImport,
}: {
  transformed: ReturnType<typeof transformRows>;
  dedup: ReturnType<typeof dedupAgainstExisting>;
  categories: Category[];
  importing: boolean;
  importError: string | null;
  onBack: () => void;
  onImport: () => void;
}) {
  const sample = dedup.unique.slice(0, 25);
  const totalUnique = dedup.unique.length;
  const totalSkipped = dedup.skipped;
  const totalErrors = transformed.errors.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="To import" value={totalUnique} positive />
        <Stat label="Duplicates skipped" value={totalSkipped} muted />
        <Stat label="Rows with errors" value={totalErrors} warn={totalErrors > 0} />
      </div>

      {totalUnique === 0 ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800">No new transactions to import — every row either errored or matched an existing entry.</p>
        </div>
      ) : (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-72">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-600 font-medium">Date</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-medium">Merchant</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-medium">Category</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-medium">Type</th>
                  <th className="text-right px-3 py-2 text-gray-600 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sample.map((t, i) => {
                  const cat = categories.find((c) => c.id === t.categoryId);
                  return (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{t.date}</td>
                      <td className="px-3 py-2 text-gray-700">{t.merchant}</td>
                      <td className="px-3 py-2 text-gray-500">{cat?.name ?? 'Uncategorized'}</td>
                      <td className="px-3 py-2 capitalize text-gray-500">{t.type}</td>
                      <td className={`px-3 py-2 text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalUnique > sample.length && (
            <p className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100">
              Showing first {sample.length} of {totalUnique} new rows.
            </p>
          )}
        </div>
      )}

      {totalErrors > 0 && (
        <details className="border border-gray-100 rounded-xl">
          <summary className="px-3 py-2 text-sm font-medium text-amber-700 cursor-pointer">
            {totalErrors} row{totalErrors === 1 ? '' : 's'} could not be parsed
          </summary>
          <ul className="px-4 py-2 max-h-40 overflow-y-auto text-xs text-gray-600 space-y-1">
            {transformed.errors.slice(0, 50).map((e, i) => (
              <li key={i}>Row {e.rowIndex + 2}: {e.reason}</li>
            ))}
            {transformed.errors.length > 50 && <li className="text-gray-400">…and {transformed.errors.length - 50} more</li>}
          </ul>
        </details>
      )}

      {importError && (
        <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{importError}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button onClick={onBack} disabled={importing} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
          <ArrowLeft size={14} /> Back
        </button>
        <button
          onClick={onImport}
          disabled={importing || totalUnique === 0}
          className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {importing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          {importing ? 'Importing…' : `Import ${totalUnique} transaction${totalUnique === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}

function DoneStep({ summary, onClose }: { summary: { imported: number; skipped: number; errors: number }; onClose: () => void }) {
  return (
    <div className="space-y-4 text-center py-2">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-green-50 flex items-center justify-center">
        <CheckCircle2 size={28} className="text-green-600" />
      </div>
      <div>
        <p className="font-heading font-bold text-lg text-gray-900">Import complete</p>
        <p className="text-sm text-gray-500 mt-1">
          {summary.imported} imported · {summary.skipped} duplicate{summary.skipped === 1 ? '' : 's'} skipped · {summary.errors} error{summary.errors === 1 ? '' : 's'}
        </p>
      </div>
      <button onClick={onClose} className="px-5 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors">
        Done
      </button>
    </div>
  );
}

// ---------- Small bits ----------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, positive, warn, muted }: { label: string; value: number; positive?: boolean; warn?: boolean; muted?: boolean }) {
  const valueCls = warn ? 'text-amber-600' : positive ? 'text-teal-700' : muted ? 'text-gray-500' : 'text-gray-900';
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-heading font-bold text-xl ${valueCls}`}>{value}</p>
    </div>
  );
}
