'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Info, Phone, Video } from 'lucide-react';
import { hasPermission } from '@ario/shared';
import { formatDaySeparator, formatLastSeen } from '@/lib/format';
import { useAuthStore } from '@/stores/auth-store';
import { titleOf, useChatStore, type MessageRow } from '@/stores/chat-store';
import { useCallStore } from '@/stores/call-store';
import { usePresenceStore } from '@/stores/presence-store';
import { visibilityAllows } from '@ario/shared';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseConfig } from '@/lib/env';
import { MessageBubble } from '@/components/messages/message-bubble';
import { Composer } from '@/components/chats/composer';
import { ForwardSheet } from '@/components/chats/forward-sheet';
import { ChatInfoSheet } from '@/components/chats/chat-info-sheet';
import { Avatar } from '@/components/ui/avatar';

export function ConversationView({ conversationId }: { conversationId: string }) {
  const load = useChatStore((s) => s.loadMessages);
  const listen = useChatStore((s) => s.listenConversation);
  const markRead = useChatStore((s) => s.markRead);
  const messages = useChatStore((s) => s.messages[conversationId] ?? []);
  const conv = useChatStore((s) => s.conversations.find((c) => c.id === conversationId));
  const typing = useChatStore((s) => s.typing[conversationId] ?? []);
  const me = useAuthStore((s) => s.userId);
  const startCall = useCallStore((s) => s.start);
  const online = usePresenceStore((s) => (conv?.peer ? s.isOnline(conv.peer.id) : false));
  const [reply, setReply] = useState<MessageRow | null>(null);
  const [editing, setEditing] = useState<MessageRow | null>(null);
  const [forward, setForward] = useState<MessageRow | null>(null);
  const [info, setInfo] = useState(false);
  const [jump, setJump] = useState(false);
  const [peerStatus, setPeerStatus] = useState('…');
  const scroller = useRef<HTMLDivElement>(null);
  const firstUnread = useMemo(() => {
    const at = conv?.membership?.last_read_at;
    if (!at) return null;
    return messages.find((m) => m.created_at > at && m.sender_id !== me)?.id ?? null;
  }, [messages, conv?.membership?.last_read_at, me]);

  useEffect(() => {
    void load(conversationId);
    const off = listen(conversationId);
    void markRead(conversationId);
    return off;
  }, [conversationId, load, listen, markRead]);

  useEffect(() => {
    if (!conv || conv.type !== 'channel' || !messages.length || !hasSupabaseConfig()) return;
    const latest = [...messages].reverse().find((m) => !m.deleted_for_everyone);
    if (!latest || latest.id.length < 30) return;
    void createClient().rpc('record_channel_view', { msg: latest.id });
  }, [conv?.type, conversationId, messages[messages.length - 1]?.id]);

  useEffect(() => {
    const peer = conv?.peer;
    if (!peer || !me || !hasSupabaseConfig()) {
      setPeerStatus(conv?.type === 'channel' ? 'کانال' : conv?.type === 'group' ? 'گروه' : '');
      return;
    }
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data: privacy } = await supabase
        .from('privacy_settings')
        .select('online,last_seen')
        .eq('user_id', peer.id)
        .maybeSingle();
      const { data: contacts } = await supabase.rpc('are_direct_contacts', { a: me, b: peer.id });
      const showOnline = visibilityAllows(
        privacy?.online ?? 'everyone',
        me,
        peer.id,
        Boolean(contacts),
      );
      const showLastSeen = visibilityAllows(
        privacy?.last_seen ?? 'everyone',
        me,
        peer.id,
        Boolean(contacts),
      );
      if (cancelled) return;
      if (showOnline && online) {
        setPeerStatus('آنلاین');
        return;
      }
      if (showLastSeen) {
        setPeerStatus(formatLastSeen(peer.last_seen_at));
        return;
      }
      setPeerStatus('');
    })();
    return () => {
      cancelled = true;
    };
  }, [conv?.peer, conv?.type, me, online]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const canSend = conv
    ? hasPermission(
        conv.membership?.role ?? 'member',
        conv.membership?.permissions ?? [],
        conv.type === 'channel' ? 'post_channel' : 'send_messages',
      )
    : true;

  let lastDay = '';

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="glass sticky top-0 z-20 flex items-center gap-3 px-3 py-2">
        <Link href="/" className="md:hidden">
          <ArrowRight />
        </Link>
        <button className="flex min-w-0 flex-1 items-center gap-3" onClick={() => setInfo(true)}>
          <Avatar
            name={conv ? titleOf(conv) : '…'}
            path={conv?.type === 'direct' ? conv.peer?.avatar_path : conv?.avatar_path}
          />
          <div className="min-w-0 text-right">
            <div className="truncate font-bold">{conv ? titleOf(conv) : '…'}</div>
            <div className="text-xs text-muted">
              {typing.length
                ? typing.some((t) => t.endsWith('recording'))
                  ? 'در حال ضبط صدا…'
                  : typing.some((t) => t.endsWith('uploading'))
                    ? 'در حال بارگذاری…'
                    : 'در حال نوشتن…'
                : peerStatus}
            </div>
          </div>
        </button>
        {conv?.peer ? (
          <div className="flex">
            <button
              className="ario-btn ario-btn-ghost px-3"
              onClick={() =>
                void startCall({
                  peerId: conv.peer!.id,
                  peerName: conv.peer!.display_name,
                  kind: 'audio',
                  conversationId,
                })
              }
            >
              <Phone size={18} />
            </button>
            <button
              className="ario-btn ario-btn-ghost px-3"
              onClick={() =>
                void startCall({
                  peerId: conv.peer!.id,
                  peerName: conv.peer!.display_name,
                  kind: 'video',
                  conversationId,
                })
              }
            >
              <Video size={18} />
            </button>
          </div>
        ) : (
          <button className="ario-btn ario-btn-ghost px-3" onClick={() => setInfo(true)}>
            <Info size={18} />
          </button>
        )}
      </header>
      <div
        ref={scroller}
        className="relative flex-1 overflow-auto py-3"
        onScroll={(e) => {
          const el = e.currentTarget;
          setJump(el.scrollHeight - el.scrollTop - el.clientHeight > 240);
          if (el.scrollTop < 80) {
            const first = messages[0];
            if (first) void load(conversationId, first.created_at);
          }
        }}
      >
        {messages.map((m, i) => {
          const day = formatDaySeparator(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          const prev = messages[i - 1];
          const grouped = prev?.sender_id === m.sender_id && !showDay;
          return (
            <div key={m.id}>
              {showDay ? (
                <div className="my-3 text-center text-xs text-muted">
                  <span className="rounded-full bg-[var(--ario-surface-solid)] px-3 py-1">{day}</span>
                </div>
              ) : null}
              {m.id === firstUnread ? (
                <div className="my-2 text-center text-xs text-gold">پیام‌های خوانده‌نشده</div>
              ) : null}
              <MessageBubble
                message={m}
                grouped={grouped}
                onReply={setReply}
                onEdit={setEditing}
                onForward={setForward}
              />
            </div>
          );
        })}
      </div>
      {jump ? (
        <button
          className="ario-btn ario-btn-primary absolute bottom-24 left-4 z-20"
          onClick={() => {
            scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
          }}
        >
          آخرین پیام
        </button>
      ) : null}
      <Composer
        conversationId={conversationId}
        reply={reply}
        editing={editing}
        onClear={() => {
          setReply(null);
          setEditing(null);
        }}
        canSend={canSend && conv?.type !== 'channel' ? canSend : conv?.membership?.role !== 'subscriber'}
      />
      <ForwardSheet message={forward} onClose={() => setForward(null)} />
      <ChatInfoSheet conversationId={conversationId} open={info} onClose={() => setInfo(false)} />
    </div>
  );
}
