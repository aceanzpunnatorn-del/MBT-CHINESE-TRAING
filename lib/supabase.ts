import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export function throwIfSupabaseError(
  error: { message: string } | null,
  action: string
): asserts error is null {
  if (error) {
    throw new Error(`${action}: ${error.message}`);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
