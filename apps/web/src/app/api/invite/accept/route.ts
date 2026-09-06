import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { USERNAME_RE } from '@ario/shared';

const bodySchema = z.object({
  token: z.string().min(8),
  email: z.string().email(),
  password: z.string().min(4),
  username: z.string().regex(USERNAME_RE),
  displayName: z.string().min(1).max(80),
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
  if (invite.email && invite.email.toLowerCase() !== parsed.data.email.trim().toLowerCase()) {
    return NextResponse.json({ error: 'email_mismatch' }, { status: 400 });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email.trim(),
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      username: parsed.data.username.toLowerCase(),
      display_name: parsed.data.displayName,
    },
  });
  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? 'create_failed' },
      { status: 400 },
    );
  }

  const { error: markError } = await admin
    .from('invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)
    .is('used_at', null);

  if (markError) {
    // Best-effort rollback so a burned invite cannot strand the token unused while user exists.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: 'invite_race' }, { status: 409 });
  }

  await admin.from('admin_audit_log').insert({
    actor_id: invite.created_by,
    action: 'invite_accepted',
    target: created.user.id,
    metadata: { invite_id: invite.id },
  });

  return NextResponse.json({ ok: true });
}
