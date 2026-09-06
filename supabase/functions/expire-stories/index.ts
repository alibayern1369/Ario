import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function authorized(req: Request): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const auth = req.headers.get('Authorization') ?? '';
  const headerSecret = req.headers.get('x-cron-secret') ?? '';
  if (cronSecret && (headerSecret === cronSecret || auth === `Bearer ${cronSecret}`)) {
    return true;
  }
  // Fallback: Supabase Dashboard invoke with service role bearer.
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
    const { data: expired, error: listError } = await supabase
      .from('stories')
      .select('id,bucket,path,thumbnail_path')
      .lt('expires_at', new Date().toISOString());
    if (listError) throw listError;

    for (const story of expired ?? []) {
      const paths = [story.path, story.thumbnail_path].filter(Boolean) as string[];
      if (paths.length && story.bucket) {
        await supabase.storage.from(story.bucket).remove(paths);
      }
    }

    const { error } = await supabase.from('stories').delete().lt('expires_at', new Date().toISOString());
    if (error) throw error;

    const detail = { removed: expired?.length ?? 0 };
    await supabase.from('cron_heartbeats').upsert({
      job_name: 'expire-stories',
      last_run_at: new Date().toISOString(),
      last_status: 'ok',
      last_detail: detail,
      updated_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true, ...detail }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from('cron_heartbeats').upsert({
      job_name: 'expire-stories',
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
