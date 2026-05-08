import { supabase, supabaseConfigured } from './supabase';
import { Debt } from '../types/finance';

interface DebtRow {
  id: string;
  user_id: string;
  name: string;
  debt_type: Debt['type'];
  balance: number | string;
  apr: number | string;
  minimum_payment: number | string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

function rowToDebt(r: DebtRow): Debt {
  return {
    id: r.id,
    name: r.name,
    type: r.debt_type,
    balance: Number(r.balance),
    apr: Number(r.apr),
    minimumPayment: Number(r.minimum_payment),
    dueDate: r.due_date ?? undefined,
  };
}

function debtToRow(userId: string, d: Omit<Debt, 'id'>) {
  return {
    user_id: userId,
    name: d.name,
    debt_type: d.type,
    balance: d.balance,
    apr: d.apr,
    minimum_payment: d.minimumPayment,
    due_date: d.dueDate ?? null,
  };
}

export async function fetchDebts(userId: string): Promise<Debt[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as DebtRow[]).map(rowToDebt);
}

export async function createDebt(
  userId: string,
  d: Omit<Debt, 'id'>
): Promise<{ debt: Debt | null; error: string | null }> {
  if (!supabaseConfigured) return { debt: null, error: 'Supabase not configured.' };
  const { data, error } = await supabase
    .from('debts')
    .insert(debtToRow(userId, d))
    .select()
    .single();
  if (error || !data) return { debt: null, error: error?.message ?? 'Failed to create debt.' };
  return { debt: rowToDebt(data as DebtRow), error: null };
}

export async function updateDebt(
  userId: string,
  id: string,
  d: Omit<Debt, 'id'>
): Promise<{ debt: Debt | null; error: string | null }> {
  if (!supabaseConfigured) return { debt: null, error: 'Supabase not configured.' };
  const { data, error } = await supabase
    .from('debts')
    .update({ ...debtToRow(userId, d), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error || !data) return { debt: null, error: error?.message ?? 'Failed to update debt.' };
  return { debt: rowToDebt(data as DebtRow), error: null };
}

export async function deleteDebt(
  userId: string,
  id: string
): Promise<{ error: string | null }> {
  if (!supabaseConfigured) return { error: 'Supabase not configured.' };
  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}

export async function deleteAllDebts(userId: string): Promise<{ error: string | null }> {
  if (!supabaseConfigured) return { error: 'Supabase not configured.' };
  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}
