'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';
import { PasswordField } from '@/components/ui/password-field';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/format';
import { useAuthStore } from '@/stores/auth-store';

type Device = { id: string; user_agent: string | null; last_active_at: string };

export default function SecurityPage() {
  const me = useAuthStore((s) => s.userId);
  const [devices, setDevices] = useState<Device[]>([]);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!me) return;
    void createClient()
      .from('user_devices')
      .select('id,user_agent,last_active_at')
      .eq('user_id', me)
      .then(({ data }) => setDevices((data ?? []) as Device[]));
  }, [me]);

  return (
    <AppShell sidebar={<ChatList />}>
      <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <h1 className="text-2xl font-bold">امنیت و نشست‌ها</h1>
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await createClient().auth.updateUser({ password });
            setPassword('');
          }}
        >
          <PasswordField
            value={password}
            onChange={setPassword}
            placeholder="رمز تازه"
            autoComplete="new-password"
            minLength={4}
            required
          />
          <button className="ario-btn ario-btn-primary w-full">به‌روزرسانی رمز</button>
        </form>
        <h2 className="pt-4 font-bold">دستگاه‌های فعال</h2>
        <ul className="space-y-2">
          {devices.map((d) => (
            <li key={d.id} className="rounded-ario bg-[var(--ario-surface-solid)] p-3 text-sm">
              <div className="ltr-isolate">{d.user_agent ?? 'دستگاه'}</div>
              <div className="text-muted">{formatDateTime(d.last_active_at)}</div>
              <button
                className="mt-2 text-[var(--ario-danger)]"
                onClick={async () => {
                  await createClient().from('user_devices').delete().eq('id', d.id);
                  setDevices((s) => s.filter((x) => x.id !== d.id));
                }}
              >
                لغو نشست
              </button>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
