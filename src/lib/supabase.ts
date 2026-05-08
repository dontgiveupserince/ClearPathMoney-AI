import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const supabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey &&
  supabaseUrl !== 'undefined' && supabaseAnonKey !== 'undefined' &&
  supabaseUrl.startsWith('https://')
);
