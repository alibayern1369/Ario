'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';
import { useAuthStore } from '@/stores/auth-store';

export default function SettingsPage() {
  const signOut = useAuthStore((s) => s.signOut);
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const staff = profile?.role === 'admin' || profile?.role === 'owner';
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const links = [
    ['/me', 'حساب و پروفایل'],
    ['/settings/privacy', 'حریم خصوصی'],
    ['/settings/security', 'امنیت و نشست‌ها'],
    ['/settings/notifications', 'اعلان‌ها'],
    ['/settings/appearance', 'ظاهر و زبان'],
  ] as const;

  async function claimOwner() {
    setBootstrapError(null);
    setBootstrapping(true);
    try {
      const res = await fetch('/api/admin/bootstrap-owner', { method: 'POST' });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setBootstrapError(
          body?.error === 'owner_exists'
            ? 'مالک دیگری از قبل وجود دارد.'
            : body?.error ?? 'فعال‌سازی پنل ممکن نشد.',
        );
        return;
      }
      await refreshProfile();
      window.location.assign('/admin');
    } finally {
      setBootstrapping(false);
    }
  }

  return (
    <AppShell sidebar={<ChatList />}>
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">تنظیمات</h1>
        {staff ? (
          <Link
            href="/admin"
            className="mb-4 flex items-center gap-3 rounded-ario border border-accent/30 bg-accent/10 px-4 py-4 text-accent transition hover:bg-accent/15"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-ario bg-accent text-[var(--ario-bg)]">
              <Shield size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">پنل مدیریت</span>
              <span className="block text-sm text-soft">کاربران، تنظیمات سیستم و گزارش‌ها</span>
            </span>
            <span className="text-sm font-semibold">باز کردن</span>
          </Link>
        ) : (
          <div className="mb-4 rounded-ario border border-[var(--ario-line)] bg-[var(--ario-surface-solid)] px-4 py-4">
            <p className="text-sm text-soft">
              اگر اولین حساب سامانه هستید و پنل مدیریت باز نمی‌شود، از اینجا مالکیت را فعال کنید.
            </p>
            <button
              type="button"
              className="ario-btn ario-btn-primary mt-3 w-full"
              disabled={bootstrapping}
              onClick={() => void claimOwner()}
            >
              {bootstrapping ? 'در حال فعال‌سازی…' : 'فعال‌سازی پنل مدیریت'}
            </button>
            {bootstrapError ? <p className="mt-2 text-sm text-[var(--ario-danger)]">{bootstrapError}</p> : null}
          </div>
        )}
        <div className="space-y-2">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="block rounded-ario bg-[var(--ario-surface-solid)] px-4 py-3">
              {label}
            </Link>
          ))}
          <button
            className="ario-btn ario-btn-ghost w-full"
            onClick={() => void signOut().then(() => (window.location.href = '/login'))}
          >
            خروج
          </button>
        </div>
      </div>
    </AppShell>
  );
}
