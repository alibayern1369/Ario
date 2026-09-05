'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginSchema, registerSchema } from '@ario/shared';
import { ArioWordmark } from '@/components/brand/logo';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/';
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    if (mode === 'login') {
      const parsed = loginSchema.safeParse({ email, password });
      if (!parsed.success) {
        setError('ایمیل یا رمز را درست وارد کنید.');
        setBusy(false);
        return;
      }
      const err = await signIn(email, password);
      setBusy(false);
      if (err === 'banned') setError('حساب شما غیرفعال یا مسدود است.');
      else if (err) setError('ایمیل یا رمز نادرست است.');
      else router.replace(next);
      return;
    }
    const parsed = registerSchema.safeParse({ email, password, username, displayName });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'اطلاعات ناقص است.');
      setBusy(false);
      return;
    }
    const err = await signUp({ email, password, username, displayName });
    setBusy(false);
    if (err) setError(err);
    else router.replace(next);
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6">
      <ArioWordmark />
      <p className="mt-6 text-soft">ورود با ایمیل و رمز — به پیامک نیازی نیست.</p>
      <form className="mt-6 space-y-3" onSubmit={(e) => void onSubmit(e)}>
        <input className="ario-field ltr-isolate" type="email" placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="ario-field" type="password" placeholder="رمز عبور" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {mode === 'register' ? (
          <>
            <input className="ario-field ltr-isolate" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} />
            <input className="ario-field" placeholder="نام نمایشی" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </>
        ) : null}
        {error ? <p className="text-sm text-[var(--ario-danger)]">{error}</p> : null}
        <button className="ario-btn ario-btn-primary w-full" disabled={busy}>
          {mode === 'login' ? 'ورود به آریو' : 'ساخت حساب'}
        </button>
      </form>
      <button className="mt-4 text-sm text-accent" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'حساب ندارید؟ ساخت حساب (در صورت باز بودن ثبت‌نام)' : 'حساب دارید؟ ورود'}
      </button>
    </main>
  );
}
