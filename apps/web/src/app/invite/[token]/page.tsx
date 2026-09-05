'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email }),
    });
    if (!res.ok) {
      setError('دعوت نامعتبر یا منقضی است.');
      return;
    }
    const err = await signUp({ email, password, username, displayName });
    if (err) setError(err);
    else router.replace('/');
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">پذیرش دعوت آریو</h1>
      <form className="mt-6 space-y-3" onSubmit={(e) => void accept(e)}>
        <input className="ario-field" type="email" placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="ario-field" type="password" placeholder="رمز دلخواه" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input className="ario-field ltr-isolate" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input className="ario-field" placeholder="نام نمایشی" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        {error ? <p className="text-sm text-[var(--ario-danger)]">{error}</p> : null}
        <button className="ario-btn ario-btn-primary w-full">ورود به آریو</button>
      </form>
    </main>
  );
}
