import { supabase, supabaseConfigured } from './supabase';
import { Income, IncomeFrequency, IncomeType } from '../types/finance';

interface IncomeRow {
  id: string;
  user_id: string;
  source_name: string;
  income_type: IncomeType;
  net_amount: number | string;
  frequency: IncomeFrequency;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToIncome(r: IncomeRow): Income {
  return {
    id: r.id,
    sourceName: r.source_name,
    type: r.income_type,
    netAmount: Number(r.net_amount),
    frequency: r.frequency,
    notes: r.notes ?? undefined,
  };
}

function incomeToRow(userId: string, income: Omit<Income, 'id'>) {
  return {
    user_id: userId,
    source_name: income.sourceName,
    income_type: income.type,
    net_amount: income.netAmount,
    frequency: income.frequency,
    notes: income.notes && income.notes.trim() ? income.notes.trim() : null,
  };
}

export async function fetchIncomes(userId: string): Promise<Income[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as IncomeRow[]).map(rowToIncome);
}

export async function createIncome(
  userId: string,
  income: Omit<Income, 'id'>
): Promise<{ income: Income | null; error: string | null }> {
  if (!supabaseConfigured) return { income: null, error: 'Supabase not configured.' };
  const { data, error } = await supabase
    .from('incomes')
    .insert(incomeToRow(userId, income))
    .select()
    .single();
  if (error || !data) return { income: null, error: error?.message ?? 'Failed to create income.' };
  return { income: rowToIncome(data as IncomeRow), error: null };
}

export async function updateIncome(
  userId: string,
  id: string,
  income: Omit<Income, 'id'>
): Promise<{ income: Income | null; error: string | null }> {
  if (!supabaseConfigured) return { income: null, error: 'Supabase not configured.' };
  const { data, error } = await supabase
    .from('incomes')
    .update({ ...incomeToRow(userId, income), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error || !data) return { income: null, error: error?.message ?? 'Failed to update income.' };
  return { income: rowToIncome(data as IncomeRow), error: null };
}

export async function deleteIncome(
  userId: string,
  id: string
): Promise<{ error: string | null }> {
  if (!supabaseConfigured) return { error: 'Supabase not configured.' };
  const { error } = await supabase
    .from('incomes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}

const MONTHLY_FACTORS: Record<IncomeFrequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  monthly: 1,
  yearly: 1 / 12,
};

export function monthlyAmount(amount: number, frequency: IncomeFrequency): number {
  return amount * MONTHLY_FACTORS[frequency];
}

export function totalMonthlyNet(incomes: Income[]): number {
  return incomes.reduce((s, i) => s + monthlyAmount(i.netAmount, i.frequency), 0);
}
