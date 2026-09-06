'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginSchema, registerSchema } from '@ario/shared';
import { ArioWordmark } from '@/components/brand/logo';
import { useAuthStore } from '@/stores/auth-store';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseConfig } from '@/lib/env';

export default function LoginPage() {
  const next = useSearchParams().get('next') ?? '/';
  const reason = useSearchParams().get('reason');
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(
    reason === 'banned' || reason === 'disabled'
      ? 'حساب شما غیرفعال یا مسدود شده است.'
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    void createClient()
      .from('system_settings')
      .select('value')
      .eq('key', 'registration_policy')
      .maybeSingle()
      .then(({ data }) => {
        const mode =
          data && typeof data.value === 'object' && data.value && 'mode' in data.value
            ? String((data.value as { mode?: string }).mode)
            : 'invite';
        setRegistrationOpen(mode === 'open');
      });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) {
          setError('ایمیل یا رمز را درست وارد کنید.');
          return;
        }
        const err = await signIn(email, password);
        if (err === 'banned') {
          setError('حساب شما غیرفعال یا مسدود است.');
          return;
        }
        if (err) {
          setError(err.includes('Invalid') || err.includes('invalid') ? 'ایمیل یا رمز نادرست است.' : err);
          return;
        }
        window.location.assign(next.startsWith('/') ? next : '/');
        return;
      }

      if (!registrationOpen) {
        setError('ثبت‌نام آزاد غیرفعال است. از لینک دعوت استفاده کنید.');
        return;
      }

      const parsed = registerSchema.safeParse({ email, password, username, displayName });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'اطلاعات ناقص است.');
        return;
      }
      const err = await signUp({ email, password, username, displayName });
      if (err) {
        setError(err);
        return;
      }
      window.location.assign('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'مشکلی پیش آمد.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6">
      <ArioWordmark />
      <p className="mt-6 text-soft">ورود با ایمیل و رمز — به پیامک نیازی نیست.</p>
      <form className="mt-6 space-y-3" onSubmit={(e) => void onSubmit(e)}>
        <input
          className="ario-field ltr-isolate"
          type="email"
          autoComplete="email"
          placeholder="ایمیل"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="ario-field"
          type="password"
          autoComplete="current-password"
          placeholder="رمز عبور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {mode === 'register' && registrationOpen ? (
          <>
            <input
              className="ario-field ltr-isolate"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
            />
            <input
              className="ario-field"
              placeholder="نام نمایشی"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </>
        ) : null}
        {error ? <p className="text-sm text-[var(--ario-danger)]">{error}</p> : null}
        <button className="ario-btn ario-btn-primary w-full" disabled={busy}>
          {busy ? 'لطفاً صبر کنید…' : mode === 'login' ? 'ورود به آریو' : 'ساخت حساب'}
        </button>
      </form>
      {registrationOpen ? (
        <button
          type="button"
          className="mt-4 text-sm text-accent"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'حساب ندارید؟ ساخت حساب' : 'حساب دارید؟ ورود'}
        </button>
      ) : (
        <p className="mt-4 text-sm text-muted">ثبت‌نام فقط با دعوت‌نامه امکان‌پذیر است.</p>
      )}
    </main>
  );
}
