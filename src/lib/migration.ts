import {
  Category, Transaction, Debt, AppSettings, DEFAULT_CATEGORIES,
} from '../types/finance';
import {
  fetchCategories, createCategory, deleteAllCategories,
} from './categories';
import {
  fetchDebts, createDebt, deleteAllDebts,
} from './debts';
import {
  fetchTransactions, createTransaction, deleteAllTransactions,
} from './transactions';
import {
  fetchUserSettings, upsertUserSettings,
} from './userSettings';
import { createIncome, fetchIncomes, deleteIncome } from './incomes';

const LEGACY_KEYS = {
  categories: 'cp_categories',
  transactions: 'cp_transactions',
  debts: 'cp_debts',
  settings: 'cp_settings',
};

function readLegacyJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface LegacySettings extends Partial<AppSettings> {
  monthlyIncome?: number;
}

/**
 * One-time migration of pre-existing localStorage data into Supabase.
 * Safe to call on every app boot — each table is migrated only when its
 * Supabase counterpart is empty AND localStorage has matching data.
 *
 * Special cases:
 * - If both categories sources are empty, seeds the 12 default categories.
 * - settings.monthlyIncome (deprecated) is intentionally not migrated;
 *   the income migration in the prior PR already handled that field.
 */
export async function runLegacyLocalStorageMigration(
  userId: string,
  defaultCategories: typeof DEFAULT_CATEGORIES,
): Promise<void> {
  const localCats = readLegacyJson<Category[]>(LEGACY_KEYS.categories, []);
  const localTxns = readLegacyJson<Transaction[]>(LEGACY_KEYS.transactions, []);
  const localDebts = readLegacyJson<Debt[]>(LEGACY_KEYS.debts, []);
  const localSettings = readLegacyJson<LegacySettings | null>(LEGACY_KEYS.settings, null);

  // Categories: migrate or seed defaults if both sides are empty.
  let supabaseCats = await fetchCategories(userId);
  const oldToNewCatId: Record<string, string> = {};

  if (supabaseCats.length === 0) {
    if (localCats.length > 0) {
      for (const c of localCats) {
        const { category } = await createCategory(userId, {
          name: c.name,
          monthlyLimit: c.monthlyLimit,
          color: c.color,
          icon: c.icon,
        });
        if (category) oldToNewCatId[c.id] = category.id;
      }
    } else {
      for (const def of defaultCategories) {
        await createCategory(userId, def);
      }
    }
    supabaseCats = await fetchCategories(userId);
  }

  // Build name-based fallback so transactions can still be linked when
  // categories are already in Supabase but local txns reference old ids.
  const nameToSupabaseId: Record<string, string> = {};
  for (const c of supabaseCats) nameToSupabaseId[c.name] = c.id;
  const localIdToName: Record<string, string> = {};
  for (const c of localCats) localIdToName[c.id] = c.name;

  function mapCategoryId(oldId: string): string {
    if (oldToNewCatId[oldId]) return oldToNewCatId[oldId];
    const name = localIdToName[oldId];
    if (name && nameToSupabaseId[name]) return nameToSupabaseId[name];
    return '';
  }

  // Debts.
  const supabaseDebts = await fetchDebts(userId);
  if (supabaseDebts.length === 0 && localDebts.length > 0) {
    for (const d of localDebts) {
      await createDebt(userId, {
        name: d.name,
        type: d.type,
        balance: d.balance,
        apr: d.apr,
        minimumPayment: d.minimumPayment,
        dueDate: d.dueDate,
      });
    }
  }

  // Transactions.
  const supabaseTxns = await fetchTransactions(userId);
  if (supabaseTxns.length === 0 && localTxns.length > 0) {
    for (const t of localTxns) {
      await createTransaction(userId, {
        amount: t.amount,
        date: t.date,
        categoryId: mapCategoryId(t.categoryId),
        merchant: t.merchant,
        note: t.note,
        type: t.type,
      });
    }
  }

  // Settings.
  const supabaseSettings = await fetchUserSettings(userId);
  if (!supabaseSettings && localSettings) {
    await upsertUserSettings(userId, {
      monthlyIncome: 0,
      currency: localSettings.currency ?? 'USD',
      payoffMethod: localSettings.payoffMethod ?? 'avalanche',
      extraDebtPayment: localSettings.extraDebtPayment ?? 0,
      aiPrivacyAcknowledged: localSettings.aiPrivacyAcknowledged ?? false,
    });
  }

  // Clean up legacy keys once any migration occurred.
  const migrated = localCats.length > 0 || localDebts.length > 0 || localTxns.length > 0 || localSettings != null;
  if (migrated) {
    localStorage.removeItem(LEGACY_KEYS.categories);
    localStorage.removeItem(LEGACY_KEYS.transactions);
    localStorage.removeItem(LEGACY_KEYS.debts);
    localStorage.removeItem(LEGACY_KEYS.settings);
  }
}

