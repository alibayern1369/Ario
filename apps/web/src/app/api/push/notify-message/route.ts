import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { notifyConversationMembers } from '@/lib/notify';

const schema = z.object({
  conversationId: z.string().uuid(),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
});

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const { data: member } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', parsed.data.conversationId)
    .eq('user_id', user.id)
    .eq('banned', false)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  try {
    const results = await notifyConversationMembers({
      conversationId: parsed.data.conversationId,
      senderId: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
    });
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'notify_failed' },
      { status: 500 },
    );
  }
}
