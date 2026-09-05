'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, Users, Phone, LayoutGrid, Settings, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';

const items = [
  { href: '/', key: 'chats', icon: MessageCircle },
  { href: '/people', key: 'people', icon: Users },
  { href: '/calls', key: 'calls', icon: Phone },
  { href: '/services', key: 'services', icon: LayoutGrid },
  { href: '/settings', key: 'settings', icon: Settings },
] as const;

export function AppShell({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const role = useAuthStore((s) => s.profile?.role);
  const staff = role === 'admin' || role === 'owner';

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[1400px] bg-bg">
      <aside className="hidden w-[360px] shrink-0 flex-col border-l border-[var(--ario-line)] md:flex">
        {sidebar}
      </aside>
      <main className="relative min-w-0 flex-1">{children}</main>
      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex justify-around px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1 md:hidden">
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[56px] flex-col items-center gap-0.5 text-[11px] ${active ? 'text-accent' : 'text-muted'}`}
            >
              <Icon size={22} />
              {t(item.key)}
            </Link>
          );
        })}
        {staff ? (
          <Link
            href="/admin"
            className={`flex min-w-[56px] flex-col items-center gap-0.5 text-[11px] ${pathname.startsWith('/admin') ? 'text-accent' : 'text-muted'}`}
          >
            <Shield size={22} />
            {t('admin')}
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
