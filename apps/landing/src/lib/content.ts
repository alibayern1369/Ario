import fallback from '@/content/fa.json';

export type LandingPayload = typeof fallback;

export async function getLandingContent(): Promise<LandingPayload> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return fallback;
  try {
    const res = await fetch(`${url}/rest/v1/landing_content?id=eq.default&select=payload`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 60 },
    });
    if (!res.ok) return fallback;
    const rows = (await res.json()) as Array<{ payload: LandingPayload }>;
    return rows[0]?.payload ?? fallback;
  } catch {
    return fallback;
  }
}

export function appUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return value || 'http://localhost:3000';
}

export function siteUrl() {
  const value = process.env.NEXT_PUBLIC_LANDING_URL?.trim();
  return value || 'http://localhost:3001';
}
