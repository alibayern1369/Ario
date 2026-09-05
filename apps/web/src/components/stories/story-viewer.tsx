'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { signedUrl } from '@/lib/storage/client';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import type { StoryItem } from './story-rail';

export function StoryViewer({ stories, onClose }: { stories: StoryItem[]; onClose: () => void }) {
  const me = useAuthStore((s) => s.userId);
  const openDirect = useChatStore((s) => s.openDirect);
  const send = useChatStore((s) => s.sendText);
  const [i, setI] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [seen, setSeen] = useState<string[]>([]);
  const story = stories[i];

  useEffect(() => {
    if (!story) return;
    void signedUrl(story.bucket, story.path).then(setUrl);
    if (me && story.author_id !== me) {
      void createClient().from('story_views').upsert({ story_id: story.id, viewer_id: me });
    }
    if (me && story.author_id === me) {
      void createClient()
        .from('story_views')
        .select('viewer_id, profiles(display_name)')
        .eq('story_id', story.id)
        .then(({ data }) =>
          setSeen(
            (data ?? []).map((v) => {
              const profiles = (v as { profiles?: { display_name: string } | { display_name: string }[] }).profiles;
              if (Array.isArray(profiles)) return profiles[0]?.display_name ?? '';
              return profiles?.display_name ?? '';
            }),
          ),
        );
    }
    const t = window.setTimeout(() => {
      if (i < stories.length - 1) setI((x) => x + 1);
      else onClose();
    }, 6000);
    return () => window.clearTimeout(t);
  }, [story, i, me, onClose, stories.length]);

  if (!story) return null;
  const current = story;

  async function react() {
    if (!me) return;
    await createClient().from('story_reactions').upsert({ story_id: current.id, user_id: me, emoji: '❤️' });
  }

  async function sendReply() {
    if (!reply.trim()) return;
    const conv = await openDirect(current.author_id);
    if (conv) await send(conv, `پاسخ داستان: ${reply.trim()}`);
    setReply('');
  }

  async function remove() {
    if (current.author_id !== me) return;
    await createClient().from('stories').delete().eq('id', current.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[75] bg-black text-white">
      <div className="flex gap-1 px-3 pt-3">
        {stories.map((s, idx) => (
          <div key={s.id} className="h-1 flex-1 overflow-hidden rounded bg-white/20">
            <div className={`h-full bg-white ${idx < i ? 'w-full' : idx === i ? 'w-2/3' : 'w-0'}`} />
          </div>
        ))}
      </div>
      <button className="absolute left-4 top-6" onClick={onClose}>
        بستن
      </button>
      <div className="flex h-full items-center justify-center p-6">
        {url && current.mime.startsWith('video/') ? (
          <video src={url} className="max-h-[70vh] rounded-ario" autoPlay playsInline />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="max-h-[70vh] rounded-ario object-contain" />
        ) : (
          <div className="skeleton h-64 w-48" />
        )}
      </div>
      {current.caption ? <p className="absolute bottom-24 inset-x-4 text-center">{current.caption}</p> : null}
      <div className="absolute inset-x-4 bottom-6 flex gap-2">
        <input
          className="ario-field flex-1 text-ink"
          placeholder="پاسخ به داستان"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <button className="ario-btn ario-btn-primary" onClick={() => void sendReply()}>
          ارسال
        </button>
        <button className="ario-btn ario-btn-ghost" onClick={() => void react()}>
          ❤️
        </button>
        {current.author_id === me ? (
          <button className="ario-btn ario-btn-ghost" onClick={() => void remove()}>
            حذف
          </button>
        ) : null}
      </div>
      {seen.length > 0 ? (
        <p className="absolute right-4 top-16 text-xs text-white/80">بازدید: {seen.join('، ')}</p>
      ) : null}
    </div>
  );
}
