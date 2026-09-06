'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';

type HealthBody = Record<string, unknown>;
type Json = Record<string, unknown>;

export default function AdminOpsPage() {
  const [health, setHealth] = useState<HealthBody | null>(null);
  const [turn, setTurn] = useState<Json | null>(null);
  const [push, setPush] = useState<Json | null>(null);
  const [cron, setCron] = useState<Json | null>(null);
  const [pushTest, setPushTest] = useState<Json | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const [h, t, p, c] = await Promise.all([
        fetch('/api/health?verbose=1').then((r) => r.json()),
        fetch('/api/debug/turn').then((r) => r.json()),
        fetch('/api/debug/push').then((r) => r.json()),
        fetch('/api/debug/cron').then((r) => r.json()),
      ]);
      setHealth(h);
      setTurn(t);
      setPush(p);
      setCron(c);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runPushTest() {
    setBusy(true);
    try {
      const res = await fetch('/api/debug/push', { method: 'POST' });
      setPushTest(await res.json());
      setPush(await fetch('/api/debug/push').then((r) => r.json()));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell sidebar={<ChatList />}>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">سلامت و دیباگ عملیاتی</h1>
            <p className="mt-1 text-sm text-soft">
              وضعیت پیکربندی — نه ادعای آماده بودن production برای تماس/اعلان تا وقتی تست دوکاربره پاس شود.
            </p>
          </div>
          <button className="ario-btn ario-btn-ghost" disabled={busy} onClick={() => void refresh()}>
            تازه‌سازی
          </button>
        </div>

        <section className="space-y-2 rounded-ario bg-[var(--ario-surface-solid)] p-4">
          <h2 className="font-bold">Health</h2>
          <pre className="overflow-x-auto text-xs text-soft">{JSON.stringify(health, null, 2)}</pre>
        </section>

        <section className="space-y-2 rounded-ario bg-[var(--ario-surface-solid)] p-4">
          <h2 className="font-bold">TURN</h2>
          <pre className="overflow-x-auto text-xs text-soft">{JSON.stringify(turn, null, 2)}</pre>
          <p className="text-sm text-soft">
            برای ICE واقعی از مرورگر واردشده <code>GET /api/turn</code> را بزنید؛ سپس تماس دوکاربره را در{' '}
            <code>ARIO_VERIFICATION.md</code> ثبت کنید.
          </p>
        </section>

        <section className="space-y-2 rounded-ario bg-[var(--ario-surface-solid)] p-4">
          <h2 className="font-bold">Web Push</h2>
          <pre className="overflow-x-auto text-xs text-soft">{JSON.stringify(push, null, 2)}</pre>
          <button className="ario-btn ario-btn-primary" disabled={busy} onClick={() => void runPushTest()}>
            ارسال اعلان تست به خودم
          </button>
          {pushTest ? (
            <pre className="overflow-x-auto text-xs text-soft">{JSON.stringify(pushTest, null, 2)}</pre>
          ) : null}
        </section>

        <section className="space-y-2 rounded-ario bg-[var(--ario-surface-solid)] p-4">
          <h2 className="font-bold">Cron</h2>
          <pre className="overflow-x-auto text-xs text-soft">{JSON.stringify(cron, null, 2)}</pre>
        </section>

        <p className="text-sm text-muted">
          راهنما: <code>docs/fa/MIGRATIONS.md</code> و <code>docs/fa/OPS.md</code> و ماتریس{' '}
          <code>ARIO_VERIFICATION.md</code>
        </p>
      </div>
    </AppShell>
  );
}

