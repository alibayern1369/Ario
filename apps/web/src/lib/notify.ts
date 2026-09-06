import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import { serverSecrets, publicEnv } from '@/lib/env';

/** Fan-out Web Push to conversation members (mute/block aware). */
export async function notifyConversationMembers(input: {
  conversationId: string;
  senderId: string;
  title: string;
  body: string;
}) {
  const admin = createAdminClient();
  const secrets = serverSecrets();
  const pub = publicEnv().vapidPublicKey;
  if (!secrets.vapidPrivate || !pub) {
    return { ok: false as const, reason: 'vapid_missing' };
  }
  webpush.setVapidDetails(secrets.vapidSubject, pub, secrets.vapidPrivate);

  const { data: members } = await admin
    .from('conversation_members')
    .select('user_id,muted_until,banned')
    .eq('conversation_id', input.conversationId);

  const targets = (members ?? []).filter(
    (m) =>
      m.user_id !== input.senderId &&
      !m.banned &&
      !(m.muted_until && new Date(m.muted_until) > new Date()),
  );

  let sent = 0;
  for (const t of targets) {
    const { data: blocked } = await admin.rpc('is_blocked_either', {
      a: input.senderId,
      b: t.user_id,
    });
    if (blocked) continue;

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint,p256dh,auth')
      .eq('user_id', t.user_id);
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: input.title, body: input.body, conversationId: input.conversationId }),
        );
        sent += 1;
      } catch {
        /* expired */
      }
    }
  }
  return { ok: true as const, sent };
}
