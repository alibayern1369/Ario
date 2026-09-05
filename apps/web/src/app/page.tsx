'use client';

import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';
import { useAuthStore } from '@/stores/auth-store';

export default function HomePage() {
  const ready = useAuthStore((s) => s.ready);
  if (!ready) return <div className="skeleton min-h-[100dvh]" />;
  return (
    <AppShell sidebar={<ChatList />}>
      <div className="hidden h-[100dvh] items-center justify-center text-soft md:flex">
        یک گفتگو را انتخاب کنید
      </div>
      <div className="md:hidden">
        <ChatList />
      </div>
    </AppShell>
  );
}
