import { Transaction, Category } from '../types/finance';

// ---------- CSV parsing ----------

/**
 * Minimal RFC-4180-style CSV parser. Handles quoted fields with embedded
 * commas, escaped double-quotes (""), CR/LF/CRLF line endings, and BOM.
 * Returns rows as arrays of strings (no header awareness).
 */
export function parseCsvText(text: string): string[][] {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const pushRow = () => {
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
      rows.push(row);
    }
    row = [];
  };

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r' || c === '\n') {
      row.push(field); field = '';
      pushRow();
      if (c === '\r' && text[i + 1] === '\n') i++;
      i++;
      continue;
    }
    field += c;
    i++;
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    pushRow();
  }
  return rows;
}

// ---------- Column detection ----------

export type ColumnRole =
  | 'date'
  | 'amount'
  | 'debit'
  | 'credit'
  | 'merchant'
  | 'category'
  | 'notes'
  | 'ignore';

const COLUMN_PATTERNS: { role: ColumnRole; pattern: RegExp }[] = [
  { role: 'date',      pattern: /^(transaction\s*)?(date|posted|posting\s*date)/i },
  { role: 'debit',     pattern: /^(debit|withdrawal|withdrawals|debits|money\s*out)$/i },
  { role: 'credit',    pattern: /^(credit|deposit|deposits|credits|money\s*in)$/i },
  { role: 'amount',    pattern: /^(amount|transaction\s*amount|value)$/i },
  { role: 'merchant',  pattern: /^(merchant|description|narrative|name|details|payee|transaction|memo)$/i },
  { role: 'category',  pattern: /^(category|type)$/i },
  { role: 'notes',     pattern: /^(notes?|reference)$/i },
];

export function detectRoleForHeader(header: string): ColumnRole {
  const h = header.trim();
  for (const { role, pattern } of COLUMN_PATTERNS) {
    if (pattern.test(h)) return role;
  }
  return 'ignore';
}

export function detectColumnRoles(headers: string[]): ColumnRole[] {
  const roles = headers.map(detectRoleForHeader);
  // Avoid the same role being assigned to two columns (keep the first match).
  const seen = new Set<ColumnRole>();
  return roles.map((r) => {
    if (r === 'ignore') return r;
    if (seen.has(r)) return 'ignore';
    seen.add(r);
    return r;
  });
}

// ---------- Date parsing ----------

export type DateFormat = 'iso' | 'us' | 'eu' | 'mon';