/**
 * Replaces the user's data in Supabase with a demo dataset. Used by the
 * "Load Demo Data" action in Settings.
 */
export async function loadDemoIntoSupabase(userId: string): Promise<{ error: string | null }> {
  // Wipe in FK-safe order: transactions reference categories.
  const txnDel = await deleteAllTransactions(userId);
  if (txnDel.error) return { error: txnDel.error };
  const debtDel = await deleteAllDebts(userId);
  if (debtDel.error) return { error: debtDel.error };
  const catDel = await deleteAllCategories(userId);
  if (catDel.error) return { error: catDel.error };

  // Incomes don't have a deleteAll helper — small data, delete one by one.
  const existingIncomes = await fetchIncomes(userId);
  for (const inc of existingIncomes) {
    await deleteIncome(userId, inc.id);
  }

  // Categories.
  const catIds: string[] = [];
  for (const def of DEFAULT_CATEGORIES) {
    const { category, error } = await createCategory(userId, def);
    if (error) return { error };
    if (category) catIds.push(category.id);
  }

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const day = (n: number) => `${ym}-${String(n).padStart(2, '0')}`;

  const demoTxns: Omit<Transaction, 'id'>[] = [
    { amount: 1450, date: day(1),  categoryId: catIds[0], merchant: 'Rent',           note: 'Monthly rent', type: 'expense' },
    { amount: 95,   date: day(4),  categoryId: catIds[1], merchant: 'Electric Co.',                          type: 'expense' },
    { amount: 55,   date: day(5),  categoryId: catIds[1], merchant: 'Internet',                              type: 'expense' },
    { amount: 187,  date: day(2),  categoryId: catIds[2], merchant: 'Whole Foods',                           type: 'expense' },
    { amount: 143,  date: day(7),  categoryId: catIds[2], merchant: "Trader Joe's",                          type: 'expense' },
    { amount: 78,   date: day(9),  categoryId: catIds[3], merchant: 'Gas Station',                           type: 'expense' },
    { amount: 45,   date: day(10), categoryId: catIds[4], merchant: 'Chipotle',                              type: 'expense' },
    { amount: 82,   date: day(12), categoryId: catIds[4], merchant: 'Restaurant Week',                       type: 'expense' },
    { amount: 15.99, date: day(14), categoryId: catIds[5], merchant: 'Netflix',                              type: 'expense' },
    { amount: 9.99,  date: day(14), categoryId: catIds[5], merchant: 'Spotify',                              type: 'expense' },
    { amount: 14.99, date: day(14), categoryId: catIds[5], merchant: 'Hulu',                                 type: 'expense' },
    { amount: 250,  date: day(15), categoryId: catIds[8], merchant: 'Visa Payment',                          type: 'expense' },
    { amount: 150,  date: day(18), categoryId: catIds[9], merchant: 'Savings Transfer',                      type: 'expense' },
  ];
  for (const t of demoTxns) {
    const { error } = await createTransaction(userId, t);
    if (error) return { error };
  }

  // Debts.
  const demoDebts: Omit<Debt, 'id'>[] = [
    { name: 'Chase Visa',   type: 'credit_card',  balance: 4200,  apr: 22.99, minimumPayment: 95 },
    { name: 'Student Loan', type: 'student_loan', balance: 18500, apr: 5.5,   minimumPayment: 210 },
    { name: 'Car Loan',     type: 'auto_loan',    balance: 9800,  apr: 7.9,   minimumPayment: 285 },
  ];
  for (const d of demoDebts) {
    const { error } = await createDebt(userId, d);
    if (error) return { error };
  }

  // Settings.
  await upsertUserSettings(userId, {
    monthlyIncome: 0,
    currency: 'USD',
    payoffMethod: 'avalanche',
    extraDebtPayment: 200,
    aiPrivacyAcknowledged: false,
  });

  // Demo income source so the Dashboard isn't blank.
  await createIncome(userId, {
    sourceName: 'Salary',
    type: 'salary',
    grossAmount: 6500,
    netAmount: 5200,
    frequency: 'monthly',
    notes: 'Demo income',
  });

  return { error: null };
}
