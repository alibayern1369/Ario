import { AwsClient } from 'aws4fetch';
import { hasR2Config, serverSecrets } from '@/lib/env';
import { objectKey } from './access';

function client() {
  if (!hasR2Config()) throw new Error('R2 is not configured');
  const { r2 } = serverSecrets();
  return new AwsClient({
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    service: 's3',
    region: 'auto',
  });
}

function objectUrl(bucket: string, path: string) {
  const { r2 } = serverSecrets();
  const key = objectKey(bucket, path)
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${r2.endpoint.replace(/\/$/, '')}/${encodeURIComponent(r2.bucket)}/${key}`;
}

async function sign(url: string, method: string, headers?: HeadersInit) {
  const signed = await client().sign(new Request(url, { method, headers }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

export async function signR2Read(bucket: string, path: string) {
  return sign(objectUrl(bucket, path), 'GET');
}

export async function signR2Write(bucket: string, path: string, mime: string) {
  const url = await sign(objectUrl(bucket, path), 'PUT', { 'Content-Type': mime });
  return { url, headers: { 'Content-Type': mime } };
}
