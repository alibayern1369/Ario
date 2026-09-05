'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';
import { Avatar } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useCallStore } from '@/stores/call-store';

type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  bio: string;
};

export default function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const me = useAuthStore((s) => s.userId);
  const openDirect = useChatStore((s) => s.openDirect);
  const start = useCallStore((s) => s.start);
  const router = useRouter();
  const [p, setP] = useState<Profile | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    void createClient()
      .from('profiles')
      .select('id,username,display_name,avatar_path,bio')
      .eq('username', username)
      .maybeSingle()
      .then(({ data }) => setP(data));
  }, [username]);

  if (!p) return <AppShell sidebar={<ChatList />}>{null}</AppShell>;

  return (
    <AppShell sidebar={<ChatList />}>
      <div className="mx-auto max-w-lg px-4 py-8">
        <Avatar name={p.display_name} path={p.avatar_path} size={88} />
        <h1 className="mt-4 text-2xl font-bold">{p.display_name}</h1>
        <p className="ltr-isolate text-muted">@{p.username}</p>
        <p className="mt-3 text-soft">{p.bio || 'بدون معرفی'}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className="ario-btn ario-btn-primary"
            onClick={async () => {
              const id = await openDirect(p.id);
              if (id) router.push(`/c/${id}`);
            }}
          >
            پیام
          </button>
          <button className="ario-btn ario-btn-ghost" onClick={() => void start({ peerId: p.id, peerName: p.display_name, kind: 'audio' })}>
            تماس
          </button>
          <button className="ario-btn ario-btn-ghost" onClick={() => void start({ peerId: p.id, peerName: p.display_name, kind: 'video' })}>
            تصویری
          </button>
          <button
            className="ario-btn ario-btn-ghost"
            onClick={async () => {
              if (!me) return;
              if (blocked) {
                await createClient().from('blocks').delete().eq('blocker_id', me).eq('blocked_id', p.id);
                setBlocked(false);
              } else {
                await createClient().from('blocks').insert({ blocker_id: me, blocked_id: p.id });
                setBlocked(true);
              }
            }}
          >
            {blocked ? 'رفع انسداد' : 'مسدود'}
          </button>
        </div>
        <form
          className="mt-6 space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!me) return;
            await createClient().from('reports').insert({
              reporter_id: me,
              target_user_id: p.id,
              reason: reason || 'گزارش کاربر',
            });
            setReason('');
          }}
        >
          <input className="ario-field" placeholder="گزارش این کاربر" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="ario-btn ario-btn-ghost">ارسال گزارش</button>
        </form>
      </div>
    </AppShell>
  );
}
