'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void createClient()
      .from('profiles')
      .select('id,username,display_name,avatar_path,bio')
      .eq('status', 'active')
      .then(({ data }) => {
        setPeople((data ?? []).filter((p) => p.id !== me));
        setLoading(false);
      });
  }, [me]);

  const needle = q.trim().replace(/^@/, '').toLowerCase();
  const filtered = people.filter(
    (p) =>
      !needle ||
      p.display_name.includes(q.trim()) ||
      p.username.toLowerCase().includes(needle),
  );

  return (
    <AppShell sidebar={<ChatList />}>
      <div className="mx-auto max-w-xl px-4 py-6 pb-24">
        <h1 className="mb-1 text-2xl font-bold">افراد</h1>
        <p className="mb-4 text-sm text-soft">
          مخاطبین همان کاربرانی هستند که در آریو ثبت‌نام کرده‌اند. با نام یا{' '}
          <span className="ltr-isolate">@username</span> جستجو کنید، یا از «گفتگوی تازه» گفتگوی خصوصی شروع کنید.
        </p>
        <input
          className="ario-field mb-4"
          placeholder="جستجوی نام یا نام کاربری"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          enterKeyHint="search"
        />
        {loading ? (
          <div className="skeleton h-24" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={people.length === 0 ? 'هنوز کسی جز شما نیست' : 'کسی با این جستجو پیدا نشد'}
            body={
              people.length === 0
                ? 'از دیگران بخواهید در آریو ثبت‌نام کنند؛ بعد اینجا و در جستجو پیدایشان می‌کنید.'
                : 'نام کامل یا نام کاربری را دقیق‌تر وارد کنید. می‌توانید از صفحهٔ جستجو هم استفاده کنید.'
            }
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-ario bg-[var(--ario-surface-solid)] p-3">
                <Link href={`/u/${p.username}`} className="shrink-0">
                  <Avatar name={p.display_name} path={p.avatar_path} />
                </Link>
                <Link href={`/u/${p.username}`} className="min-w-0 flex-1">
                  <div className="font-semibold">{p.display_name}</div>
                  <div className="ltr-isolate text-xs text-muted">@{p.username}</div>
                  <div className="text-xs text-soft">{isOnline(p.id) ? 'آنلاین' : 'آفلاین'}</div>
                </Link>
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
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/search" className="text-accent">
            جستجوی پیشرفته
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
