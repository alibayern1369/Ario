import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { serverSecrets, publicEnv } from '@/lib/env';
import { z } from 'zod';

const schema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  conversationId: z.string().uuid().optional(),
  /** Internal callers (DB webhook / service) use server secret; clients cannot forge this. */
  dispatchSecret: z.string().optional(),
});

async function callerMayNotify(
  actorId: string,
  targetUserId: string,
  conversationId: string | undefined,
): Promise<boolean> {
  if (actorId === targetUserId) return false;
  const admin = createAdminClient();

  const { data: actor } = await admin.from('profiles').select('role,status').eq('id', actorId).maybeSingle();
  if (!actor || actor.status !== 'active') return false;
  if (actor.role === 'admin' || actor.role === 'owner') return true;

  if (!conversationId) return false;

  const { data: members } = await admin
    .from('conversation_members')
    .select('user_id,banned')
    .eq('conversation_id', conversationId)
    .in('user_id', [actorId, targetUserId]);

  const actorMem = members?.find((m) => m.user_id === actorId);
  const targetMem = members?.find((m) => m.user_id === targetUserId);
  if (!actorMem || actorMem.banned || !targetMem || targetMem.banned) return false;

  const { data: blocked } = await admin.rpc('is_blocked_either', {
    a: actorId,
    b: targetUserId,
  });
  return !blocked;
}

export async function POST(req: Request) {
  const secrets = serverSecrets();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const internalOk =
    Boolean(secrets.pushDispatchSecret) &&
    parsed.data.dispatchSecret === secrets.pushDispatchSecret;

  if (!internalOk) {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const allowed = await callerMayNotify(user.id, parsed.data.userId, parsed.data.conversationId);
    if (!allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const pub = publicEnv().vapidPublicKey;
  if (!secrets.vapidPrivate || !pub) {
    return NextResponse.json({ ok: false, reason: 'vapid_missing' });
  }
  webpush.setVapidDetails(secrets.vapidSubject, pub, secrets.vapidPrivate);
  const admin = createAdminClient();

  // Respect mute on conversation membership when conversationId provided.
  if (parsed.data.conversationId) {
    const { data: mem } = await admin
      .from('conversation_members')
      .select('muted_until')
      .eq('conversation_id', parsed.data.conversationId)
      .eq('user_id', parsed.data.userId)
      .maybeSingle();
    if (mem?.muted_until && new Date(mem.muted_until) > new Date()) {
      return NextResponse.json({ ok: true, targets: 0, muted: true });
    }
  }

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
