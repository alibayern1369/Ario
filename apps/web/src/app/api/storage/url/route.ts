import { NextResponse } from 'next/server';
import { createReadUrl } from '@/lib/storage/backend';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bucket = url.searchParams.get('bucket') ?? '';
  const path = url.searchParams.get('path') ?? '';
  if (!bucket || !path) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const result = await createReadUrl(bucket, path);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
