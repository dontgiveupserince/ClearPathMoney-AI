import { Category, Transaction, Debt, AppSettings, AIInsight, DEFAULT_CATEGORIES } from '../types/finance';

const KEYS = {
  categories: 'cp_categories',
  transactions: 'cp_transactions',
  debts: 'cp_debts',
  settings: 'cp_settings',
  aiInsight: 'cp_ai_insight',
};

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getCategories(): Category[] {
  return get<Category[]>(KEYS.categories, []);
}

export function saveCategories(categories: Category[]): void {
  set(KEYS.categories, categories);
}

export function getTransactions(): Transaction[] {
  return get<Transaction[]>(KEYS.transactions, []);
}

export function saveTransactions(transactions: Transaction[]): void {
  set(KEYS.transactions, transactions);
}

export function getDebts(): Debt[] {
  return get<Debt[]>(KEYS.debts, []);
}

export function saveDebts(debts: Debt[]): void {
  set(KEYS.debts, debts);
}

export function getSettings(): AppSettings {
  return get<AppSettings>(KEYS.settings, {
    monthlyIncome: 0,
    currency: 'USD',
    payoffMethod: 'avalanche',
    extraDebtPayment: 0,
    aiPrivacyAcknowledged: false,
  });
}

export function saveSettings(settings: AppSettings): void {
  set(KEYS.settings, settings);
}

export function getAIInsight(): AIInsight | null {
  return get<AIInsight | null>(KEYS.aiInsight, null);
}

export function saveAIInsight(insight: AIInsight): void {
  set(KEYS.aiInsight, insight);
}

export function initializeDefaults(): void {
  if (getCategories().length === 0) {
    const cats: Category[] = DEFAULT_CATEGORIES.map((c, i) => ({
      ...c,
      id: `cat_${Date.now()}_${i}`,
    }));
    saveCategories(cats);
  }
}

export function loadDemoData(): void {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const cats: Category[] = DEFAULT_CATEGORIES.map((c, i) => ({
    ...c,
    id: `cat_${i}`,
  }));
  saveCategories(cats);

  const days = [2, 4, 5, 7, 9, 10, 12, 14, 15, 18, 20, 22, 24, 26];
  const expenses: Transaction[] = [
    { id: 't1', amount: 1450, date: `${year}-${String(month + 1).padStart(2, '0')}-01`, categoryId: 'cat_0', merchant: 'Rent', note: 'Monthly rent', type: 'expense' },
    { id: 't2', amount: 95, date: `${year}-${String(month + 1).padStart(2, '0')}-${days[1]}`, categoryId: 'cat_1', merchant: 'Electric Co.', type: 'expense' },
    { id: 't3', amount: 55, date: `${year}-${String(month + 1).padStart(2, '0')}-${days[2]}`, categoryId: 'cat_1', merchant: 'Internet', type: 'expense' },
    { id: 't4', amount: 187, date: `${year}-${String(month + 1).padStart(2, '0')}-${days[0]}`, categoryId: 'cat_2', merchant: 'Whole Foods', type: 'expense' },
    { id: 't5', amount: 143, date: `${year}-${String(month + 1).padStart(2, '0')}-${days[3]}`, categoryId: 'cat_2', merchant: 'Trader Joe\'s', type: 'expense' },
    { id: 't6', amount: 78, date: `${year}-${String(month + 1).padStart(2, '0')}-${days[4]}`, categoryId: 'cat_3', merchant: 'Gas Station', type: 'expense' },
    { id: 't7', amount: 45, date: `${year}-${String(month + 1).padStart(2, '0')}-${days[5]}`, categoryId: 'cat_4', merchant: 'Chipotle', type: 'expense' },
    { id: 't8', amount: 82, date: `${year}-${String(month + 1).padStart(2, '0')}-${days[6]}`, categoryId: 'cat_4', merchant: 'Restaurant Week', type: 'expense' },
    { id: 't9', amount: 15.99, date: `${year}-${String(month + 1).padStart(2, '0')}-${days[7]}`, categoryId: 'cat_5', merchant: 'Netflix', type: 'expense' },
    { id: 't10', amount: 9.99, date: `${year}-${String(month + 1).padStart(2, '0')}-${days[7]}`, categoryId: 'cat_5', merchant: 'Spotify', type: 'expense' },
    { id: 't11', amount: 14.99, date: `${year}-${String(month + 1).padStart(2, '0')}-${days[7]}`, categoryId: 'cat_5', merchant: 'Hulu', type: 'expense' },
    { id: 't12', amount: 250, date: `${year}-${String(month + 1).padStart(2, '0')}-${days[8]}`, categoryId: 'cat_8', merchant: 'Visa Payment', type: 'expense' },
    { id: 't13', amount: 150, date: `${year}-${String(month + 1).padStart(2, '0')}-${days[9]}`, categoryId: 'cat_9', merchant: 'Savings Transfer', type: 'expense' },
  ];
  saveTransactions(expenses);

  const debts: Debt[] = [
    { id: 'd1', name: 'Chase Visa', type: 'credit_card', balance: 4200, apr: 22.99, minimumPayment: 95 },
    { id: 'd2', name: 'Student Loan', type: 'student_loan', balance: 18500, apr: 5.5, minimumPayment: 210 },
    { id: 'd3', name: 'Car Loan', type: 'auto_loan', balance: 9800, apr: 7.9, minimumPayment: 285 },
  ];
  saveDebts(debts);

  saveSettings({
    monthlyIncome: 5200,
    currency: 'USD',
    payoffMethod: 'avalanche',
    extraDebtPayment: 200,
    aiPrivacyAcknowledged: false,
  });
}
