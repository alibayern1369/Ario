'use client';

import { useState } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { ChatList } from '@/components/chats/chat-list';
import { Avatar } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { uploadToStorage } from '@/lib/storage/client';
import { useAuthStore } from '@/stores/auth-store';
import { STORAGE_BUCKETS } from '@ario/shared';

export default function MePage() {
  const profile = useAuthStore((s) => s.profile);
  const refresh = useAuthStore((s) => s.refreshProfile);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');

  async function save() {
    if (!profile) return;
    await createClient()
      .from('profiles')
      .update({ display_name: displayName, username, bio })
      .eq('id', profile.id);
    await refresh();
  }

  async function onAvatar(file: File) {
    if (!profile) return;
    const path = `${profile.id}/avatar-${Date.now()}`;
    await uploadToStorage(STORAGE_BUCKETS.avatars, path, file);
    await createClient().from('profiles').update({ avatar_path: path }).eq('id', profile.id);
    await refresh();
  }

  return (
    <AppShell sidebar={<ChatList />}>
      <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <h1 className="text-2xl font-bold">پروفایل من</h1>
        <Avatar name={displayName || 'من'} path={profile?.avatar_path} size={88} />
        <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void onAvatar(e.target.files[0])} />
        <input className="ario-field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <input className="ario-field ltr-isolate" value={username} onChange={(e) => setUsername(e.target.value)} />
        <textarea className="ario-field" value={bio} onChange={(e) => setBio(e.target.value)} />
        <button className="ario-btn ario-btn-primary w-full" onClick={() => void save()}>
          ذخیره
        </button>
      </div>
    </AppShell>
  );
}
