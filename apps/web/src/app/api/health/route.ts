import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { hasR2Config, hasSupabaseConfig, publicEnv, serverSecrets } from '@/lib/env';
import { isStaff } from '@/lib/access';

function turnHosts() {
  return serverSecrets().turnUrls.map((u) => {
    try {
      const normalized = u.replace(/^turns?:/i, 'https://');
      return new URL(normalized).host;
    } catch {
      return u;
    }
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const verbose = url.searchParams.get('verbose') === '1';

  const configured = hasSupabaseConfig();
  let supabase = 'skipped';
  if (configured) {
    try {
      const res = await fetch(`${publicEnv().supabaseUrl}/auth/v1/health`, {
        headers: { apikey: publicEnv().supabaseAnonKey },
        cache: 'no-store',
      });
      supabase = res.ok ? 'ok' : `http_${res.status}`;
    } catch {
      supabase = 'unreachable';
    }
  }

  const secrets = serverSecrets();
  const vapidConfigured = Boolean(publicEnv().vapidPublicKey && secrets.vapidPrivate);
  const turnConfigured = Boolean(
    secrets.turnUrls.length && secrets.turnUsername && secrets.turnCredential,
  );
  const cronSecretConfigured = Boolean(secrets.cronSecret);

  const body: Record<string, unknown> = {
    ok: true,
    app: 'ario-web',
    supabase,
    storage: hasR2Config() ? 'r2' : 'supabase',
    turn: turnConfigured ? 'configured' : 'missing',
    vapid: vapidConfigured ? 'configured' : 'missing',
    cron_secret: cronSecretConfigured ? 'configured' : 'missing',
    notes: {
      turn: 'configured ≠ ICE verified. Run two-user call + /api/debug/turn after login.',
      push: 'configured ≠ delivery verified. Use /api/debug/push after enabling notifications.',
      cron: 'Check cron_heartbeats via /api/debug/cron (staff) after scheduling jobs.',
      ios_push: 'Do not claim iOS PWA push until device checklist in ARIO_VERIFICATION.md passes.',
    },
    time: new Date().toISOString(),
  };

  if (verbose) {
    const supabaseAuth = await createServerSupabase();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', hint: 'verbose=1 requires session' }, { status: 401 });
    }
    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('role,status')
      .eq('id', user.id)
      .maybeSingle();
    if (!isStaff(profile?.role) || profile?.status !== 'active') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    let cron: unknown = [];
    try {
      const admin = createAdminClient();
      const { data } = await admin.from('cron_heartbeats').select('*').order('job_name');
      cron = data ?? [];
    } catch {
      cron = { error: 'cron_heartbeats_unavailable' };
    }

    body.verbose = {
      turn_hosts: turnHosts(),
      turn_configured: turnConfigured,
      cron_heartbeats: cron,
      vapid_subject_set: Boolean(secrets.vapidSubject),
      push_dispatch_secret: secrets.pushDispatchSecret ? 'configured' : 'missing',
    };
  }

  return NextResponse.json(body);
}
