import { supabase, supabaseConfigured } from './supabase';
import { Transaction } from '../types/finance';

interface TransactionRow {
  id: string;
  user_id: string;
  amount: number | string;
  txn_date: string;
  category_id: string | null;
  merchant: string;
  note: string | null;
  txn_type: Transaction['type'];
  created_at: string;
  updated_at: string;
}

function rowToTransaction(r: TransactionRow): Transaction {
  return {
    id: r.id,
    amount: Number(r.amount),
    date: r.txn_date,
    categoryId: r.category_id ?? '',
    merchant: r.merchant,
    note: r.note ?? undefined,
    type: r.txn_type,
  };
}

function transactionToRow(userId: string, t: Omit<Transaction, 'id'>) {
  return {
    user_id: userId,
    amount: t.amount,
    txn_date: t.date,
    category_id: t.categoryId && t.categoryId.length > 0 ? t.categoryId : null,
    merchant: t.merchant,
    note: t.note && t.note.trim() ? t.note.trim() : null,
    txn_type: t.type,
  };
}

export async function fetchTransactions(userId: string): Promise<Transaction[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('txn_date', { ascending: false });
  if (error || !data) return [];
  return (data as TransactionRow[]).map(rowToTransaction);
}

export async function createTransaction(
  userId: string,
  t: Omit<Transaction, 'id'>
): Promise<{ transaction: Transaction | null; error: string | null }> {
  if (!supabaseConfigured) return { transaction: null, error: 'Supabase not configured.' };
  const { data, error } = await supabase
    .from('transactions')
    .insert(transactionToRow(userId, t))
    .select()
    .single();
  if (error || !data) return { transaction: null, error: error?.message ?? 'Failed to create transaction.' };
  return { transaction: rowToTransaction(data as TransactionRow), error: null };
}

export async function updateTransaction(
  userId: string,
  id: string,
  t: Omit<Transaction, 'id'>
): Promise<{ transaction: Transaction | null; error: string | null }> {
  if (!supabaseConfigured) return { transaction: null, error: 'Supabase not configured.' };
  const { data, error } = await supabase
    .from('transactions')
    .update({ ...transactionToRow(userId, t), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error || !data) return { transaction: null, error: error?.message ?? 'Failed to update transaction.' };
  return { transaction: rowToTransaction(data as TransactionRow), error: null };
}

export async function deleteTransaction(
  userId: string,
  id: string
): Promise<{ error: string | null }> {
  if (!supabaseConfigured) return { error: 'Supabase not configured.' };
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}

export async function bulkCreateTransactions(
  userId: string,
  rows: Omit<Transaction, 'id'>[]
): Promise<{ transactions: Transaction[]; error: string | null }> {
  if (!supabaseConfigured) return { transactions: [], error: 'Supabase not configured.' };
  if (rows.length === 0) return { transactions: [], error: null };
  const payload = rows.map((t) => transactionToRow(userId, t));
  const { data, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select();
  if (error || !data) return { transactions: [], error: error?.message ?? 'Failed to import transactions.' };
  return { transactions: (data as TransactionRow[]).map(rowToTransaction), error: null };
}

export async function deleteAllTransactions(userId: string): Promise<{ error: string | null }> {
  if (!supabaseConfigured) return { error: 'Supabase not configured.' };
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}
