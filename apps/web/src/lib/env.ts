export function publicEnv() {
  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    landingUrl: process.env.NEXT_PUBLIC_LANDING_URL ?? 'http://localhost:3001',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
    stunUrls: (process.env.NEXT_PUBLIC_STUN_URLS ?? 'stun:stun.l.google.com:19302')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

export function hasSupabaseConfig() {
  const e = publicEnv();
  return e.supabaseUrl.length > 8 && e.supabaseAnonKey.length >= 20;
}

export function serverSecrets() {
  const accountId = process.env.R2_ACCOUNT_ID ?? '';
  const endpoint =
    process.env.R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  return {
    serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    vapidPrivate: process.env.VAPID_PRIVATE_KEY ?? '',
    vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:admin@localhost',
    turnUrls: (process.env.TURN_URLS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    turnUsername: process.env.TURN_USERNAME ?? '',
    turnCredential: process.env.TURN_CREDENTIAL ?? '',
    r2: {
      accountId,
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      bucket: process.env.R2_BUCKET ?? 'ario',
      endpoint,
    },
  };
}

export function hasR2Config() {
  const { r2 } = serverSecrets();
  return Boolean(r2.accessKeyId && r2.secretAccessKey && r2.endpoint && r2.bucket);
}
