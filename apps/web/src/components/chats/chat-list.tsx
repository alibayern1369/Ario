'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Archive, BellOff, Pin, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { formatTime } from '@/lib/format';
import { titleOf, useChatStore, type ConversationRow } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { usePresenceStore } from '@/stores/presence-store';
import { StoryRail } from '@/components/stories/story-rail';
import { CreateConversation } from '@/components/chats/create-conversation';
import { InstallHeaderControl } from '@/components/pwa/install-banner';

export function ChatList() {
  const t = useTranslations('chats');
  const pathname = usePathname();
  const router = useRouter();
  const load = useChatStore((s) => s.loadConversations);
  const conversations = useChatStore((s) => s.conversations);
  const loading = useChatStore((s) => s.loadingList);
  const typing = useChatStore((s) => s.typing);
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
    <div className="flex h-[100dvh] flex-col bg-bg">
      <header className="glass-subtle sticky top-0 z-20 border-b border-[var(--ario-glass-border-subtle)] px-ario-4 pb-ario-3 pt-ario-4">
        <div className="mb-ario-3 flex items-center justify-between gap-ario-2">
          <h1 className="ario-type-heading min-w-0 truncate">{archived ? t('archived') : t('title')}</h1>
          <div className="flex shrink-0 items-center gap-0.5">
            <InstallHeaderControl />
            <Link href="/search" className="ario-btn ario-btn-icon" aria-label="جستجو">
              <Search size={18} />
            </Link>
            <button
              className={`ario-btn ario-btn-icon ${archived ? 'text-accent' : ''}`}
              onClick={() => setArchived((v) => !v)}
              aria-label={t('archived')}
              aria-pressed={archived}
            >
              <Archive size={18} />
            </button>
            <button
              className="ario-btn ario-btn-primary !min-h-9 !w-9 !px-0"
              onClick={() => setCreating(true)}
              aria-label="گفتگوی جدید"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
        <label className="relative block">
          <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            className="ario-field ario-field-search pr-10"
            placeholder={t('search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </header>
      <StoryRail />
      <div className="flex-1 overflow-auto pb-24 md:pb-ario-4">
        {loading ? (
          <div className="space-y-0 px-ario-4 py-ario-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-ario-3 py-ario-3">
                <div className="skeleton h-11 w-11 shrink-0 !rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="skeleton h-3.5 w-1/3" />
                  <div className="skeleton h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState title={t('empty')} body={q.trim() ? 'نتیجه‌ای پیدا نشد.' : undefined} />
        ) : (
          visible.map((c) => (
            <ChatRow
              key={c.id}
              conversation={c}
              active={pathname === `/c/${c.id}`}
              typingUsers={typing[c.id] ?? []}
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
  typingUsers,
  onOpen,
}: {
  conversation: ConversationRow;
  active: boolean;
  typingUsers: string[];
  onOpen: () => void;
}) {
  const t = useTranslations('chats');
  const online = usePresenceStore((s) => (c.peer ? s.isOnline(c.peer.id) : false));
  const muted =
    c.membership?.muted_until != null && new Date(c.membership.muted_until).getTime() > Date.now();
  const isTyping = typingUsers.length > 0;
  const preview = isTyping
    ? typingUsers.some((x) => x.endsWith('recording'))
      ? 'در حال ضبط صدا…'
      : typingUsers.some((x) => x.endsWith('uploading'))
        ? 'در حال بارگذاری…'
        : 'در حال نوشتن…'
    : c.membership?.draft
      ? `${t('draft')}: ${c.membership.draft}`
      : (c.lastMessage?.content ?? (c.lastMessage ? 'رسانه' : ''));

  return (
    <Link
      href={`/c/${c.id}`}
      onClick={onOpen}
      className={`flex items-center gap-ario-3 border-b border-[var(--ario-line)] px-ario-4 py-ario-3 transition-colors ${
        active ? 'bg-[var(--ario-accent-soft)]' : 'hover:bg-[var(--ario-surface-elevated)]'
      }`}
    >
      <div className="relative shrink-0">
        <Avatar
          name={titleOf(c)}
          path={c.type === 'direct' ? c.peer?.avatar_path : c.avatar_path}
          size={44}
          ring={false}
        />
        {c.type === 'direct' && online ? (
          <span
            className="absolute bottom-0 left-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--ario-bg)] bg-online"
            aria-hidden
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-ario-2">
          <div className="flex min-w-0 items-center gap-1">
            {c.membership?.pinned ? (
              <Pin size={12} className="shrink-0 text-accent" aria-hidden />
            ) : null}
            <span className={`truncate ario-type-caption ${c.unread > 0 ? 'font-bold text-ink' : 'font-semibold text-ink'}`}>
              {titleOf(c)}
            </span>
            {muted ? <BellOff size={12} className="shrink-0 text-muted" aria-hidden /> : null}
          </div>
          {c.lastMessage ? (
            <time className="ario-type-meta shrink-0 text-muted">{formatTime(c.lastMessage.created_at)}</time>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-ario-2">
          <p
            className={`truncate ario-type-caption ${
              isTyping
                ? 'text-accent'
                : c.membership?.draft
                  ? 'text-[var(--ario-warning)]'
                  : c.unread > 0
                    ? 'font-medium text-ink'
                    : 'text-soft'
            }`}
          >
            {preview}
          </p>
          {c.unread > 0 ? <span className="ario-unread-badge">{c.unread > 99 ? '99+' : c.unread}</span> : null}
        </div>
      </div>
    </Link>
  );
}
