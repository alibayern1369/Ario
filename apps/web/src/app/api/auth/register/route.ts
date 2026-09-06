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

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: 'پیکربندی سرور ناقص است (SERVICE_ROLE).' },
      { status: 500 },
    );
  }

  const { data: setting } = await admin
    .from('system_settings')
    .select('value')
    .eq('key', 'registration_policy')
    .maybeSingle();
  const mode =
    setting && typeof setting.value === 'object' && setting.value && 'mode' in setting.value
      ? String((setting.value as { mode?: string }).mode)
      : 'open';
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
    if (/password|weak|short/i.test(msg)) {
      return NextResponse.json({ error: 'رمز عبور قابل قبول نیست. حداقل ۴ کاراکتر وارد کنید.' }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const userId = created.data.user.id;
  const role = makeOwner ? 'owner' : 'member';

  // Always ensure profile exists (trigger may be missing on hosted DB).
  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      username,
      display_name: displayName,
      role,
      status: 'active',
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    // Username collision on upsert — try unique suffix then fail cleanly.
    const fallbackUser = `${username}_${userId.replace(/-/g, '').slice(0, 6)}`;
    const retry = await admin.from('profiles').upsert(
      {
        id: userId,
        username: fallbackUser,
        display_name: displayName,
        role,
        status: 'active',
      },
      { onConflict: 'id' },
    );
    if (retry.error) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'ساخت پروفایل ناموفق بود. دوباره تلاش کنید.' },
        { status: 500 },
      );
    }
  }

  await admin.from('privacy_settings').upsert({ user_id: userId }, { onConflict: 'user_id' });

  return NextResponse.json({
    ok: true,
    email,
    username,
    role,
  });
}
