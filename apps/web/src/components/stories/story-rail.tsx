'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar } from '@/components/ui/avatar';
import { StoryViewer } from '@/components/stories/story-viewer';
import { StoryComposer } from '@/components/stories/story-composer';

export type StoryItem = {
  id: string;
  author_id: string;
  caption: string | null;
  bucket: string;
  path: string;
  mime: string;
  expires_at: string;
  profiles?: { display_name: string; avatar_path: string | null };
};

export function StoryRail() {
  const me = useAuthStore((s) => s.userId);
  const profile = useAuthStore((s) => s.profile);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [open, setOpen] = useState<StoryItem[] | null>(null);
  const [compose, setCompose] = useState(false);

  async function load() {
    const { data } = await createClient()
      .from('stories')
      .select('*, profiles(display_name,avatar_path)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    setStories((data ?? []) as StoryItem[]);
  }

  useEffect(() => {
    if (me) void load();
  }, [me]);

  const authors = new Map<string, StoryItem[]>();
  for (const s of stories) {
    authors.set(s.author_id, [...(authors.get(s.author_id) ?? []), s]);
  }

  return (
    <div className="flex gap-3 overflow-x-auto px-4 py-3">
      <button className="flex w-16 flex-col items-center gap-1" onClick={() => setCompose(true)}>
        <div className="relative">
          <Avatar name={profile?.display_name ?? 'من'} path={profile?.avatar_path} size={52} />
          <span className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
            <Plus size={12} />
          </span>
        </div>
        <span className="text-[11px]">داستان من</span>
      </button>
      {[...authors.entries()].map(([id, list]) => (
        <button key={id} className="flex w-16 flex-col items-center gap-1" onClick={() => setOpen(list)}>
          <Avatar name={list[0]?.profiles?.display_name ?? ''} path={list[0]?.profiles?.avatar_path} size={52} ring />
          <span className="w-full truncate text-[11px]">{list[0]?.profiles?.display_name}</span>
        </button>
      ))}
      {open ? <StoryViewer stories={open} onClose={() => { setOpen(null); void load(); }} /> : null}
      {compose ? <StoryComposer onClose={() => { setCompose(false); void load(); }} /> : null}
    </div>
  );
}
