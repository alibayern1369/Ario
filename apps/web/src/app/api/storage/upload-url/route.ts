import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DEFAULT_UPLOAD_LIMITS } from '@ario/shared';
import { createUploadUrl } from '@/lib/storage/backend';
import { isLogicalBucket } from '@/lib/storage/access';

export const runtime = 'nodejs';

const bodySchema = z.object({
  bucket: z.string(),
  path: z.string().min(3).max(400),
  mime: z.string().min(3).max(120),
  bytes: z.number().int().nonnegative(),
});

function limitFor(bucket: string, mime: string) {
  if (bucket === 'avatars') return DEFAULT_UPLOAD_LIMITS.avatarBytes;
  if (bucket === 'stories') return DEFAULT_UPLOAD_LIMITS.storyBytes;
  if (mime.startsWith('image/')) return DEFAULT_UPLOAD_LIMITS.imageBytes;
  if (mime.startsWith('video/')) return DEFAULT_UPLOAD_LIMITS.videoBytes;
  if (mime.startsWith('audio/')) return DEFAULT_UPLOAD_LIMITS.voiceBytes;
  return DEFAULT_UPLOAD_LIMITS.fileBytes;
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success || !isLogicalBucket(parsed.data.bucket)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (parsed.data.bytes > limitFor(parsed.data.bucket, parsed.data.mime)) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }
  const result = await createUploadUrl(parsed.data);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
