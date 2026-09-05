'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';

type Result = {
  users: Array<{ id: string; username: string; display_name: string }>;
  messages: Array<{ id: string; conversation_id: string; content: string | null }>;
};

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Result>({ users: [], messages: [] });

  async function run() {
    const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (r.ok) setRes((await r.json()) as Result);
  }

  return (
    <AppShell sidebar={<ChatList />}>
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">جستجو</h1>
        <div className="flex gap-2">
          <input className="ario-field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="افراد، گفتگو، پیام" />
          <button className="ario-btn ario-btn-primary" onClick={() => void run()}>
            برو
          </button>
        </div>
        <h2 className="mt-6 font-bold">افراد</h2>
        {res.users.map((u) => (
          <Link key={u.id} href={`/u/${u.username}`} className="block py-2">
            {u.display_name} <span className="ltr-isolate text-muted">@{u.username}</span>
          </Link>
        ))}
        <h2 className="mt-6 font-bold">پیام‌ها</h2>
        {res.messages.map((m) => (
          <Link key={m.id} href={`/c/${m.conversation_id}`} className="block py-2 text-sm">
            {m.content}
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
