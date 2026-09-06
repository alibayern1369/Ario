import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isStaff } from '@/lib/access';
import { MAX_USERS, usernameSchema } from '@ario/shared';
import { z } from 'zod';

async function requireStaff() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('role,status').eq('id', user.id).maybeSingle();
  if (!isStaff(profile?.role) || profile?.status !== 'active') {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { user, supabase };
}

export async function POST(req: Request) {
  const gate = await requireStaff();
  if ('error' in gate && gate.error) return gate.error;
  const body = z
    .object({
      email: z.string().email(),
      password: z.string().min(4),
      username: usernameSchema,
      displayName: z.string().min(1).max(48),
    })
    .safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const admin = createAdminClient();
  const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true });
  if ((count ?? 0) >= MAX_USERS) {
    return NextResponse.json({ error: 'max_users' }, { status: 400 });
  }
  const created = await admin.auth.admin.createUser({
    email: body.data.email,
    password: body.data.password,
    email_confirm: true,
    user_metadata: { username: body.data.username, display_name: body.data.displayName },
  });
  if (created.error) return NextResponse.json({ error: created.error.message }, { status: 400 });
  await admin.from('admin_audit_log').insert({
    actor_id: gate.user!.id,
    action: 'create_user',
    target: created.data.user.id,
  });
  return NextResponse.json({ id: created.data.user.id });
}

export async function PATCH(req: Request) {
  const gate = await requireStaff();
  if ('error' in gate && gate.error) return gate.error;
  const body = z
    .object({
      id: z.string().uuid(),
      status: z.enum(['active', 'disabled', 'banned']).optional(),
      role: z.enum(['member', 'admin', 'owner']).optional(),
    })
    .safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const admin = createAdminClient();
  await admin
    .from('profiles')
    .update({ status: body.data.status, role: body.data.role })
    .eq('id', body.data.id);
  await admin.from('admin_audit_log').insert({
    actor_id: gate.user!.id,
    action: 'patch_user',
    target: body.data.id,
    metadata: { status: body.data.status, role: body.data.role },
  });
  return NextResponse.json({ ok: true });
}
