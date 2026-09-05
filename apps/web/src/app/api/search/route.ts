import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ users: [], messages: [] });

  const [{ data: users }, { data: messages }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,username,display_name,avatar_path')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(12),
    supabase.from('messages').select('id,conversation_id,content,created_at').ilike('content', `%${q}%`).limit(20),
  ]);

  return NextResponse.json({ users: users ?? [], messages: messages ?? [] });
}
