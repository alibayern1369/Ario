import { NextResponse } from 'next/server';
import {
  assertCronAuthorized,
  publishScheduledJob,
  writeCronHeartbeat,
} from '@/lib/cron';

export async function POST(req: Request) {
  if (!assertCronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  try {
    const detail = await publishScheduledJob();
    await writeCronHeartbeat('publish-scheduled', 'ok', detail);
    return NextResponse.json({ ok: true, ...detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'publish_failed';
    try {
      await writeCronHeartbeat('publish-scheduled', 'error', { error: message });
    } catch {
      /* heartbeat table may be missing before migration */
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const GET = POST;
