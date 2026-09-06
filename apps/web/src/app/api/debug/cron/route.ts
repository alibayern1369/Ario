import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { serverSecrets } from '@/lib/env';
import { isStaff } from '@/lib/access';

const STALE_MS = {
  'expire-stories': 30 * 60 * 1000,
  'publish-scheduled': 5 * 60 * 1000,
} as const;

/** Staff-only cron heartbeat status. */
export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,status')
    .eq('id', user.id)
    .maybeSingle();
  if (!isStaff(profile?.role) || profile?.status !== 'active') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const cronSecretConfigured = Boolean(serverSecrets().cronSecret);
  let rows: Array<{
    job_name: string;
    last_run_at: string;
    last_status: string;
    last_detail: unknown;
  }> = [];
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('cron_heartbeats').select('*').order('job_name');
    if (error) throw error;
    rows = data ?? [];
  } catch (err) {
    return NextResponse.json({
      ok: false,
      cron_secret: cronSecretConfigured ? 'configured' : 'missing',
      error: err instanceof Error ? err.message : 'cron_heartbeats_unavailable',
      hint: 'Apply migration 00005_cron_heartbeats.sql and schedule jobs.',
    });
  }

  const now = Date.now();
  const jobs = ['expire-stories', 'publish-scheduled'].map((name) => {
    const row = rows.find((r) => r.job_name === name);
    const staleAfter = STALE_MS[name as keyof typeof STALE_MS] ?? 30 * 60 * 1000;
    if (!row) {
      return {
        job_name: name,
        status: 'never_run' as const,
        last_run_at: null,
        last_status: null,
        last_detail: null,
        fresh: false,
      };
    }
    const age = now - new Date(row.last_run_at).getTime();
    return {
      job_name: name,
      status: row.last_status === 'ok' && age <= staleAfter ? ('ok' as const) : ('stale_or_error' as const),
      last_run_at: row.last_run_at,
      last_status: row.last_status,
      last_detail: row.last_detail,
      age_ms: age,
      fresh: row.last_status === 'ok' && age <= staleAfter,
    };
  });

  return NextResponse.json({
    ok: jobs.every((j) => j.fresh),
    cron_secret: cronSecretConfigured ? 'configured' : 'missing',
    jobs,
    endpoints: {
      next: ['/api/cron/expire-stories', '/api/cron/publish-scheduled'],
      edge: ['expire-stories', 'publish-scheduled'],
    },
    note: 'Invoke with header x-cron-secret: $CRON_SECRET (or Authorization: Bearer $CRON_SECRET).',
  });
}
