import { supabase, supabaseConfigured } from './supabase';
import { Category } from '../types/finance';

interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  monthly_limit: number | string;
  color: string;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

function rowToCategory(r: CategoryRow): Category {
  return {
    id: r.id,
    name: r.name,
    monthlyLimit: Number(r.monthly_limit),
    color: r.color,
    icon: r.icon ?? undefined,
  };
}

function categoryToRow(userId: string, c: Omit<Category, 'id'>) {
  return {
    user_id: userId,
    name: c.name,
    monthly_limit: c.monthlyLimit,
    color: c.color,
    icon: c.icon ?? null,
  };
}

export async function fetchCategories(userId: string): Promise<Category[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as CategoryRow[]).map(rowToCategory);
}

export async function createCategory(
  userId: string,
  c: Omit<Category, 'id'>
): Promise<{ category: Category | null; error: string | null }> {
  if (!supabaseConfigured) return { category: null, error: 'Supabase not configured.' };
  const { data, error } = await supabase
    .from('categories')
    .insert(categoryToRow(userId, c))
    .select()
    .single();
  if (error || !data) return { category: null, error: error?.message ?? 'Failed to create category.' };
  return { category: rowToCategory(data as CategoryRow), error: null };
}

export async function updateCategory(
  userId: string,
  id: string,
  c: Omit<Category, 'id'>
): Promise<{ category: Category | null; error: string | null }> {
  if (!supabaseConfigured) return { category: null, error: 'Supabase not configured.' };
  const { data, error } = await supabase
    .from('categories')
    .update({ ...categoryToRow(userId, c), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error || !data) return { category: null, error: error?.message ?? 'Failed to update category.' };
  return { category: rowToCategory(data as CategoryRow), error: null };
}

export async function deleteCategory(
  userId: string,
  id: string
): Promise<{ error: string | null }> {
  if (!supabaseConfigured) return { error: 'Supabase not configured.' };
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}

export async function deleteAllCategories(userId: string): Promise<{ error: string | null }> {
  if (!supabaseConfigured) return { error: 'Supabase not configured.' };
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}
