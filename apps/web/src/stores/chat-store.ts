'use client';

import { create } from 'zustand';
import { hasSupabaseConfig } from '@/lib/env';
import { conversationChannelName, realtimeHub } from '@/lib/realtime/channel-manager';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from './auth-store';

export type ConversationRow = {
  id: string;
  type: 'direct' | 'group' | 'channel' | 'saved';
  title: string | null;
  description: string | null;
  avatar_path: string | null;
  is_public: boolean;
  join_approval: boolean;
  invite_token: string | null;
  updated_at: string;
  membership?: {
    role: 'owner' | 'admin' | 'member' | 'subscriber';
    permissions: string[];
    muted_until: string | null;
    archived: boolean;
    pinned: boolean;
    last_read_at: string | null;
    draft: string | null;
  };
  lastMessage?: {
    content: string | null;
    created_at: string;
    type: string;
    sender_id: string | null;
  };
  peer?: { id: string; display_name: string; username: string; avatar_path: string | null; last_seen_at?: string | null };
  peerReceipts?: { last_read_at: string | null; last_delivered_at: string | null; read_receipts: boolean };
  unread: number;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  client_id: string | null;
  type: string;
  content: string | null;
  reply_to: string | null;
  forwarded_from: string | null;
  metadata: Record<string, unknown>;
  edited_at: string | null;
  deleted_for_everyone: boolean;
  pinned: boolean;
  created_at: string;
  localStatus?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  attachments?: Array<{
    id: string;
    bucket: string;
    path: string;
    mime: string;
    bytes: number;
    thumbnail_path: string | null;
    original_name: string | null;
    duration_ms: number | null;
  }>;
  reactions?: Array<{ emoji: string; user_id: string }>;
};

type ChatState = {
  conversations: ConversationRow[];
  messages: Record<string, MessageRow[]>;
  typing: Record<string, string[]>;
  loadingList: boolean;
  loadingMessages: boolean;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string, before?: string) => Promise<void>;
  listenConversation: (conversationId: string) => () => void;
  sendText: (conversationId: string, content: string, replyTo?: string | null) => Promise<void>;
  editMessage: (id: string, conversationId: string, content: string) => Promise<void>;
  deleteForMe: (id: string) => Promise<void>;
  deleteForEveryone: (id: string) => Promise<void>;
  react: (messageId: string, emoji: string) => Promise<void>;
  pinMessage: (id: string, pinned: boolean) => Promise<void>;
  markRead: (conversationId: string) => Promise<void>;
  setDraft: (conversationId: string, draft: string) => Promise<void>;
  setTyping: (conversationId: string, kind: 'typing' | 'recording' | 'uploading' | 'off') => void;
  togglePinChat: (conversationId: string, pinned: boolean) => Promise<void>;
  toggleArchive: (conversationId: string, archived: boolean) => Promise<void>;
  toggleMute: (conversationId: string, muted: boolean) => Promise<void>;
  openDirect: (peerId: string) => Promise<string | null>;
  retry: (conversationId: string, clientId: string) => Promise<void>;
};

function titleOf(c: ConversationRow) {
  if (c.type === 'saved') return 'پیام‌های ذخیره‌شده';
  if (c.peer) return c.peer.display_name;
  return c.title ?? 'گفتگو';
}

