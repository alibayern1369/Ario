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

export async function uploadToStorage(
  bucket: string,
  path: string,
  file: File,
  onProgress?: (pct: number) => void,
) {
  const sign = await fetch('/api/storage/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket, path, mime: file.type || 'application/octet-stream', bytes: file.size }),
  });
  if (!sign.ok) throw new Error('sign_failed');
  const payload = (await sign.json()) as { url: string; headers?: Record<string, string> };

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', payload.url);
    const headers = payload.headers ?? { 'Content-Type': file.type || 'application/octet-stream' };
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable || !onProgress) return;
      onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error('upload_failed'));
    };
    xhr.onerror = () => reject(new Error('upload_failed'));
    xhr.onabort = () => reject(new Error('upload_aborted'));
    xhr.send(file);
  });
}

