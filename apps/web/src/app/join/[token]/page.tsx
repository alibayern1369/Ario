'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';

export default function JoinInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const ready = useAuthStore((s) => s.ready);
  const userId = useAuthStore((s) => s.userId);
  const load = useChatStore((s) => s.loadConversations);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join() {
    setBusy(true);
    setError(null);
    const { data, error: err } = await createClient().rpc('join_conversation_by_invite', { token });
    setBusy(false);
    if (err || !data) {
      setError('لینک دعوت نامعتبر است یا گفتگو خصوصی است.');
      return;
    }
    await load();
    router.replace(`/c/${data}`);
  }

  if (!ready) return null;
  if (!userId) {
    router.replace(`/login?next=/join/${token}`);
    return null;
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">پیوستن به گفتگو</h1>
      <p className="mt-2 text-soft">با پذیرش دعوت، به گروه یا کانال اضافه می‌شوید.</p>
      {error ? <p className="mt-4 text-sm text-[var(--ario-danger)]">{error}</p> : null}
      <button className="ario-btn ario-btn-primary mt-6" disabled={busy} onClick={() => void join()}>
        پیوستن
      </button>
    </main>
  );
}
