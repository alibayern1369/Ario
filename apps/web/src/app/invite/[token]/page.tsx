'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PasswordField } from '@/components/ui/password-field';
import { useAuthStore } from '@/stores/auth-store';

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          password,
          username,
          displayName,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        if (body?.error === 'email_mismatch') setError('این دعوت برای ایمیل دیگری صادر شده است.');
        else if (body?.error === 'expired') setError('دعوت منقضی شده است.');
        else setError('دعوت نامعتبر است یا ثبت‌نام انجام نشد.');
        return;
      }
      const err = await signIn(email, password);
      if (err) setError(err === 'banned' ? 'حساب شما غیرفعال است.' : err);
      else router.replace('/');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">پذیرش دعوت آریو</h1>
      <form className="mt-6 space-y-3" onSubmit={(e) => void accept(e)}>
        <input
          className="ario-field"
          type="email"
          placeholder="ایمیل"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <PasswordField
          value={password}
          onChange={setPassword}
          placeholder="رمز دلخواه"
          autoComplete="new-password"
          required
          minLength={4}
        />
        <input
          className="ario-field ltr-isolate"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          required
        />
        <input
          className="ario-field"
          placeholder="نام نمایشی"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
        {error ? <p className="text-sm text-[var(--ario-danger)]">{error}</p> : null}
        <button className="ario-btn ario-btn-primary w-full" disabled={busy}>
          ورود به آریو
        </button>
      </form>
    </main>
  );
}
