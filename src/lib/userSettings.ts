import { supabase, supabaseConfigured } from './supabase';
import { AppSettings } from '../types/finance';

interface UserSettingsRow {
  user_id: string;
  currency: string;
  payoff_method: AppSettings['payoffMethod'];
  extra_debt_payment: number | string;
  ai_privacy_acknowledged: boolean;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  monthlyIncome: 0,
  currency: 'USD',
  payoffMethod: 'avalanche',
  extraDebtPayment: 0,
  aiPrivacyAcknowledged: false,
};

function rowToSettings(r: UserSettingsRow): AppSettings {
  return {
    monthlyIncome: 0,
    currency: r.currency,
    payoffMethod: r.payoff_method,
    extraDebtPayment: Number(r.extra_debt_payment),
    aiPrivacyAcknowledged: r.ai_privacy_acknowledged,
  };
}

function settingsToRow(userId: string, s: AppSettings) {
  return {
    user_id: userId,
    currency: s.currency,
    payoff_method: s.payoffMethod,
    extra_debt_payment: s.extraDebtPayment,
    ai_privacy_acknowledged: s.aiPrivacyAcknowledged,
  };
}

export async function fetchUserSettings(userId: string): Promise<AppSettings | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToSettings(data as UserSettingsRow);
}

export async function upsertUserSettings(
  userId: string,
  s: AppSettings
): Promise<{ settings: AppSettings | null; error: string | null }> {
  if (!supabaseConfigured) return { settings: null, error: 'Supabase not configured.' };
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ ...settingsToRow(userId, s), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error || !data) return { settings: null, error: error?.message ?? 'Failed to save settings.' };
  return { settings: rowToSettings(data as UserSettingsRow), error: null };
}

export async function deleteUserSettings(userId: string): Promise<{ error: string | null }> {
  if (!supabaseConfigured) return { error: 'Supabase not configured.' };
  const { error } = await supabase
    .from('user_settings')
    .delete()
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}
