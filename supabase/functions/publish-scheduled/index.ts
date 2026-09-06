import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function authorized(req: Request): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const auth = req.headers.get('Authorization') ?? '';
  const headerSecret = req.headers.get('x-cron-secret') ?? '';
  if (cronSecret && (headerSecret === cronSecret || auth === `Bearer ${cronSecret}`)) {
    return true;
  }
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!authorized(req)) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('messages')
      .update({ published_at: now, scheduled_at: null })
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now)
      .select('id');
    if (error) throw error;

    const detail = { published: data?.length ?? 0 };
    await supabase.from('cron_heartbeats').upsert({
      job_name: 'publish-scheduled',
      last_run_at: now,
      last_status: 'ok',
      last_detail: detail,
      updated_at: now,
    });

    return new Response(JSON.stringify({ ok: true, ...detail }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from('cron_heartbeats').upsert({
      job_name: 'publish-scheduled',
      last_run_at: new Date().toISOString(),
      last_status: 'error',
      last_detail: { error: message },
      updated_at: new Date().toISOString(),
    });
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
