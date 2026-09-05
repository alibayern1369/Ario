'use client';

import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';
import { useAuthStore } from '@/stores/auth-store';

export default function SettingsPage() {
  const signOut = useAuthStore((s) => s.signOut);
  const profile = useAuthStore((s) => s.profile);
  const staff = profile?.role === 'admin' || profile?.role === 'owner';
  const links = [
    ['/me', 'حساب و پروفایل'],
    ['/settings/privacy', 'حریم خصوصی'],
    ['/settings/security', 'امنیت و نشست‌ها'],
    ['/settings/notifications', 'اعلان‌ها'],
    ['/settings/appearance', 'ظاهر و زبان'],
  ] as const;
  return (
    <AppShell sidebar={<ChatList />}>
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">تنظیمات</h1>
        <div className="space-y-2">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="block rounded-ario bg-[var(--ario-surface-solid)] px-4 py-3">
              {label}
            </Link>
          ))}
          {staff ? (
            <Link href="/admin" className="block rounded-ario bg-[var(--ario-surface-solid)] px-4 py-3">
              پنل مدیریت
            </Link>
          ) : null}
          <button className="ario-btn ario-btn-ghost w-full" onClick={() => void signOut().then(() => (window.location.href = '/login'))}>
            خروج
          </button>
        </div>
      </div>
    </AppShell>
  );
}
