import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * If the system has no owner yet, promote the current signed-in user.
 * Lets the first account unlock /admin without manual SQL.
 */
export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

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
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from('admin_audit_log').insert({
    actor_id: user.id,
    action: 'bootstrap_owner',
    target: user.id,
  });

  return NextResponse.json({ ok: true, role: 'owner' });
}
