'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useChatStore, titleOf } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { signedUrl } from '@/lib/storage/client';

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
  const [tab, setTab] = useState<Tab>('media');
  const [items, setItems] = useState<Array<{ id: string; label: string; href?: string }>>([]);
  const [members, setMembers] = useState<Array<{ user_id: string; role: string; display_name: string }>>([]);
  const [q, setQ] = useState('');

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
                  ? (m as unknown as { profiles: { display_name: string }[] }).profiles[0]?.display_name ?? ''
                  : '',
          })),
        );
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
        const atts = (m as { message_attachments?: Array<{ id: string; mime: string; path: string; bucket: string; original_name: string | null }> }).message_attachments ?? [];
        for (const a of atts) {
          if (tab === 'media' && (a.mime.startsWith('image/') || a.mime.startsWith('video/'))) {
            const href = await signedUrl(a.bucket, a.path);
            rows.push({ id: a.id, label: a.original_name ?? 'رسانه', href: href ?? undefined });
          }
          if (tab === 'files' && !a.mime.startsWith('image/') && !a.mime.startsWith('video/') && !a.mime.startsWith('audio/')) {
            rows.push({ id: a.id, label: a.original_name ?? 'پرونده' });
          }
          if (tab === 'voice' && a.mime.startsWith('audio/')) rows.push({ id: a.id, label: 'پیام صوتی' });
        }
      }
      setItems(rows.filter((r) => !q || r.label.includes(q)));
    })();
  }, [open, tab, conversationId, q]);

  async function leave() {
    if (!me) return;
    await createClient()
      .from('conversation_members')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', me);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={conv ? titleOf(conv) : 'اطلاعات گفتگو'}>
      <div className="mb-3 flex flex-wrap gap-2">
        <button className="ario-btn ario-btn-ghost" onClick={() => void toggleMute(conversationId, !conv?.membership?.muted_until)}>
          {conv?.membership?.muted_until ? 'باصدا' : 'بی‌صدا'}
        </button>
        <button className="ario-btn ario-btn-ghost" onClick={() => void togglePin(conversationId, !conv?.membership?.pinned)}>
          {conv?.membership?.pinned ? 'برداشتن سنجاق' : 'سنجاق گفتگو'}
        </button>
        <button className="ario-btn ario-btn-ghost" onClick={() => void toggleArchive(conversationId, !conv?.membership?.archived)}>
          بایگانی
        </button>
        {conv?.type !== 'saved' && conv?.type !== 'direct' ? (
          <button className="ario-btn ario-btn-ghost text-[var(--ario-danger)]" onClick={() => void leave()}>
            ترک
          </button>
        ) : null}
      </div>
      <input className="ario-field mb-3" placeholder="جستجو در رسانه و پیام‌ها" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {(['media', 'files', 'links', 'voice', 'pinned', 'members'] as Tab[]).map((k) => (
          <button key={k} className={`ario-btn ${tab === k ? 'ario-btn-primary' : 'ario-btn-ghost'}`} onClick={() => setTab(k)}>
            {k === 'media' ? 'رسانه' : k === 'files' ? 'پرونده' : k === 'links' ? 'پیوند' : k === 'voice' ? 'صدا' : k === 'pinned' ? 'سنجاق' : 'اعضا'}
          </button>
        ))}
      </div>
      {tab === 'members' ? (
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.user_id} className="flex justify-between text-sm">
              <span>{m.display_name}</span>
              <span className="text-muted">{m.role}</span>
            </li>
          ))}
        </ul>
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