export { titleOf };

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  typing: {},
  loadingList: false,
  loadingMessages: false,
  loadConversations: async () => {
    if (!hasSupabaseConfig()) return;
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    set({ loadingList: true });
    const supabase = createClient();
    const { data: memberships } = await supabase
      .from('conversation_members')
      .select('*, conversations(*)')
      .eq('user_id', userId);

    const list = memberships ?? [];
    const rows: ConversationRow[] = await Promise.all(
      list.map(async (m) => {
        const conv = (m as { conversations: ConversationRow }).conversations;
        if (!conv) {
          return null as unknown as ConversationRow;
        }

        const lastPromise = supabase
          .from('messages')
          .select('content,created_at,type,sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const unreadPromise = supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', userId)
          .gt('created_at', m.last_read_at ?? '1970-01-01');

        let peer: ConversationRow['peer'];
        let peerReceipts: ConversationRow['peerReceipts'];

        if (conv.type === 'direct') {
          const { data: others } = await supabase
            .from('conversation_members')
            .select(
              'user_id,last_read_at,last_delivered_at,profiles(id,display_name,username,avatar_path,last_seen_at)',
            )
            .eq('conversation_id', conv.id)
            .neq('user_id', userId)
            .limit(1)
            .maybeSingle();
          const row = others as {
            user_id: string;
            last_read_at: string | null;
            last_delivered_at: string | null;
            profiles?: ConversationRow['peer'] | ConversationRow['peer'][];
          } | null;
          const p = Array.isArray(row?.profiles) ? row?.profiles[0] : row?.profiles;
          if (p) peer = p;
          let readReceipts = true;
          if (row?.user_id) {
            const { data: privacy } = await supabase
              .from('privacy_settings')
              .select('read_receipts')
              .eq('user_id', row.user_id)
              .maybeSingle();
            readReceipts = privacy?.read_receipts ?? true;
          }
          peerReceipts = {
            last_read_at: row?.last_read_at ?? null,
            last_delivered_at: row?.last_delivered_at ?? null,
            read_receipts: readReceipts,
          };
        }

        const [{ data: last }, { count }] = await Promise.all([lastPromise, unreadPromise]);

        return {
          ...conv,
          peer,
          peerReceipts,
          lastMessage: last ?? undefined,
          unread: count ?? 0,
          membership: {
            role: m.role,
            permissions: m.permissions ?? [],
            muted_until: m.muted_until,
            archived: m.archived,
            pinned: m.pinned,
            last_read_at: m.last_read_at,
            draft: m.draft,
          },
        } satisfies ConversationRow;
      }),
    );

    const cleaned = rows.filter((r): r is ConversationRow => Boolean(r?.id));
    cleaned.sort((a, b) => {
      if (a.membership?.pinned && !b.membership?.pinned) return -1;
      if (!a.membership?.pinned && b.membership?.pinned) return 1;
      return (b.lastMessage?.created_at ?? b.updated_at).localeCompare(
        a.lastMessage?.created_at ?? a.updated_at,
      );
    });
    set({ conversations: cleaned, loadingList: false });
  },
  loadMessages: async (conversationId, before) => {
    if (!hasSupabaseConfig()) return;
    set({ loadingMessages: true });
    const userId = useAuthStore.getState().userId;
    const supabase = createClient();
    let q = supabase
      .from('messages')
      .select('*, message_attachments(*), message_reactions(*)')
      .eq('conversation_id', conversationId)
      .or('scheduled_at.is.null,published_at.not.is.null')
      .order('created_at', { ascending: false })
      .limit(40);
    if (before) q = q.lt('created_at', before);
    const { data } = await q;
    const conv = get().conversations.find((c) => c.id === conversationId);
    const receipts = conv?.peerReceipts;
    const incoming = ((data ?? []) as Array<
      MessageRow & {
        message_attachments?: MessageRow['attachments'];
        message_reactions?: MessageRow['reactions'];
      }
    >)
      .reverse()
      .map((row) => {
        let localStatus: MessageRow['localStatus'] = 'sent';
        if (row.sender_id === userId && receipts?.read_receipts) {
          if (receipts.last_read_at && row.created_at <= receipts.last_read_at) localStatus = 'read';
          else if (receipts.last_delivered_at && row.created_at <= receipts.last_delivered_at) {
            localStatus = 'delivered';
          }
        } else if (row.sender_id === userId && !receipts?.read_receipts) {
          if (receipts?.last_delivered_at && row.created_at <= receipts.last_delivered_at) {
            localStatus = 'delivered';
          }
        }
        return {
          ...row,
          attachments: row.message_attachments ?? [],
          reactions: row.message_reactions ?? [],
          localStatus,
        };
      });
    set((s) => {
      const prev = s.messages[conversationId] ?? [];
      const merged = before ? [...incoming, ...prev] : incoming;
      const uniq = new Map(merged.map((m) => [m.id, m]));
      return {
        messages: { ...s.messages, [conversationId]: [...uniq.values()] },
        loadingMessages: false,
      };
    });
  },
  listenConversation: (conversationId) => {
    if (!hasSupabaseConfig()) return () => undefined;
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        void get().loadMessages(conversationId);
        void get().loadConversations();
      }, 350);
    };
    const topic = conversationChannelName(conversationId);
    const { release } = realtimeHub.acquire(topic, (channel) => {
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          () => scheduleReload(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'message_reactions' },
          () => {
            if (reloadTimer) clearTimeout(reloadTimer);
            reloadTimer = setTimeout(() => void get().loadMessages(conversationId), 350);
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversation_members',
            filter: `conversation_id=eq.${conversationId}`,
          },
          () => scheduleReload(),
        )
        .on('broadcast', { event: 'activity' }, ({ payload }) => {
          const p = payload as { userId?: string; kind?: string };
          if (!p.userId) return;
          set((s) => {
            const cur = new Set(s.typing[conversationId] ?? []);
            if (p.kind && p.kind !== 'off') cur.add(`${p.userId}:${p.kind}`);
            else {
              [...cur].forEach((x) => {
                if (x.startsWith(`${p.userId}:`)) cur.delete(x);
              });
            }
            return { typing: { ...s.typing, [conversationId]: [...cur] } };
          });
        });
    });
    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      release();
    };
  },
  sendText: async (conversationId, content, replyTo) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    const clientId = crypto.randomUUID();
    const optimistic: MessageRow = {
      id: clientId,
      conversation_id: conversationId,
      sender_id: userId,
      client_id: clientId,
      type: 'text',
      content,
      reply_to: replyTo ?? null,
      forwarded_from: null,
      metadata: {},
      edited_at: null,
      deleted_for_everyone: false,
      pinned: false,
      created_at: new Date().toISOString(),
      localStatus: 'sending',
    };
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] ?? []), optimistic],
      },
    }));
    const supabase = createClient();
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: userId,
      client_id: clientId,
      type: 'text',
      content,
      reply_to: replyTo ?? null,
    });
    if (error) {
      set((s) => ({
        messages: {
          ...s.messages,
          [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
            m.client_id === clientId ? { ...m, localStatus: 'failed' } : m,
          ),
        },
      }));
      return;
    }
    await get().setDraft(conversationId, '');
    await get().loadMessages(conversationId);
    const title = useAuthStore.getState().profile?.display_name ?? 'آریو';
    void fetch('/api/push/notify-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        title,
        body: content.slice(0, 180),
      }),
    }).catch(() => undefined);
  },
  editMessage: async (id, conversationId, content) => {
    const supabase = createClient();
    await supabase
      .from('messages')
      .update({ content, edited_at: new Date().toISOString() })
      .eq('id', id);
    await get().loadMessages(conversationId);
  },
  deleteForMe: async (id) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    await createClient().from('message_hides').insert({ message_id: id, user_id: userId });
  },
  deleteForEveryone: async (id) => {
    await createClient()
      .from('messages')
      .update({ deleted_for_everyone: true, content: null })
      .eq('id', id);
  },
  react: async (messageId, emoji) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('message_reactions')
      .select('emoji')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();
    if (data) {
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji);
    } else {
      await supabase.from('message_reactions').insert({ message_id: messageId, user_id: userId, emoji });
    }
  },
  pinMessage: async (id, pinned) => {
    await createClient().from('messages').update({ pinned }).eq('id', id);
  },
  markRead: async (conversationId) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    await createClient()
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString(), last_delivered_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  },
  setDraft: async (conversationId, draft) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    await createClient()
      .from('conversation_members')
      .update({ draft })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  },
  setTyping: (conversationId, kind) => {
    if (!hasSupabaseConfig()) return;
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    const topic = conversationChannelName(conversationId);
    void realtimeHub.send(topic, 'activity', { userId, kind }, (channel) => {
      // Ensure listeners exist if send races ahead of listenConversation.
      channel.on('broadcast', { event: 'activity' }, () => undefined);
    });
  },
  togglePinChat: async (conversationId, pinned) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    await createClient()
      .from('conversation_members')
      .update({ pinned, pinned_at: pinned ? new Date().toISOString() : null })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    await get().loadConversations();
  },
  toggleArchive: async (conversationId, archived) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    await createClient()
      .from('conversation_members')
      .update({ archived })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    await get().loadConversations();
  },
  toggleMute: async (conversationId, muted) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    await createClient()
      .from('conversation_members')
      .update({ muted_until: muted ? new Date(Date.now() + 10 * 365 * 86400000).toISOString() : null })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    await get().loadConversations();
  },
  openDirect: async (peerId) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return null;
    const supabase = createClient();

    const { data: blocked } = await supabase.rpc('is_blocked_either', {
      a: userId,
      b: peerId,
    });
    if (blocked) return null;

    const { data: convId, error } = await supabase.rpc('create_direct_conversation', {
      peer_id: peerId,
    });
    if (error || !convId) return null;
    await get().loadConversations();
    return convId as string;
  },
  retry: async (conversationId, clientId) => {
    const msg = (get().messages[conversationId] ?? []).find((m) => m.client_id === clientId);
    if (!msg?.content) return;
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] ?? []).filter((m) => m.client_id !== clientId),
      },
    }));
    await get().sendText(conversationId, msg.content, msg.reply_to);
  },
}));
