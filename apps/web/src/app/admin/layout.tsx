'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { AdminShell } from '@/components/shell/admin-shell';
import { useAuthStore } from '@/stores/auth-store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const ready = useAuthStore((s) => s.ready);
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const staff = profile?.role === 'admin' || profile?.role === 'owner';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !profile) void refreshProfile();
  }, [ready, profile, refreshProfile]);

  async function claimOwner() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/bootstrap-owner', { method: 'POST' });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(
          body?.error === 'owner_exists'
            ? 'مالک دیگری از قبل وجود دارد. از او بخواهید نقش ادمین به شما بدهد.'
            : body?.error ?? 'فعال‌سازی ممکن نشد.',
        );
        return;
      }
      await refreshProfile();
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <div className="skeleton min-h-[100dvh]" />;
  }

  if (!staff) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-ario bg-accent text-[var(--ario-bg)]">
          <Shield size={24} />
        </div>
        <h1 className="text-2xl font-bold">پنل مدیریت</h1>
        <p className="mt-2 text-sm text-soft">
          برای باز شدن تنظیمات باید نقش شما مالک یا مدیر باشد. اگر اولین حساب سامانه هستید، مالکیت را فعال کنید.
        </p>
        <button
          type="button"
          className="ario-btn ario-btn-primary mt-6 w-full"
          disabled={busy}
          onClick={() => void claimOwner()}
        >
          {busy ? 'در حال فعال‌سازی…' : 'فعال‌سازی پنل مدیریت'}
        </button>
        {error ? <p className="mt-3 text-sm text-[var(--ario-danger)]">{error}</p> : null}
        <Link href="/" className="mt-4 text-center text-sm text-accent">
          بازگشت به گفتگوها
        </Link>
      </main>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
