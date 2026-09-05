const cache = new Map<string, { url: string; exp: number }>();

export async function signedUrl(bucket: string, path: string) {
  const key = `${bucket}:${path}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.url;
  const res = await fetch(`/api/storage/url?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string };
  if (!data.url) return null;
  cache.set(key, { url: data.url, exp: Date.now() + 45 * 60 * 1000 });
  return data.url;
}

export async function uploadToStorage(bucket: string, path: string, file: File) {
  const sign = await fetch('/api/storage/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket, path, mime: file.type || 'application/octet-stream', bytes: file.size }),
  });
  if (!sign.ok) throw new Error('sign_failed');
  const payload = (await sign.json()) as { url: string; headers?: Record<string, string> };
  const put = await fetch(payload.url, {
    method: 'PUT',
    body: file,
    headers: payload.headers ?? { 'Content-Type': file.type },
  });
  if (!put.ok) throw new Error('upload_failed');
}
