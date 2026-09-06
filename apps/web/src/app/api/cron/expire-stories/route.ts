import { NextResponse } from 'next/server';
import {
  assertCronAuthorized,
  expireStoriesJob,
  writeCronHeartbeat,
} from '@/lib/cron';

export async function POST(req: Request) {
  if (!assertCronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  try {
    const detail = await expireStoriesJob();
    await writeCronHeartbeat('expire-stories', 'ok', detail);
    return NextResponse.json({ ok: true, ...detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'expire_failed';
    try {
      await writeCronHeartbeat('expire-stories', 'error', { error: message });
    } catch {
      /* heartbeat table may be missing before migration */
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const GET = POST;