export const DATE_FORMAT_LABELS: Record<DateFormat, string> = {
  iso: 'YYYY-MM-DD (ISO)',
  us: 'MM/DD/YYYY (US)',
  eu: 'DD/MM/YYYY (EU / Canada)',
  mon: 'DD-Mon-YYYY (e.g. 15-Jan-2026)',
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function pad(n: number): string { return String(n).padStart(2, '0'); }

export function parseDate(raw: string, fmt: DateFormat): string | null {
  const s = raw.trim();
  if (!s) return null;

  if (fmt === 'iso') {
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return null;
    return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  }
  if (fmt === 'us' || fmt === 'eu') {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (!m) return null;
    let y = +m[3];
    if (y < 100) y += y >= 70 ? 1900 : 2000;
    const a = +m[1], b = +m[2];
    const month = fmt === 'us' ? a : b;
    const day   = fmt === 'us' ? b : a;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${y}-${pad(month)}-${pad(day)}`;
  }
  if (fmt === 'mon') {
    const m = s.match(/^(\d{1,2})[\s\-]([A-Za-z]{3})[\s\-](\d{2,4})/);
    if (!m) return null;
    const day = +m[1];
    const month = MONTHS[m[2].toLowerCase()];
    if (!month) return null;
    let y = +m[3];
    if (y < 100) y += y >= 70 ? 1900 : 2000;
    return `${y}-${pad(month)}-${pad(day)}`;
  }
  return null;
}

export function detectDateFormat(samples: string[]): DateFormat {
  const candidates: DateFormat[] = ['iso', 'us', 'eu', 'mon'];
  for (const fmt of candidates) {
    if (samples.every((s) => !s.trim() || parseDate(s, fmt) != null)) {
      return fmt;
    }
  }
  return 'us';
}

// ---------- Amount parsing ----------

/**
 * Parses currency-shaped strings: "$1,234.56", "(45.99)", "-12.00", "1.234,56"
 * (European) etc. Returns null if we can't get a number.
 */
export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;

  // Parens => negative.
  let negative = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  }

  // Strip currency symbols and spaces.
  s = s.replace(/[\s$£€¥₹]/g, '');

  // If we have both ',' and '.' assume EU style if comma comes after dot.
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot && lastComma > -1) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

// ---------- Row transformation ----------

export interface ColumnMapping {
  date: number;
  amountMode: 'single' | 'split';
  amount: number;        // used when amountMode === 'single'
  debit: number;         // used when amountMode === 'split'
  credit: number;        // used when amountMode === 'split'
  merchant: number;
  category: number;      // -1 if unset
  notes: number;         // -1 if unset
  dateFormat: DateFormat;
  /** Sign convention for single-amount mode. */
  signMode: 'negative_is_expense' | 'positive_is_expense' | 'all_expense' | 'all_income';
  defaultCategoryId: string;
}

export interface TransformResult {
  ok: Omit<Transaction, 'id'>[];
  errors: { rowIndex: number; reason: string }[];
}

function fuzzyMatchCategory(name: string | undefined, categories: Category[]): string {
  if (!name) return '';
  const t = name.trim().toLowerCase();
  if (!t) return '';
  const exact = categories.find((c) => c.name.toLowerCase() === t);
  if (exact) return exact.id;
  const partial = categories.find((c) => t.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(t));
  return partial?.id ?? '';
}

export function transformRows(
  dataRows: string[][],
  mapping: ColumnMapping,
  categories: Category[],
): TransformResult {
  const ok: Omit<Transaction, 'id'>[] = [];
  const errors: { rowIndex: number; reason: string }[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const dateRaw = row[mapping.date] ?? '';
    const date = parseDate(dateRaw, mapping.dateFormat);
    if (!date) { errors.push({ rowIndex: i, reason: `Invalid date: "${dateRaw}"` }); continue; }

    let signedAmount: number | null = null;
    if (mapping.amountMode === 'single') {
      signedAmount = parseAmount(row[mapping.amount] ?? '');
    } else {
      const debit = parseAmount(row[mapping.debit] ?? '') ?? 0;
      const credit = parseAmount(row[mapping.credit] ?? '') ?? 0;
      // If both are 0 the row is empty for our purposes.
      if (debit === 0 && credit === 0) {
        errors.push({ rowIndex: i, reason: 'No debit or credit amount' });
        continue;
      }
      signedAmount = credit - debit;
    }
    if (signedAmount == null || !Number.isFinite(signedAmount)) {
      errors.push({ rowIndex: i, reason: 'Invalid amount' });
      continue;
    }

    let type: Transaction['type'];
    if (mapping.amountMode === 'split') {
      type = signedAmount >= 0 ? 'income' : 'expense';
    } else if (mapping.signMode === 'all_expense') {
      type = 'expense';
    } else if (mapping.signMode === 'all_income') {
      type = 'income';
    } else if (mapping.signMode === 'positive_is_expense') {
      type = signedAmount >= 0 ? 'expense' : 'income';
    } else {
      type = signedAmount < 0 ? 'expense' : 'income';
    }
    const amount = Math.abs(signedAmount);

    const merchant = (row[mapping.merchant] ?? '').trim() || 'Unknown';
    const note = mapping.notes >= 0 ? (row[mapping.notes] ?? '').trim() || undefined : undefined;
    const csvCategory = mapping.category >= 0 ? row[mapping.category] : undefined;
    const categoryId = fuzzyMatchCategory(csvCategory, categories) || mapping.defaultCategoryId || '';

    ok.push({ amount, date, categoryId, merchant, note, type });
  }

  return { ok, errors };
}

// ---------- Dedup ----------

function dupKey(date: string, amount: number, merchant: string): string {
  return `${date}|${amount.toFixed(2)}|${merchant.trim().toLowerCase()}`;
}

export function dedupAgainstExisting(
  candidates: Omit<Transaction, 'id'>[],
  existing: Transaction[],
): { unique: Omit<Transaction, 'id'>[]; skipped: number } {
  const seen = new Set<string>();
  for (const t of existing) seen.add(dupKey(t.date, t.amount, t.merchant));
  const unique: Omit<Transaction, 'id'>[] = [];
  let skipped = 0;
  for (const c of candidates) {
    const k = dupKey(c.date, c.amount, c.merchant);
    if (seen.has(k)) { skipped++; continue; }
    seen.add(k); // also dedup within the file itself
    unique.push(c);
  }
  return { unique, skipped };
}
