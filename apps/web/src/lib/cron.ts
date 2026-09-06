import { createAdminClient } from '@/lib/supabase/admin';
import { serverSecrets } from '@/lib/env';

export type CronJobName = 'expire-stories' | 'publish-scheduled';

export function assertCronAuthorized(req: Request): boolean {
  const secret = serverSecrets().cronSecret;
  if (!secret) return false;
  const header = req.headers.get('x-cron-secret') ?? '';
  const auth = req.headers.get('authorization') ?? '';
  return header === secret || auth === `Bearer ${secret}`;
}

export async function writeCronHeartbeat(
  job: CronJobName,
  status: 'ok' | 'error',
  detail: Record<string, unknown>,
) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin.from('cron_heartbeats').upsert({
    job_name: job,
    last_run_at: now,
    last_status: status,
    last_detail: detail,
    updated_at: now,
  });
}

export async function expireStoriesJob() {
  const admin = createAdminClient();
  const { data: expired, error: listError } = await admin
    .from('stories')
    .select('id,bucket,path,thumbnail_path')
    .lt('expires_at', new Date().toISOString());
  if (listError) throw listError;

  for (const story of expired ?? []) {
    const paths = [story.path, story.thumbnail_path].filter(Boolean) as string[];
    if (paths.length && story.bucket) {
      await admin.storage.from(story.bucket).remove(paths);
    }
  }

  const { error } = await admin.from('stories').delete().lt('expires_at', new Date().toISOString());
  if (error) throw error;
  return { removed: expired?.length ?? 0 };
}

export async function publishScheduledJob() {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('messages')
    .update({ published_at: now, scheduled_at: null })
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', now)
    .select('id');
  if (error) throw error;
  return { published: data?.length ?? 0 };
}
