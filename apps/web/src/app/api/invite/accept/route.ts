import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const bodySchema = z.object({
  token: z.string().min(8),
  email: z.string().email(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from('invites')
    .select('*')
    .eq('token', parsed.data.token)
    .is('used_at', null)
    .maybeSingle();
  if (!invite) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 400 });
  }
  await admin
    .from('invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id);
  return NextResponse.json({ ok: true });
}
