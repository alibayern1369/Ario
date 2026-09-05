'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';
import { EmptyState } from '@/components/ui/empty-state';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime, formatDuration } from '@/lib/format';
import { useAuthStore } from '@/stores/auth-store';
import { useCallStore } from '@/stores/call-store';

type Row = {
  call_id: string;
  outcome: 'incoming' | 'outgoing' | 'missed';
  calls: {
    id: string;
    kind: 'audio' | 'video';
    started_at: string;
    duration_seconds: number | null;
    initiator_id: string | null;
  } | null;
};

export default function CallsPage() {
  const me = useAuthStore((s) => s.userId);
  const start = useCallStore((s) => s.start);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!me) return;
    void createClient()
      .from('call_participants')
      .select('call_id,outcome,calls(*)')
      .eq('user_id', me)
      .then(({ data }) => setRows((data ?? []) as unknown as Row[]));
  }, [me]);

  return (
    <AppShell sidebar={<ChatList />}>
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">تماس‌ها</h1>
        {rows.length === 0 ? (
          <EmptyState title="هنوز تماسی ثبت نشده." />
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.call_id} className="flex items-center justify-between rounded-ario bg-[var(--ario-surface-solid)] p-3">
                <div>
                  <div className="font-semibold">
                    {r.outcome === 'missed' ? 'از دست‌رفته' : r.outcome === 'incoming' ? 'ورودی' : 'خروجی'} ·{' '}
                    {r.calls?.kind === 'video' ? 'تصویری' : 'صوتی'}
                  </div>
                  <div className="text-xs text-muted">
                    {r.calls ? formatDateTime(r.calls.started_at) : ''}{' '}
                    {r.calls?.duration_seconds ? `· ${formatDuration(r.calls.duration_seconds)}` : ''}
                  </div>
                </div>
                {r.calls?.initiator_id ? (
                  <button
                    className="ario-btn ario-btn-ghost"
                    onClick={() =>
                      void start({
                        peerId: r.calls!.initiator_id!,
                        peerName: 'تماس',
                        kind: r.calls!.kind,
                      })
                    }
                  >
                    تماس دوباره
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
