import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { serverSecrets, publicEnv } from '@/lib/env';
import { z } from 'zod';

const schema = z.object({
  userId: z.string().uuid(),
  title: z.string(),
  body: z.string(),
});

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const secrets = serverSecrets();
  const pub = publicEnv().vapidPublicKey;
  if (!secrets.vapidPrivate || !pub) {
    return NextResponse.json({ ok: false, reason: 'vapid_missing' });
  }
  webpush.setVapidDetails(secrets.vapidSubject, pub, secrets.vapidPrivate);
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint,p256dh,auth')
    .eq('user_id', parsed.data.userId);
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: parsed.data.title, body: parsed.data.body }),
      );
    } catch {
      /* expired subscription */
    }
  }
  return NextResponse.json({ ok: true, targets: subs?.length ?? 0 });
}
