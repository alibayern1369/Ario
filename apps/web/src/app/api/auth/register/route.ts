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
      : 'invite';
  if (mode !== 'open') {
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
    },
  });

  if (created.error || !created.data.user) {
    const msg = created.error?.message ?? 'create_failed';
    if (/already|registered|exists/i.test(msg)) {
      return NextResponse.json({ error: 'username_taken' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    email,
    username,
  });
}
