'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';
import { createClient } from '@/lib/supabase/client';

type Conv = { id: string; title: string | null; type: string; is_disabled: boolean };

export default function AdminGroups() {
  const [rows, setRows] = useState<Conv[]>([]);
  useEffect(() => {
    void createClient()
      .from('conversations')
      .select('id,title,type,is_disabled')
      .in('type', ['group', 'channel'])
      .then(({ data }) => setRows((data ?? []) as Conv[]));
  }, []);
  return (
    <AppShell sidebar={<ChatList />}>
      <div className="px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">گروه‌ها و کانال‌ها</h1>
        <ul className="space-y-2">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-ario bg-[var(--ario-surface-solid)] p-3">
              <div>
                {c.title} <span className="text-xs text-muted">{c.type}</span>
              </div>
              <button
                className="ario-btn ario-btn-ghost"
                onClick={async () => {
                  await createClient().from('conversations').update({ is_disabled: !c.is_disabled }).eq('id', c.id);
                  setRows((s) => s.map((x) => (x.id === c.id ? { ...x, is_disabled: !x.is_disabled } : x)));
                }}
              >
                {c.is_disabled ? 'فعال‌سازی' : 'غیرفعال'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
