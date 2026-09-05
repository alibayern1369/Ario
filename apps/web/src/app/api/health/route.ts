import { NextResponse } from 'next/server';
import { hasR2Config, hasSupabaseConfig, publicEnv } from '@/lib/env';

export async function GET() {
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
  return NextResponse.json({
    ok: true,
    app: 'ario-web',
    supabase,
    storage: hasR2Config() ? 'r2' : 'supabase',
    time: new Date().toISOString(),
  });
}
