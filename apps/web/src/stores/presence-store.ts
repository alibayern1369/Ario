'use client';

import { create } from 'zustand';
import { PRESENCE_TTL_MS } from '@ario/shared';
import { hasSupabaseConfig } from '@/lib/env';
import { createClient } from '@/lib/supabase/client';
import { PRESENCE_CHANNEL, realtimeHub } from '@/lib/realtime/channel-manager';
import { useAuthStore } from './auth-store';

type PresenceState = {
  onlineIds: string[];
  lastSeen: Record<string, string | null>;
  listen: (userId: string) => (() => void) | undefined;
  isOnline: (userId: string) => boolean;
  touchLastSeen: () => Promise<void>;
};

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineIds: [],
  lastSeen: {},
  listen: (userId) => {
    if (!hasSupabaseConfig() || !userId) return undefined;
    realtimeHub.setUser(userId);
    const supabase = createClient();

    const { channel, ready, release } = realtimeHub.acquire(
      PRESENCE_CHANNEL,
      (ch) => {
        ch.on('presence', { event: 'sync' }, () => {
          const state = ch.presenceState();
          set({ onlineIds: Object.keys(state) });
        });
      },
      { presenceKey: userId },
    );

    let cancelled = false;
    void ready.then(async () => {
      if (cancelled) return;
      await channel.track({ at: Date.now(), userId });
      await get().touchLastSeen();
    });

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void ready.then(() => channel.track({ at: Date.now(), userId }));
        void get().touchLastSeen();
      } else {
        void get().touchLastSeen();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const tick = window.setInterval(() => {
      void get().touchLastSeen();
      void ready.then(() => channel.track({ at: Date.now(), userId }));
    }, Math.min(30_000, PRESENCE_TTL_MS));

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(tick);
      void channel.untrack();
      void supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', userId);
      release();
    };
  },
  isOnline: (userId) => get().onlineIds.includes(userId),
  touchLastSeen: async () => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    const iso = new Date().toISOString();
    await createClient().from('profiles').update({ last_seen_at: iso }).eq('id', userId);
    set((s) => ({ lastSeen: { ...s.lastSeen, [userId]: iso } }));
  },
}));
