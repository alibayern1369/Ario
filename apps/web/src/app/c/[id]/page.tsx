'use client';

import { use } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';
import { ConversationView } from '@/components/chats/conversation-view';

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AppShell sidebar={<ChatList />}>
      <ConversationView conversationId={id} />
    </AppShell>
  );
}
