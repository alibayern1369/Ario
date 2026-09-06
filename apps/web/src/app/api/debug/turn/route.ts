import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { publicEnv, serverSecrets } from '@/lib/env';

/** Authenticated TURN debug — never returns credentials. */
export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const secrets = serverSecrets();
  const stun = publicEnv().stunUrls;
  const configured = Boolean(
    secrets.turnUrls.length && secrets.turnUsername && secrets.turnCredential,
  );

  const hosts = secrets.turnUrls.map((u) => {
    try {
      return new URL(u.replace(/^turns?:/i, 'https://')).host;
    } catch {
      return u;
    }
  });

  return NextResponse.json({
    ok: true,
    turn_configured: configured,
    stun_urls: stun,
    turn_hosts: hosts,
    turn_url_count: secrets.turnUrls.length,
    ice_endpoint: '/api/turn',
    ice_verified: false,
    note:
      'Config check only. Call GET /api/turn from the signed-in browser, then complete a two-user call. Mark PASS only when media connects (relay candidate if needed).',
  });
}
