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
 * Returns true when the account was completely fresh (no prior data anywhere),
 * so the caller can auto-seed demo data for new users.
 *
 * Special cases:
 * - If both categories sources are empty, seeds the 12 default categories.
 * - settings.monthlyIncome (deprecated) is intentionally not migrated;
 *   the income migration in the prior PR already handled that field.
 */
export async function runLegacyLocalStorageMigration(
  userId: string,
  defaultCategories: typeof DEFAULT_CATEGORIES,
): Promise<{ isFreshAccount: boolean }> {
  const localCats = readLegacyJson<Category[]>(LEGACY_KEYS.categories, []);
  const localTxns = readLegacyJson<Transaction[]>(LEGACY_KEYS.transactions, []);
  const localDebts = readLegacyJson<Debt[]>(LEGACY_KEYS.debts, []);
  const localSettings = readLegacyJson<LegacySettings | null>(LEGACY_KEYS.settings, null);

  const hasLocalData = localCats.length > 0 || localTxns.length > 0 || localDebts.length > 0 || localSettings != null;

  // Categories: migrate or seed defaults if both sides are empty.
  let supabaseCats = await fetchCategories(userId);
  const hadSupabaseData = supabaseCats.length > 0;
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
  if (hasLocalData) {
    localStorage.removeItem(LEGACY_KEYS.categories);
    localStorage.removeItem(LEGACY_KEYS.transactions);
    localStorage.removeItem(LEGACY_KEYS.debts);
    localStorage.removeItem(LEGACY_KEYS.settings);
  }

  // Fresh account = nothing in Supabase before this run AND no legacy local data.
  const isFreshAccount = !hadSupabaseData && !hasLocalData && supabaseDebts.length === 0 && supabaseTxns.length === 0;
  return { isFreshAccount };
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

  // catIds index: 0=Housing, 1=Utilities, 2=Groceries, 3=Transportation, 4=Dining, 5=Subscriptions,
  //               6=Healthcare, 7=Insurance, 8=Debt Payments, 9=Savings, 10=Personal, 11=Other
  const demoTxns: Omit<Transaction, 'id'>[] = [
    { amount: 1500, date: day(1),  categoryId: catIds[0], merchant: 'Rent',          note: 'Monthly rent', type: 'expense' },
    { amount: 150,  date: day(3),  categoryId: catIds[1], merchant: 'Electric Co.',                        type: 'expense' },
    { amount: 180,  date: day(4),  categoryId: catIds[2], merchant: 'Whole Foods',                         type: 'expense' },
    { amount: 120,  date: day(6),  categoryId: catIds[2], merchant: "Trader Joe's",                        type: 'expense' },
    { amount: 100,  date: day(5),  categoryId: catIds[2], merchant: 'Costco',                              type: 'expense' },
    { amount: 120,  date: day(7),  categoryId: catIds[3], merchant: 'Metro Transit',                       type: 'expense' },
    { amount: 80,   date: day(8),  categoryId: catIds[3], merchant: 'Gas Station',                         type: 'expense' },
    { amount: 95,   date: day(9),  categoryId: catIds[4], merchant: 'Chipotle',                            type: 'expense' },
    { amount: 75,   date: day(11), categoryId: catIds[4], merchant: 'Olive Garden',                        type: 'expense' },
    { amount: 65,   date: day(13), categoryId: catIds[4], merchant: 'Thai Palace',                         type: 'expense' },
    { amount: 65,   date: day(14), categoryId: catIds[4], merchant: 'Pizza Night',                         type: 'expense' },
    { amount: 15,   date: day(14), categoryId: catIds[5], merchant: 'Netflix',                             type: 'expense' },
    { amount: 150,  date: day(15), categoryId: catIds[8], merchant: 'Credit Card Payment',                 type: 'expense' },
  ];
  for (const t of demoTxns) {
    const { error } = await createTransaction(userId, t);
    if (error) return { error };
  }

  // Debts — Sarah's single credit card per the spec.
  const demoDebts: Omit<Debt, 'id'>[] = [
    { name: 'Credit Card', type: 'credit_card', balance: 5000, apr: 18, minimumPayment: 150 },
  ];
  for (const d of demoDebts) {
    const { error } = await createDebt(userId, d);
    if (error) return { error };
  }

  // Settings — acknowledge AI privacy so the plan auto-generates.
  await upsertUserSettings(userId, {
    monthlyIncome: 0,
    currency: 'USD',
    payoffMethod: 'avalanche',
    extraDebtPayment: 0,
    aiPrivacyAcknowledged: true,
  });

  // Sarah's income: $5,000/month net.
  await createIncome(userId, {
    sourceName: 'Salary',
    type: 'salary',
    netAmount: 5000,
    frequency: 'monthly',
  });

  return { error: null };
}
