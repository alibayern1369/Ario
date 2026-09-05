'use client';

import { createBrowserClient } from '@supabase/ssr';
import { hasSupabaseConfig, publicEnv } from '@/lib/env';

export function createClient() {
  if (!hasSupabaseConfig()) {
    throw new Error('پیکربندی سوپابیس ناقص است. فایل محیط را بررسی کنید.');
  }
  const { supabaseUrl, supabaseAnonKey } = publicEnv();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
