'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Avatar } from '@/components/ui/avatar';

type Person = { id: string; username: string; display_name: string; avatar_path: string | null };

export function CreateConversation({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const me = useAuthStore((s) => s.userId);
  const openDirect = useChatStore((s) => s.openDirect);
  const [tab, setTab] = useState<'dm' | 'group' | 'channel'>('dm');
  const [people, setPeople] = useState<Person[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void createClient()
      .from('profiles')
      .select('id,username,display_name,avatar_path')
      .eq('status', 'active')
      .then(({ data }) => setPeople((data ?? []).filter((p) => p.id !== me)));
  }, [open, me]);

  async function startDm(id: string) {
    setBusy(true);
    const conv = await openDirect(id);
    setBusy(false);
    onClose();
    if (conv) router.push(`/c/${conv}`);
  }

  async function createRoom(type: 'group' | 'channel') {
    if (!me || !title.trim() || picked.length === 0) return;
    setBusy(true);
    const supabase = createClient();
    const { data: conv } = await supabase
      .from('conversations')
      .insert({
        type,
        title: title.trim(),
        created_by: me,
        invite_token: crypto.randomUUID().replace(/-/g, '').slice(0, 12),
      })
      .select('id')
      .single();
    if (conv) {
      await supabase.from('conversation_members').insert([
        { conversation_id: conv.id, user_id: me, role: 'owner' },
        ...picked.map((id) => ({
          conversation_id: conv.id,
          user_id: id,
          role: type === 'channel' ? 'subscriber' : 'member',
        })),
      ]);
      router.push(`/c/${conv.id}`);
    }
    setBusy(false);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="گفتگوی تازه">
      <div className="mb-3 flex gap-2">
        {(['dm', 'group', 'channel'] as const).map((k) => (
          <button
            key={k}
            className={`ario-btn ${tab === k ? 'ario-btn-primary' : 'ario-btn-ghost'}`}
            onClick={() => setTab(k)}
          >
            {k === 'dm' ? 'خصوصی' : k === 'group' ? 'گروه' : 'کانال'}
          </button>
        ))}
      </div>
      {tab !== 'dm' ? (
        <input
          className="ario-field mb-3"
          placeholder="عنوان"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      ) : null}
      <div className="max-h-72 space-y-1 overflow-auto">
        {people.map((p) => (
          <button
            key={p.id}
            className="flex w-full items-center gap-3 rounded-ario px-2 py-2 hover:bg-accent-soft"
            onClick={() => {
              if (tab === 'dm') void startDm(p.id);
              else setPicked((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]));
            }}
          >
            <Avatar name={p.display_name} path={p.avatar_path} size={40} />
            <div className="flex-1 text-right">
              <div className="font-semibold">{p.display_name}</div>
              <div className="ltr-isolate text-xs text-muted">@{p.username}</div>
            </div>
            {tab !== 'dm' && picked.includes(p.id) ? <span className="text-accent">✓</span> : null}
          </button>
        ))}
      </div>
      {tab !== 'dm' ? (
        <button
          className="ario-btn ario-btn-primary mt-4 w-full"
          disabled={busy}
          onClick={() => void createRoom(tab)}
        >
          ساخت
        </button>
      ) : null}
    </BottomSheet>
  );
}
