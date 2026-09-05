import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_LANDING_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional().or(z.literal('')),
  NEXT_PUBLIC_STUN_URLS: z.string().optional().or(z.literal('')),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  VAPID_PRIVATE_KEY: z.string().optional().or(z.literal('')),
  VAPID_SUBJECT: z.string().optional().or(z.literal('')),
  TURN_URLS: z.string().optional().or(z.literal('')),
  TURN_USERNAME: z.string().optional().or(z.literal('')),
  TURN_CREDENTIAL: z.string().optional().or(z.literal('')),
  SMTP_URL: z.string().optional().or(z.literal('')),
  OTP_PROVIDER: z.string().optional().or(z.literal('')),
  OTP_API_KEY: z.string().optional().or(z.literal('')),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_LANDING_URL: source.NEXT_PUBLIC_LANDING_URL,
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: source.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
    NEXT_PUBLIC_STUN_URLS: source.NEXT_PUBLIC_STUN_URLS ?? '',
  });
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  return serverEnvSchema.parse({
    ...parsePublicEnv(source),
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
    VAPID_PRIVATE_KEY: source.VAPID_PRIVATE_KEY ?? '',
    VAPID_SUBJECT: source.VAPID_SUBJECT ?? '',
    TURN_URLS: source.TURN_URLS ?? '',
    TURN_USERNAME: source.TURN_USERNAME ?? '',
    TURN_CREDENTIAL: source.TURN_CREDENTIAL ?? '',
    SMTP_URL: source.SMTP_URL ?? '',
    OTP_PROVIDER: source.OTP_PROVIDER ?? '',
    OTP_API_KEY: source.OTP_API_KEY ?? '',
  });
}

export function isOtpConfigured(env: Pick<ServerEnv, 'OTP_PROVIDER' | 'OTP_API_KEY'>): boolean {
  return Boolean(env.OTP_PROVIDER && env.OTP_API_KEY);
}
