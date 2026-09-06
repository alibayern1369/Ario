'use client';

import { create } from 'zustand';
import { authEmailFromUsername } from '@ario/shared';
import { hasSupabaseConfig, supabaseConfigError } from '@/lib/env';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

function resolveAuthEmail(identifier: string): string {
  const value = identifier.trim();
  if (value.includes('@')) return value;
  return authEmailFromUsername(value);
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

type Profile = Database['public']['Tables']['profiles']['Row'];
type Privacy = Database['public']['Tables']['privacy_settings']['Row'];

type AuthState = {
  ready: boolean;
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  privacy: Privacy | null;
  hydrate: () => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<string | null>;
  signUp: (input: {
    firstName: string;
    lastName: string;
    username: string;
    password: string;
    confirmPassword: string;
  }) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

let authListenerBound = false;
let deviceTouchAt = 0;

export const useAuthStore = create<AuthState>((set, get) => ({
  ready: false,
  userId: null,
  email: null,
  profile: null,
  privacy: null,
  hydrate: async () => {
    if (!hasSupabaseConfig()) {
      set({ ready: true });
      console.error(supabaseConfigError());
      return;
    }
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        set({ ready: true, userId: null, email: null, profile: null, privacy: null });
        return;
      }
      set({ userId: user.id, email: user.email ?? null });
      await get().refreshProfile();
      set({ ready: true });

      if (!authListenerBound) {
        authListenerBound = true;
        supabase.auth.onAuthStateChange((_event, session) => {
          set({ userId: session?.user.id ?? null, email: session?.user.email ?? null });
          if (session?.user) void get().refreshProfile();
        });
      }

      // Touch device at most once per 10 minutes (avoid unbounded inserts).
      const now = Date.now();
      if (now - deviceTouchAt > 10 * 60 * 1000) {
        deviceTouchAt = now;
        void Promise.resolve(
          supabase.from('user_devices').insert({
            user_id: user.id,
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            last_active_at: new Date().toISOString(),
          }),
        ).catch(() => undefined);
      }
    } catch {
      set({ ready: true });
    }
  },
  signIn: async (identifier, password) => {
    const supabase = createClient();
    try {
      const email = resolveAuthEmail(identifier);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        const msg = error.message;
        if (/Invalid|invalid|credentials/i.test(msg)) return 'نام کاربری یا رمز نادرست است.';
        return msg;
      }

      await get().hydrate();

      // Profile trigger/upsert can lag briefly after signup.
      for (let i = 0; i < 6 && !get().profile; i++) {
        await sleep(250);
        await get().refreshProfile();
      }

      const profile = get().profile;
      if (!profile) {
        await supabase.auth.signOut();
        set({ userId: null, email: null, profile: null, privacy: null, ready: true });
        return 'پروفایل ساخته نشد. چند ثانیه بعد دوباره وارد شوید.';
      }
      if (profile.status !== 'active') {
        await supabase.auth.signOut();
        set({ userId: null, email: null, profile: null, privacy: null, ready: true });
        return 'banned';
      }
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'ورود ناموفق بود.';
    }
  },
  signUp: async (input) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: input.firstName,
          lastName: input.lastName,
          username: input.username,
          password: input.password,
          confirmPassword: input.confirmPassword,
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string; email?: string } | null;
      if (!res.ok) {
        if (body?.error === 'registration_closed') {
          return 'ثبت‌نام آزاد غیرفعال است. از لینک دعوت استفاده کنید.';
        }
        if (body?.error === 'username_taken') return 'این نام کاربری قبلاً گرفته شده است.';
        if (body?.error === 'max_users') return 'ظرفیت کاربران تکمیل است.';
        return body?.error ?? 'ثبت‌نام ناموفق بود.';
      }

      const email = body?.email ?? authEmailFromUsername(input.username);
      // Brief pause so Auth session + profile row are readable.
      await sleep(300);
      return await get().signIn(email, input.password);
    } catch (err) {
      return err instanceof Error ? err.message : 'ثبت‌نام ناموفق بود.';
    }
  },
  signOut: async () => {
    try {
      if (hasSupabaseConfig()) await createClient().auth.signOut();
    } finally {
      set({ userId: null, email: null, profile: null, privacy: null, ready: true });
    }
  },
  refreshProfile: async () => {
    const id = get().userId;
    if (!id) return;
    const supabase = createClient();
    const [{ data: profile }, { data: privacy }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('privacy_settings').select('*').eq('user_id', id).maybeSingle(),
    ]);
    set({ profile: (profile as Profile | null) ?? null, privacy: (privacy as Privacy | null) ?? null });
  },
}));
