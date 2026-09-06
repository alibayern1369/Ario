import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/** Escape PostgREST filter metacharacters for safe ilike patterns. */
function sanitizeIlike(raw: string) {
  return raw.replace(/[%_,.()\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 64);
}

export async function GET(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const q = sanitizeIlike(new URL(req.url).searchParams.get('q') ?? '');
  if (q.length < 2) return NextResponse.json({ users: [], messages: [], channels: [] });

  const [{ data: users }, { data: messages }, { data: channels }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,username,display_name,avatar_path')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(12),
    supabase
      .from('messages')
      .select('id,conversation_id,content,created_at')
      .ilike('content', `%${q}%`)
      .limit(20),
    supabase
      .from('conversations')
      .select('id,title,type,is_public')
      .eq('type', 'channel')
      .eq('is_public', true)
      .ilike('title', `%${q}%`)
      .limit(12),
  ]);

  return NextResponse.json({
    users: users ?? [],
    messages: messages ?? [],
    channels: channels ?? [],
  });
}
