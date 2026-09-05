'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useCallStore } from '@/stores/call-store';
import { usePresenceStore } from '@/stores/presence-store';

type Person = {
  id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  bio: string;
};

export default function PeoplePage() {
  const me = useAuthStore((s) => s.userId);
  const openDirect = useChatStore((s) => s.openDirect);
  const startCall = useCallStore((s) => s.start);
  const isOnline = usePresenceStore((s) => s.isOnline);
  const router = useRouter();
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    void createClient()
      .from('profiles')
      .select('id,username,display_name,avatar_path,bio')
      .eq('status', 'active')
      .then(({ data }) => setPeople((data ?? []).filter((p) => p.id !== me)));
  }, [me]);

  const filtered = people.filter(
    (p) => p.display_name.includes(q) || p.username.includes(q.toLowerCase()),
  );

  return (
    <AppShell sidebar={<ChatList />}>
      <div className="mx-auto max-w-xl px-4 py-6 pb-24">
        <h1 className="mb-4 text-2xl font-bold">افراد</h1>
        <input className="ario-field mb-4" placeholder="جستجوی نام یا نام کاربری" value={q} onChange={(e) => setQ(e.target.value)} />
        {filtered.length === 0 ? (
          <EmptyState title="کسی پیدا نشد." />
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-ario bg-[var(--ario-surface-solid)] p-3">
                <Avatar name={p.display_name} path={p.avatar_path} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{p.display_name}</div>
                  <div className="ltr-isolate text-xs text-muted">@{p.username}</div>
                  <div className="text-xs text-soft">{isOnline(p.id) ? 'آنلاین' : 'آفلاین'}</div>
                </div>
                <button
                  className="ario-btn ario-btn-primary"
                  onClick={async () => {
                    const id = await openDirect(p.id);
                    if (id) router.push(`/c/${id}`);
                  }}
                >
                  گفتگو
                </button>
                <button
                  className="ario-btn ario-btn-ghost"
                  onClick={() => void startCall({ peerId: p.id, peerName: p.display_name, kind: 'audio' })}
                >
                  تماس
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
