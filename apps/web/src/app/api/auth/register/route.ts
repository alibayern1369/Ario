import { NextResponse } from 'next/server';
import {
  MAX_USERS,
  authEmailFromUsername,
  displayNameFromParts,
  registerSchema,
} from '@ario/shared';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const parsed = registerSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'invalid' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: setting } = await admin
    .from('system_settings')
    .select('value')
    .eq('key', 'registration_policy')
    .maybeSingle();
  const mode =
    setting && typeof setting.value === 'object' && setting.value && 'mode' in setting.value
      ? String((setting.value as { mode?: string }).mode)
      : 'open';
  // Only an explicit "closed" setting blocks self-registration.
  if (mode === 'closed') {
    return NextResponse.json({ error: 'registration_closed' }, { status: 403 });
  }

  const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true });
  if ((count ?? 0) >= MAX_USERS) {
    return NextResponse.json({ error: 'max_users' }, { status: 400 });
  }

  const username = parsed.data.username.toLowerCase();
  const { data: taken } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (taken) {
    return NextResponse.json({ error: 'username_taken' }, { status: 409 });
  }

  const { count: ownerCount } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'owner');
  const makeOwner = (ownerCount ?? 0) === 0;

  const displayName = displayNameFromParts(parsed.data.firstName, parsed.data.lastName);
  const email = authEmailFromUsername(username);

  const created = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      username,
      display_name: displayName,
      first_name: parsed.data.firstName.trim(),
      last_name: parsed.data.lastName.trim(),
      ...(makeOwner ? { app_role: 'owner' } : {}),
    },
  });

  if (created.error || !created.data.user) {
    const msg = created.error?.message ?? 'create_failed';
    if (/already|registered|exists/i.test(msg)) {
      return NextResponse.json({ error: 'username_taken' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Belt-and-suspenders: ensure first account is owner even if trigger skipped metadata.
  if (makeOwner && created.data.user) {
    await admin.from('profiles').update({ role: 'owner' }).eq('id', created.data.user.id);
  }

  return NextResponse.json({
    ok: true,
    email,
    username,
    role: makeOwner ? 'owner' : 'member',
  });
}
