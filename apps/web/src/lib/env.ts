function readEnv(name: string, fallback = '') {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

export function publicEnv() {
  return {
    appUrl: readEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    landingUrl: readEnv('NEXT_PUBLIC_LANDING_URL', 'http://localhost:3001'),
    supabaseUrl: readEnv('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    vapidPublicKey: readEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY'),
    stunUrls: readEnv('NEXT_PUBLIC_STUN_URLS', 'stun:stun.l.google.com:19302')
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
  const accountId = readEnv('R2_ACCOUNT_ID');
  const endpoint =
    readEnv('R2_ENDPOINT') ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  return {
    serviceRole: readEnv('SUPABASE_SERVICE_ROLE_KEY'),
    vapidPrivate: readEnv('VAPID_PRIVATE_KEY'),
    vapidSubject: readEnv('VAPID_SUBJECT', 'mailto:admin@localhost'),
    turnUrls: readEnv('TURN_URLS')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    turnUsername: readEnv('TURN_USERNAME'),
    turnCredential: readEnv('TURN_CREDENTIAL'),
    r2: {
      accountId,
      accessKeyId: readEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: readEnv('R2_SECRET_ACCESS_KEY'),
      bucket: readEnv('R2_BUCKET', 'ario'),
      endpoint,
    },
  };
}

export function hasR2Config() {
  const { r2 } = serverSecrets();
  return Boolean(r2.accessKeyId && r2.secretAccessKey && r2.endpoint && r2.bucket);
}
