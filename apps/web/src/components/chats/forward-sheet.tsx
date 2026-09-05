'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { titleOf, useChatStore, type MessageRow } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { createClient } from '@/lib/supabase/client';

export function ForwardSheet({
  message,
  onClose,
}: {
  message: MessageRow | null;
  onClose: () => void;
}) {
  const conversations = useChatStore((s) => s.conversations);
  const me = useAuthStore((s) => s.userId);
  const load = useChatStore((s) => s.loadMessages);

  async function sendTo(id: string) {
    if (!message || !me) return;
    await createClient().from('messages').insert({
      conversation_id: id,
      sender_id: me,
      type: message.type,
      content: message.content,
      forwarded_from: message.id,
      client_id: crypto.randomUUID(),
    });
    await load(id);
    onClose();
  }

  return (
    <BottomSheet open={!!message} onClose={onClose} title="هدایت پیام">
      <div className="space-y-1">
        {conversations.map((c) => (
          <button
            key={c.id}
            className="w-full rounded-ario px-3 py-3 text-right hover:bg-accent-soft"
            onClick={() => void sendTo(c.id)}
          >
            {titleOf(c)}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
