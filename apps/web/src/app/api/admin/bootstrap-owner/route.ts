import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { serverSecrets } from '@/lib/env';

/**
 * If the system has no owner yet, promote the current signed-in user.
 * Prefers SECURITY DEFINER RPC so it works even when service-role grants are missing.
 */
export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Primary path: RPC as the signed-in user (definer bypasses table grants/RLS).
  const rpc = await supabase.rpc('claim_bootstrap_owner');
  if (!rpc.error && rpc.data) {
    const payload = rpc.data as { ok?: boolean; role?: string; already?: boolean };
    return NextResponse.json({
      ok: true,
      role: payload.role ?? 'owner',
      already: Boolean(payload.already),
    });
  }

  const rpcMsg = rpc.error?.message ?? '';
  if (/owner_exists/i.test(rpcMsg)) {
    return NextResponse.json({ error: 'owner_exists' }, { status: 403 });
  }
  // Migration not applied yet — fall back to service role when available.
  if (!/function .*claim_bootstrap_owner|could not find|schema cache/i.test(rpcMsg)) {
    if (/not authenticated|profile missing/i.test(rpcMsg)) {
      return NextResponse.json({ error: rpcMsg }, { status: 400 });
    }
  }

  if (!serverSecrets().serviceRole) {
    return NextResponse.json(
      {
        error:
          rpcMsg ||
          'فعال‌سازی ممکن نشد. مایگریشن claim_bootstrap_owner را روی Supabase اجرا کنید.',
      },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    const { count: ownerCount } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'owner');

    if ((ownerCount ?? 0) > 0) {
      const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (me?.role === 'owner' || me?.role === 'admin') {
        return NextResponse.json({ ok: true, role: me.role, already: true });
      }
      return NextResponse.json({ error: 'owner_exists' }, { status: 403 });
    }

    const { error } = await admin.from('profiles').update({ role: 'owner' }).eq('id', user.id);
    if (error) {
      return NextResponse.json(
        {
          error:
            error.message.includes('permission denied')
              ? 'دسترسی به پروفایل نیست. مایگریشن 00008 را در Supabase اجرا کنید، بعد دوباره تلاش کنید.'
              : error.message,
        },
        { status: 400 },
      );
    }

    await admin.from('admin_audit_log').insert({
      actor_id: user.id,
      action: 'bootstrap_owner',
      target: user.id,
    });

    return NextResponse.json({ ok: true, role: 'owner' });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'فعال‌سازی ممکن نشد. مایگریشن Supabase را بررسی کنید.',
      },
      { status: 400 },
    );
  }
}
