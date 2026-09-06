'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginSchema, registerSchema } from '@ario/shared';
import { ArioWordmark } from '@/components/brand/logo';
import { PasswordField } from '@/components/ui/password-field';
import { useAuthStore } from '@/stores/auth-store';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseConfig } from '@/lib/env';

export default function LoginPage() {
  const next = useSearchParams().get('next') ?? '/';
  const reason = useSearchParams().get('reason');
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(
    reason === 'banned' || reason === 'disabled'
      ? 'حساب شما غیرفعال یا مسدود شده است.'
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);

  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    void createClient()
      .from('system_settings')
      .select('value')
      .eq('key', 'registration_policy')
      .maybeSingle()
      .then(({ data }) => {
        const policy =
          data && typeof data.value === 'object' && data.value && 'mode' in data.value
            ? String((data.value as { mode?: string }).mode)
            : 'open';
        setRegistrationOpen(policy !== 'closed');
      });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        const parsed = loginSchema.safeParse({ identifier, password });
        if (!parsed.success) {
          setError('نام کاربری یا رمز را درست وارد کنید.');
          return;
        }
        const err = await signIn(identifier, password);
        if (err === 'banned') {
          setError('حساب شما غیرفعال یا مسدود است.');
          return;
        }
        if (err) {
          setError(err);
          return;
        }
        window.location.assign(next.startsWith('/') ? next : '/');
        return;
      }

      if (!registrationOpen) {
        setError('ثبت‌نام آزاد غیرفعال است. از لینک دعوت استفاده کنید.');
        return;
      }

      const parsed = registerSchema.safeParse({
        firstName,
        lastName,
        username,
        password,
        confirmPassword,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'اطلاعات ناقص است.');
        return;
      }
      const err = await signUp(parsed.data);
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
      <p className="mt-6 text-soft">
        {mode === 'login'
          ? 'ورود با نام کاربری و رمز — به پیامک نیازی نیست.'
          : 'ساخت حساب با نام، نام کاربری و رمز.'}
      </p>
      <form className="mt-6 space-y-3" onSubmit={(e) => void onSubmit(e)}>
        {mode === 'register' && registrationOpen ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <input
                className="ario-field"
                autoComplete="given-name"
                placeholder="نام"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                className="ario-field"
                autoComplete="family-name"
                placeholder="نام خانوادگی"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <input
              className="ario-field ltr-isolate"
              autoComplete="username"
              placeholder="نام کاربری"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
              minLength={3}
              maxLength={32}
              pattern="[a-z0-9_]{3,32}"
              title="فقط حروف انگلیسی کوچک، عدد و _"
            />
          </>
        ) : (
          <input
            className="ario-field ltr-isolate"
            autoComplete="username"
            placeholder="نام کاربری یا ایمیل"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        )}
        <PasswordField
          value={password}
          onChange={setPassword}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          placeholder="رمز عبور"
          required
          minLength={mode === 'register' ? 4 : undefined}
        />
        {mode === 'register' && registrationOpen ? (
          <PasswordField
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            placeholder="تکرار رمز عبور"
            required
            minLength={4}
          />
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
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? 'حساب ندارید؟ ساخت حساب' : 'حساب دارید؟ ورود'}
        </button>
      ) : (
        <p className="mt-4 text-sm text-muted">ثبت‌نام فقط با دعوت‌نامه امکان‌پذیر است.</p>
      )}
    </main>
  );
}
