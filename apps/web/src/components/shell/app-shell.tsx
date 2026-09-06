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

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' || pathname.startsWith('/c/') : pathname.startsWith(href);
}

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
    <div className="mx-auto flex min-h-[100dvh] max-w-[1600px] bg-bg">
      <nav
        className="glass-subtle sticky top-0 z-30 hidden h-[100dvh] w-nav-rail shrink-0 flex-col items-stretch gap-1 border-l border-[var(--ario-line)] px-2 py-4 md:flex"
        aria-label="main"
      >
        <div className="flex flex-1 flex-col items-stretch gap-1">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="ario-rail-item"
                data-active={active}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
                <span>{t(item.key)}</span>
              </Link>
            );
          })}
        </div>
        <Link
          href="/admin"
          className="ario-rail-item border-t border-[var(--ario-line)] pt-2"
          data-active={pathname.startsWith('/admin')}
          aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
        >
          <Shield size={22} strokeWidth={pathname.startsWith('/admin') ? 2.25 : 1.75} />
          <span>{staff ? t('admin') : 'مدیریت'}</span>
        </Link>
      </nav>

      {sidebar ? (
        <aside className="hidden h-[100dvh] w-chat-list shrink-0 flex-col border-l border-[var(--ario-line)] md:flex">
          {sidebar}
        </aside>
      ) : null}

      <main className="relative min-w-0 flex-1">{children}</main>

      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
        aria-label="main"
      >
        <div className="glass-medium pointer-events-auto flex w-full max-w-lg justify-around gap-0.5 rounded-ario-xl border border-[var(--ario-glass-border)] px-1 py-1 shadow-ario">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="ario-nav-item"
                data-active={active}
                aria-current={active ? 'page' : undefined}
              >
                <span className="ario-nav-icon-wrap">
                  <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
                </span>
                <span>{t(item.key)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
