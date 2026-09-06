import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { publicEnv, serverSecrets } from '@/lib/env';

/** Subscription + optional self delivery test for the signed-in user. */
export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const secrets = serverSecrets();
  const pub = publicEnv().vapidPublicKey;
  const vapidConfigured = Boolean(pub && secrets.vapidPrivate);

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint,created_at')
    .eq('user_id', user.id);

  return NextResponse.json({
    ok: true,
    vapid_configured: vapidConfigured,
    subscription_count: subs?.length ?? 0,
    subscriptions: (subs ?? []).map((s) => ({
      endpoint_host: safeHost(s.endpoint),
      created_at: s.created_at,
    })),
    delivery_verified: false,
    error: error?.message,
    note: 'POST this route to send a test notification to your own subscriptions.',
    ios_note:
      'iOS requires Add to Home Screen + supported iOS version. Do not mark PASS until a real device receives the push.',
  });
}

export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const secrets = serverSecrets();
  const pub = publicEnv().vapidPublicKey;
  if (!pub || !secrets.vapidPrivate) {
    return NextResponse.json({ ok: false, reason: 'vapid_missing' }, { status: 400 });
  }

  webpush.setVapidDetails(secrets.vapidSubject, pub, secrets.vapidPrivate);
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint,p256dh,auth')
    .eq('user_id', user.id);

  if (!subs?.length) {
    return NextResponse.json({
      ok: false,
      reason: 'no_subscription',
      hint: 'Enable browser notifications in Settings → Notifications first.',
    });
  }

  let sent = 0;
  const failures: string[] = [];
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({
          title: 'آریو — تست اعلان',
          body: 'اگر این را می‌بینید، تحویل Web Push برای این دستگاه کار می‌کند.',
        }),
      );
      sent += 1;
    } catch (err) {
      failures.push(err instanceof Error ? err.message : 'send_failed');
    }
  }

  return NextResponse.json({
    ok: sent > 0,
    sent,
    targets: subs.length,
    failures,
    delivery_verified: sent > 0,
    note: 'Mark production push PASS only after this returns sent≥1 and you see the notification.',
  });
}

function safeHost(endpoint: string) {
  try {
    return new URL(endpoint).host;
  } catch {
    return 'invalid';
  }
}
