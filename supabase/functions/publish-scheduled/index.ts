import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('messages')
    .update({ published_at: now, scheduled_at: null })
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', now);
  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
