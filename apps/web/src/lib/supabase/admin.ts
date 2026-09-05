import { createClient } from '@supabase/supabase-js';
import { publicEnv, serverSecrets } from '@/lib/env';

export function createAdminClient() {
  const { serviceRole } = serverSecrets();
  if (!serviceRole) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  return createClient(publicEnv().supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
