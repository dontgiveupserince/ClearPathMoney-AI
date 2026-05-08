export interface Category {
  id: string;
  name: string;
  monthlyLimit: number;
  color: string;
  icon?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  categoryId: string;
  merchant: string;
  note?: string;
  type: 'expense' | 'income';
}

export interface Debt {
  id: string;
  name: string;
  type: 'credit_card' | 'student_loan' | 'auto_loan' | 'mortgage' | 'personal_loan' | 'medical' | 'other';
  balance: number;
  apr: number;
  minimumPayment: number;
  dueDate?: string;
}

export interface AppSettings {
  /** @deprecated Replaced by per-user `incomes` table. Kept for one-time migration of pre-existing local data. */
  monthlyIncome: number;
  currency: string;
  payoffMethod: 'snowball' | 'avalanche';
  extraDebtPayment: number;
  aiPrivacyAcknowledged: boolean;
  openAiApiKey?: string;
}

export type IncomeType =
  | 'salary'
  | 'business'
  | 'investment'
  | 'rental'
  | 'pension'
  | 'government'
  | 'other';

export type IncomeFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface Income {
  id: string;
  sourceName: string;
  type: IncomeType;
  netAmount: number;
  frequency: IncomeFrequency;
  notes?: string;
}

export const INCOME_TYPES: Record<IncomeType, string> = {
  salary: 'Salary / Employment',
  business: 'Business / Self-Employment',
  investment: 'Investment Income',
  rental: 'Rental Income',
  pension: 'Pension / Retirement',
  government: 'Government Benefits',
  other: 'Other',
};

export const INCOME_FREQUENCIES: Record<IncomeFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export interface PayoffMonth {
  month: number;
  year: number;
  label: string;
  debts: { id: string; name: string; balance: number; payment: number; interest: number }[];
  totalBalance: number;
  totalInterest: number;
}

export interface PayoffPlan {
  method: 'snowball' | 'avalanche';
  debtFreeDate: string;
  totalInterest: number;
  totalMonths: number;
  schedule: PayoffMonth[];
  warningDebts: string[];
}

export interface AIInsight {
  generatedAt: string;
  summary: string;
  alerts: string[];
  actions: string[];
  debtAdvice: string;
  savingsOpportunities: string[];
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Housing', monthlyLimit: 1500, color: '#0F766E' },
  { name: 'Utilities', monthlyLimit: 200, color: '#2563EB' },
  { name: 'Groceries', monthlyLimit: 500, color: '#16A34A' },
  { name: 'Transportation', monthlyLimit: 300, color: '#D97706' },
  { name: 'Dining', monthlyLimit: 200, color: '#EA580C' },
  { name: 'Subscriptions', monthlyLimit: 100, color: '#7C3AED' },
  { name: 'Healthcare', monthlyLimit: 150, color: '#DC2626' },
  { name: 'Insurance', monthlyLimit: 250, color: '#0891B2' },
  { name: 'Debt Payments', monthlyLimit: 500, color: '#6B7280' },
  { name: 'Savings', monthlyLimit: 300, color: '#059669' },
  { name: 'Personal', monthlyLimit: 200, color: '#BE185D' },
  { name: 'Other', monthlyLimit: 100, color: '#78716C' },
];

export const DEBT_TYPES: Record<Debt['type'], string> = {
  credit_card: 'Credit Card',
  student_loan: 'Student Loan',
  auto_loan: 'Auto Loan',
  mortgage: 'Mortgage',
  personal_loan: 'Personal Loan',
  medical: 'Medical Debt',
  other: 'Other',
};
