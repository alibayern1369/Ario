'use client';

import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuthStore } from '@/stores/auth-store';

export default function HomePage() {
  const ready = useAuthStore((s) => s.ready);
  if (!ready) return <div className="skeleton min-h-[100dvh]" />;
  return (
    <AppShell sidebar={<ChatList />}>
      <div className="ario-chat-canvas hidden h-[100dvh] w-full items-center justify-center md:flex">
        <EmptyState title="یک گفتگو را انتخاب کنید" body="از فهرست سمت راست یک گفتگو باز کنید." />
      </div>
      <div className="md:hidden">
        <ChatList />
      </div>
    </AppShell>
  );
}
