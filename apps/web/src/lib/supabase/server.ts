import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { hasSupabaseConfig, publicEnv } from '@/lib/env';

export async function createServerSupabase() {
  if (!hasSupabaseConfig()) {
    throw new Error('Supabase is not configured');
  }
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = publicEnv();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* Server Component — middleware will refresh */
        }
      },
    },
  });
}
