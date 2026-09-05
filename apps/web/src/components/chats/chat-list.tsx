'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Archive, Pin, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { formatTime } from '@/lib/format';
import { titleOf, useChatStore, type ConversationRow } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { StoryRail } from '@/components/stories/story-rail';
import { CreateConversation } from '@/components/chats/create-conversation';

export function ChatList() {
  const t = useTranslations('chats');
  const pathname = usePathname();
  const router = useRouter();
  const load = useChatStore((s) => s.loadConversations);
  const conversations = useChatStore((s) => s.conversations);
  const loading = useChatStore((s) => s.loadingList);
  const ready = useAuthStore((s) => s.ready);
  const [q, setQ] = useState('');
  const [archived, setArchived] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  const visible = useMemo(() => {
    return conversations.filter((c) => {
      if (!!c.membership?.archived !== archived) return false;
      if (!q.trim()) return true;
      const hay = `${titleOf(c)} ${c.peer?.username ?? ''} ${c.lastMessage?.content ?? ''}`;
      return hay.includes(q.trim());
    });
  }, [conversations, q, archived]);

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="glass sticky top-0 z-20 px-4 pb-3 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <div className="flex gap-1">
            <Link href="/search" className="ario-btn ario-btn-ghost px-3" aria-label="جستجو">
              <Search size={18} />
            </Link>
            <button
              className="ario-btn ario-btn-ghost px-3"
              onClick={() => setArchived((v) => !v)}
              aria-label={t('archived')}
            >
              <Archive size={18} />
            </button>
            <button className="ario-btn ario-btn-primary px-3" onClick={() => setCreating(true)}>
              <Plus size={18} />
            </button>
          </div>
        </div>
        <label className="relative block">
          <Search className="absolute right-3 top-3 text-muted" size={18} />
          <input
            className="ario-field pr-10"
            placeholder={t('search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </header>
      <StoryRail />
      <div className="flex-1 overflow-auto pb-20 md:pb-4">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-ario" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState title={t('empty')} />
        ) : (
          visible.map((c) => (
            <ChatRow
              key={c.id}
              conversation={c}
              active={pathname === `/c/${c.id}`}
              onOpen={() => router.push(`/c/${c.id}`)}
            />
          ))
        )}
      </div>
      <CreateConversation open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function ChatRow({
  conversation: c,
  active,
  onOpen,
}: {
  conversation: ConversationRow;
  active: boolean;
  onOpen: () => void;
}) {
  const t = useTranslations('chats');
  const preview = c.membership?.draft
    ? `${t('draft')}: ${c.membership.draft}`
    : (c.lastMessage?.content ?? (c.lastMessage ? 'رسانه' : ''));
  return (
    <Link
      href={`/c/${c.id}`}
      onClick={onOpen}
      className={`flex items-center gap-3 px-4 py-3 ${active ? 'bg-accent-soft' : ''}`}
    >
      <Avatar
        name={titleOf(c)}
        path={c.type === 'direct' ? c.peer?.avatar_path : c.avatar_path}
        ring={false}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1 font-semibold">
            {c.membership?.pinned ? <Pin size={14} className="text-gold" /> : null}
            <span className="truncate">{titleOf(c)}</span>
          </div>
          {c.lastMessage ? (
            <time className="text-[11px] text-muted">{formatTime(c.lastMessage.created_at)}</time>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-2 text-sm text-soft">
          <p className="truncate">{preview}</p>
          {c.unread > 0 ? (
            <span className="min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] text-white">
              {c.unread}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
