import { Transaction, Category } from '../types/finance';

export function getCurrentMonthExpenses(transactions: Transaction[]): Transaction[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return transactions.filter((t) => {
    if (t.type !== 'expense') return false;
    const [y, m] = t.date.split('-').map(Number);
    return y === year && m === month;
  });
}

export function getTotalExpenses(transactions: Transaction[]): number {
  return getCurrentMonthExpenses(transactions).reduce((sum, t) => sum + t.amount, 0);
}

export function getCategorySpending(
  transactions: Transaction[],
  categories: Category[]
): { category: Category; spent: number; remaining: number; percentage: number }[] {
  const monthly = getCurrentMonthExpenses(transactions);
  return categories.map((cat) => {
    const spent = monthly
      .filter((t) => t.categoryId === cat.id)
      .reduce((sum, t) => sum + t.amount, 0);
    const remaining = Math.max(0, cat.monthlyLimit - spent);
    const percentage = cat.monthlyLimit > 0 ? Math.min(100, (spent / cat.monthlyLimit) * 100) : 0;
    return { category: cat, spent, remaining, percentage };
  });
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function getMonthName(monthIndex: number, year: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}
