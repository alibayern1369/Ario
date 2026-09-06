'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowRight,
  FileText,
  Flag,
  HeartPulse,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
  UsersRound,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

const links = [
  { href: '/admin', label: 'داشبورد', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'کاربران', icon: Users },
  { href: '/admin/groups', label: 'گروه و کانال', icon: UsersRound },
  { href: '/admin/reports', label: 'گزارش‌ها', icon: Flag },
  { href: '/admin/settings', label: 'تنظیمات سیستم', icon: Settings },
  { href: '/admin/ops', label: 'سلامت سامانه', icon: HeartPulse },
  { href: '/admin/landing', label: 'وب‌سایت', icon: FileText },
  { href: '/admin/audit', label: 'گزارش مدیران', icon: Shield },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const profile = useAuthStore((s) => s.profile);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col bg-bg md:flex-row">
      <aside className="glass-subtle sticky top-0 z-30 border-b border-[var(--ario-line)] md:h-[100dvh] md:w-56 md:shrink-0 md:border-b-0 md:border-l">
        <div className="flex items-center justify-between gap-2 px-ario-4 py-ario-3 md:flex-col md:items-stretch md:gap-3 md:py-ario-4">
          <div className="min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
            >
              <ArrowRight size={16} />
              بازگشت به آریو
            </Link>
            <h1 className="mt-1 truncate text-lg font-bold">پنل مدیریت</h1>
            {profile ? (
              <p className="truncate text-xs text-muted">
                {profile.display_name}
                <span className="ltr-isolate"> · {profile.role}</span>
              </p>
            ) : null}
          </div>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible md:px-2 md:pb-4"
          aria-label="admin"
        >
          {links.map((item) => {
            const active = isActive(pathname, item.href, 'exact' in item ? item.exact : false);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-2 rounded-ario px-3 py-2 text-sm text-muted transition hover:bg-[var(--ario-accent-soft)] hover:text-accent data-[active=true]:bg-[var(--ario-accent-soft)] data-[active=true]:font-semibold data-[active=true]:text-accent"
                data-active={active}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 pb-8">{children}</main>
    </div>
  );
}
