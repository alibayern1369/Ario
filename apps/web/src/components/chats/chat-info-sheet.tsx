'use client';

import { useEffect, useState } from 'react';
import { canModerate, hasPermission } from '@ario/shared';
import { createClient } from '@/lib/supabase/client';
import { useChatStore, titleOf } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { signedUrl } from '@/lib/storage/client';
import { useToastStore } from '@/stores/toast-store';

type Tab = 'media' | 'files' | 'links' | 'voice' | 'pinned' | 'members';

export function ChatInfoSheet({
  conversationId,
  open,
  onClose,
}: {
  conversationId: string;
  open: boolean;
  onClose: () => void;
}) {
  const conv = useChatStore((s) => s.conversations.find((c) => c.id === conversationId));
  const me = useAuthStore((s) => s.userId);
  const toggleMute = useChatStore((s) => s.toggleMute);
  const togglePin = useChatStore((s) => s.togglePinChat);
  const toggleArchive = useChatStore((s) => s.toggleArchive);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const [tab, setTab] = useState<Tab>('media');
  const [items, setItems] = useState<Array<{ id: string; label: string; href?: string }>>([]);
  const [members, setMembers] = useState<
    Array<{ user_id: string; role: string; display_name: string }>
  >([]);
  const [people, setPeople] = useState<Array<{ id: string; display_name: string; username: string }>>(
    [],
  );
  const [q, setQ] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);

  const role = conv?.membership?.role ?? 'member';
  const perms = conv?.membership?.permissions ?? [];
  const canAdd = hasPermission(role, perms, 'add_members');
  const canRemove = hasPermission(role, perms, 'remove_members');
  const canManage = hasPermission(role, perms, 'manage_permissions') || role === 'owner';

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const supabase = createClient();
      if (tab === 'members') {
        const { data } = await supabase
          .from('conversation_members')
          .select('user_id,role,profiles(display_name)')
          .eq('conversation_id', conversationId);
        setMembers(
          (data ?? []).map((m) => ({
            user_id: m.user_id,
            role: m.role,
            display_name:
              (m as unknown as { profiles?: { display_name: string } | { display_name: string }[] })
                .profiles && !Array.isArray((m as unknown as { profiles?: unknown }).profiles)
                ? (m as unknown as { profiles: { display_name: string } }).profiles.display_name
                : Array.isArray((m as unknown as { profiles?: { display_name: string }[] }).profiles)
                  ? (m as unknown as { profiles: { display_name: string }[] }).profiles[0]
                      ?.display_name ?? ''
                  : '',
          })),
        );
        if (canAdd) {
          const { data: all } = await supabase
            .from('profiles')
            .select('id,display_name,username')
            .eq('status', 'active')
            .limit(50);
          setPeople((all ?? []).filter((p) => p.id !== me));
        }
        return;
      }
      const { data } = await supabase
        .from('messages')
        .select('id,content,type,pinned,message_attachments(*)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(80);
      const rows = [];
      for (const m of data ?? []) {
        if (tab === 'pinned' && m.pinned) rows.push({ id: m.id, label: m.content ?? 'پیام سنجاق‌شده' });
        if (tab === 'links' && m.content?.includes('http')) rows.push({ id: m.id, label: m.content });
        const atts =
          (
            m as {
              message_attachments?: Array<{
                id: string;
                mime: string;
                path: string;
                bucket: string;
                original_name: string | null;
              }>;
            }
          ).message_attachments ?? [];
        for (const a of atts) {
          if (tab === 'media' && (a.mime.startsWith('image/') || a.mime.startsWith('video/'))) {
            const href = await signedUrl(a.bucket, a.path);
            rows.push({ id: a.id, label: a.original_name ?? 'رسانه', href: href ?? undefined });
          }
          if (
            tab === 'files' &&
            !a.mime.startsWith('image/') &&
            !a.mime.startsWith('video/') &&
            !a.mime.startsWith('audio/')
          ) {
            rows.push({ id: a.id, label: a.original_name ?? 'پرونده' });
          }
          if (tab === 'voice' && a.mime.startsWith('audio/')) rows.push({ id: a.id, label: 'پیام صوتی' });
        }
      }
      setItems(rows.filter((r) => !q || r.label.includes(q)));
    })();
  }, [open, tab, conversationId, q, canAdd, me]);

  async function leave() {
    if (!me) return;
    const { error } = await createClient().rpc('remove_conversation_member', {
      conv: conversationId,
      target: me,
    });
    if (error) {
      useToastStore.getState().push(error.message.includes('owner') ? 'مالک نمی‌تواند ترک کند.' : 'ترک ممکن نشد.');
      return;
    }
    await loadConversations();
    onClose();
  }

  async function removeMember(userId: string) {
    const { error } = await createClient().rpc('remove_conversation_member', {
      conv: conversationId,
      target: userId,
    });
    if (error) useToastStore.getState().push('حذف عضو ممکن نشد.');
    else setTab('members');
  }

  async function addMember(userId: string) {
    const { error } = await createClient().rpc('add_conversation_members', {
      conv: conversationId,
      member_ids: [userId],
      as_role: conv?.type === 'channel' ? 'subscriber' : 'member',
    });
    if (error) useToastStore.getState().push('افزودن عضو ممکن نشد.');
    else setTab('members');
  }

  async function setRole(userId: string, newRole: 'admin' | 'member' | 'subscriber') {
    const { error } = await createClient().rpc('set_member_role', {
      conv: conversationId,
      target: userId,
      new_role: newRole,
    });
    if (error) useToastStore.getState().push('تغییر نقش ممکن نشد.');
    else setTab('members');
  }

  async function copyInvite() {
    if (!conv?.invite_token) return;
    const url = `${window.location.origin}/join/${conv.invite_token}`;
    await navigator.clipboard.writeText(url);
    setInviteCopied(true);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={conv ? titleOf(conv) : 'اطلاعات گفتگو'}>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          className="ario-btn ario-btn-ghost"
          onClick={() => void toggleMute(conversationId, !conv?.membership?.muted_until)}
        >
          {conv?.membership?.muted_until ? 'باصدا' : 'بی‌صدا'}
        </button>
        <button
          className="ario-btn ario-btn-ghost"
          onClick={() => void togglePin(conversationId, !conv?.membership?.pinned)}
        >
          {conv?.membership?.pinned ? 'برداشتن سنجاق' : 'سنجاق گفتگو'}
        </button>
        <button
          className="ario-btn ario-btn-ghost"
          onClick={() => void toggleArchive(conversationId, !conv?.membership?.archived)}
        >
          بایگانی
        </button>
        {conv?.type !== 'saved' && conv?.type !== 'direct' && conv?.invite_token ? (
          <button className="ario-btn ario-btn-ghost" onClick={() => void copyInvite()}>
            {inviteCopied ? 'کپی شد' : 'لینک دعوت'}
          </button>
        ) : null}
        {conv?.type !== 'saved' && conv?.type !== 'direct' ? (
          <button className="ario-btn ario-btn-ghost text-[var(--ario-danger)]" onClick={() => void leave()}>
            ترک
          </button>
        ) : null}
      </div>
      <input
        className="ario-field mb-3"
        placeholder="جستجو در رسانه و پیام‌ها"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {(['media', 'files', 'links', 'voice', 'pinned', 'members'] as Tab[]).map((k) => (
          <button
            key={k}
            className={`ario-btn ${tab === k ? 'ario-btn-primary' : 'ario-btn-ghost'}`}
            onClick={() => setTab(k)}
          >
            {k === 'media'
              ? 'رسانه'
              : k === 'files'
                ? 'پرونده'
                : k === 'links'
                  ? 'پیوند'
                  : k === 'voice'
                    ? 'صدا'
                    : k === 'pinned'
                      ? 'سنجاق'
                      : 'اعضا'}
          </button>
        ))}
      </div>
      {tab === 'members' ? (
        <div className="space-y-3">
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {m.display_name}{' '}
                  <span className="text-muted">({m.role})</span>
                </span>
                <div className="flex gap-1">
                  {canManage && m.role !== 'owner' && m.user_id !== me ? (
                    <button
                      className="ario-btn ario-btn-ghost px-2 text-xs"
                      onClick={() =>
                        void setRole(m.user_id, m.role === 'admin' ? 'member' : 'admin')
                      }
                    >
                      {m.role === 'admin' ? 'عزل' : 'ارتقاء'}
                    </button>
                  ) : null}
                  {canRemove && m.role !== 'owner' && m.user_id !== me ? (
                    <button
                      className="ario-btn ario-btn-ghost px-2 text-xs text-[var(--ario-danger)]"
                      onClick={() => void removeMember(m.user_id)}
                    >
                      حذف
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {canAdd ? (
            <div>
              <div className="mb-1 text-xs text-muted">افزودن عضو</div>
              <ul className="max-h-40 space-y-1 overflow-auto">
                {people
                  .filter((p) => !members.some((m) => m.user_id === p.id))
                  .filter((p) => !q || p.display_name.includes(q) || p.username.includes(q))
                  .map((p) => (
                    <li key={p.id}>
                      <button
                        className="flex w-full justify-between rounded-xl px-2 py-2 text-sm hover:bg-accent-soft"
                        onClick={() => void addMember(p.id)}
                      >
                        <span>{p.display_name}</span>
                        <span className="ltr-isolate text-xs text-muted">@{p.username}</span>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
          {!canModerate(role) && conv?.type !== 'direct' ? (
            <p className="text-xs text-muted">فقط مدیران می‌توانند اعضا را مدیریت کنند.</p>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id}>
              {i.href ? (
                <a href={i.href} className="text-sm underline" target="_blank" rel="noreferrer">
                  {i.label}
                </a>
              ) : (
                <span className="text-sm">{i.label}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}
