import type { ServiceModule } from '@ario/shared';

export const SERVICE_CATALOG: ServiceModule[] = [
  {
    id: 'attendance',
    title: 'Attendance',
    titleFa: 'حضور و غیاب',
    descriptionFa: 'ثبت ورود و خروج اعضای مجموعه. هنوز پیاده‌سازی نشده؛ فقط جایگاه ماژول است.',
    icon: 'calendar',
    href: '/services/attendance',
    enabled: false,
  },
  {
    id: 'tasks',
    title: 'Tasks',
    titleFa: 'وظایف',
    descriptionFa: 'تخته وظایف سازمانی. هسته پیام‌رسان بازنویسی نمی‌شود.',
    icon: 'check',
    href: '/services/tasks',
    enabled: false,
  },
  {
    id: 'files',
    title: 'Files',
    titleFa: 'فایل‌های سازمانی',
    descriptionFa: 'مخزن پرونده‌های مشترک جدا از گفتگوها.',
    icon: 'folder',
    href: '/services/files',
    enabled: false,
  },
];

export function resolveServices(flags: Record<string, boolean> | undefined): ServiceModule[] {
  return SERVICE_CATALOG.map((s) => ({ ...s, enabled: Boolean(flags?.[s.id]) }));
}
