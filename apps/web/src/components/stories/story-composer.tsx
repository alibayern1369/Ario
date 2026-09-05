'use client';

import { useState } from 'react';
import { STORY_TTL_HOURS, STORAGE_BUCKETS } from '@ario/shared';
import { createClient } from '@/lib/supabase/client';
import { uploadToStorage } from '@/lib/storage/client';
import { useAuthStore } from '@/stores/auth-store';
import { BottomSheet } from '@/components/ui/bottom-sheet';

export function StoryComposer({ onClose }: { onClose: () => void }) {
  const me = useAuthStore((s) => s.userId);
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function publish() {
    if (!me || !file) return;
    setBusy(true);
    const path = `${me}/${crypto.randomUUID()}-${file.name}`;
    await uploadToStorage(STORAGE_BUCKETS.stories, path, file);
    await createClient().from('stories').insert({
      author_id: me,
      caption,
      bucket: STORAGE_BUCKETS.stories,
      path,
      mime: file.type,
      expires_at: new Date(Date.now() + STORY_TTL_HOURS * 3600 * 1000).toISOString(),
    });
    setBusy(false);
    onClose();
  }

  return (
    <BottomSheet open onClose={onClose} title="داستان تازه">
      <input
        type="file"
        accept="image/*,video/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <input className="ario-field my-3" placeholder="نوشته" value={caption} onChange={(e) => setCaption(e.target.value)} />
      <button className="ario-btn ario-btn-primary w-full" disabled={!file || busy} onClick={() => void publish()}>
        انتشار
      </button>
    </BottomSheet>
  );
}
