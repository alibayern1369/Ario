'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';
import { createClient } from '@/lib/supabase/client';
import { usePresenceStore } from '@/stores/presence-store';

export default function AdminHome() {
  const online = usePresenceStore((s) => s.onlineIds.length);
  const [stats, setStats] = useState({ users: 0, groups: 0, channels: 0, reports: 0, messages: 0 });

  useEffect(() => {
    const supabase = createClient();
    void Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('type', 'group'),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('type', 'channel'),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
    ]).then(([u, g, c, r, m]) => {
      setStats({
        users: u.count ?? 0,
        groups: g.count ?? 0,
        channels: c.count ?? 0,
        reports: r.count ?? 0,
        messages: m.count ?? 0,
      });
    });
  }, []);

  const cards = [
    ['کاربران', stats.users],
    ['آنلاین', online],
    ['گروه', stats.groups],
    ['کانال', stats.channels],
    ['پیام‌ها', stats.messages],
    ['گزارش باز', stats.reports],
  ] as const;

  return (
    <AppShell sidebar={<ChatList />}>
      <div className="px-4 py-8">
        <h1 className="text-2xl font-bold">پنل مدیریت</h1>
        <p className="mt-1 text-sm text-soft">مدیران به متن گفتگوهای خصوصی دسترسی ندارند.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {cards.map(([l, v]) => (
            <div key={l} className="rounded-ario bg-[var(--ario-surface-solid)] p-4">
              <div className="text-sm text-muted">{l}</div>
              <div className="text-2xl font-bold">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-2 md:grid-cols-2">
          {[
            ['/admin/users', 'کاربران'],
            ['/admin/groups', 'گروه‌ها و کانال‌ها'],
            ['/admin/reports', 'گزارش‌ها'],
            ['/admin/settings', 'تنظیمات سیستم'],
            ['/admin/landing', 'محتوای وب‌سایت'],
            ['/admin/audit', 'گزارش فعالیت'],
          ].map(([href, label]) =>
            href && label ? (
              <Link key={href} href={href} className="rounded-ario bg-[var(--ario-surface-solid)] px-4 py-3">
                {label}
              </Link>
            ) : null,
          )}
        </div>
      </div>
    </AppShell>
  );
}
