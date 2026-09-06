'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PasswordField } from '@/components/ui/password-field';

type User = {
  id: string;
  username: string;
  display_name: string;
  status: 'active' | 'disabled' | 'banned';
  role: 'member' | 'admin' | 'owner';
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('ario1234');
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    const { data } = await createClient()
      .from('profiles')
      .select('id,username,display_name,status,role')
      .order('created_at', { ascending: false });
    setUsers((data ?? []) as User[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function patch(id: string, update: Partial<User>) {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...update }),
    });
    await load();
  }

  return (
    <div className="px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">کاربران</h1>
      <form
        className="mb-6 grid gap-2 md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setFormError(null);
          const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, displayName, password }),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as { error?: string } | null;
            setFormError(body?.error ?? 'ساخت کاربر ناموفق بود.');
            return;
          }
          setEmail('');
          setUsername('');
          setDisplayName('');
          await load();
        }}
      >
        <input className="ario-field" placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="ario-field" placeholder="نام کاربری" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="ario-field" placeholder="نام" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <PasswordField value={password} onChange={setPassword} placeholder="رمز موقت" autoComplete="new-password" minLength={4} />
        <button className="ario-btn ario-btn-primary">ساخت کاربر</button>
        {formError ? <p className="text-sm text-[var(--ario-danger)] md:col-span-2">{formError}</p> : null}
      </form>
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id} className="rounded-ario bg-[var(--ario-surface-solid)] p-3">
            <div className="font-bold">
              {u.display_name} <span className="ltr-isolate text-sm text-muted">@{u.username}</span>
            </div>
            <div className="text-xs text-soft">
              {u.role} · {u.status}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="ario-btn ario-btn-ghost" onClick={() => void patch(u.id, { status: 'banned' })}>
                مسدود
              </button>
              <button className="ario-btn ario-btn-ghost" onClick={() => void patch(u.id, { status: 'active' })}>
                فعال
              </button>
              <button className="ario-btn ario-btn-ghost" onClick={() => void patch(u.id, { status: 'disabled' })}>
                غیرفعال
              </button>
              <button
                className="ario-btn ario-btn-ghost"
                onClick={() => void patch(u.id, { role: u.role === 'admin' ? 'member' : 'admin' })}
              >
                نقش
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
