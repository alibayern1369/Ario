'use client';

import { useToastStore } from '@/stores/toast-store';

export function Toaster() {
  const items = useToastStore((s) => s.items);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-ario bg-ink px-4 py-2 text-sm text-[var(--ario-bg)] shadow-ario"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
