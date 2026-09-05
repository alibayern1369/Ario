'use client';

import { createBrowserClient } from '@supabase/ssr';
import { hasSupabaseConfig, publicEnv, supabaseConfigError } from '@/lib/env';

export function createClient() {
  if (!hasSupabaseConfig()) {
    throw new Error(supabaseConfigError() ?? 'پیکربندی سوپابیس ناقص است.');
  }
  const { supabaseUrl, supabaseAnonKey } = publicEnv();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
