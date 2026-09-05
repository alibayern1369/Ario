'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';
import { EmptyState } from '@/components/ui/empty-state';
import { createClient } from '@/lib/supabase/client';
import { resolveServices } from '@/lib/services';
import type { ServiceModule } from '@ario/shared';

export default function ServicesPage() {
  const [modules, setModules] = useState<ServiceModule[]>([]);

  useEffect(() => {
    void createClient()
      .from('system_settings')
      .select('value')
      .eq('key', 'feature_flags')
      .maybeSingle()
      .then(({ data }) => {
        const flags = (data?.value ?? {}) as Record<string, boolean>;
        setModules(resolveServices(flags));
      });
  }, []);

  const enabled = modules.filter((m) => m.enabled);

  return (
    <AppShell sidebar={<ChatList />}>
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold">خدمات</h1>
        <p className="mt-2 text-sm text-soft">
          آریو آماده اضافه شدن ماژول‌های سازمانی است. پیام‌رسان هسته اصلی می‌ماند.
        </p>
        {enabled.length === 0 ? (
          <EmptyState title="هنوز خدمتی فعال نشده." body="مدیر می‌تواند ماژول‌ها را از تنظیمات سیستم روشن کند." />
        ) : (
          <ul className="mt-4 space-y-2">
            {enabled.map((m) => (
              <li key={m.id} className="rounded-ario bg-[var(--ario-surface-solid)] p-4">
                <div className="font-bold">{m.titleFa}</div>
                <p className="text-sm text-soft">{m.descriptionFa}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
