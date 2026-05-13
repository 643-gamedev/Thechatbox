import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const looksLikePlaceholder = (value) => {
  if (!value) return true;
  return (
    value.includes('YOUR_PROJECT') ||
    value.includes('YOUR_SUPABASE') ||
    value.includes('YOUR_')
  );
};

export const isSupabaseConfigured =
  Boolean(rawUrl && rawAnonKey) &&
  !looksLikePlaceholder(rawUrl) &&
  !looksLikePlaceholder(rawAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(rawUrl, rawAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const storageBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'uploads';

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.',
    );
  }
  return supabase;
}
