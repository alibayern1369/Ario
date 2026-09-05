import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Payload = {
  userId: string;
  title: string;
  body: string;
  conversationId?: string;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.includes(secret)) return new Response('Unauthorized', { status: 401 });

  const payload = (await req.json()) as Payload;
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', secret);
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', payload.userId);

  // Subscriptions are delivered by the web app using VAPID from the Next.js
  // /api/push/dispatch route when Edge crypto web-push is unavailable.
  await supabase.from('notifications').insert({
    user_id: payload.userId,
    type: 'message',
    title: payload.title,
    body: payload.body,
    conversation_id: payload.conversationId ?? null,
  });

  return new Response(JSON.stringify({ ok: true, targets: subs?.length ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
