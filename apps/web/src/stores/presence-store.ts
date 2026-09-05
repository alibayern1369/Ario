'use client';

import { create } from 'zustand';
import { hasSupabaseConfig } from '@/lib/env';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from './auth-store';

type PresenceState = {
  onlineIds: string[];
  listen: () => (() => void) | undefined;
  isOnline: (userId: string) => boolean;
};

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineIds: [],
  listen: () => {
    if (!hasSupabaseConfig()) return undefined;
    const userId = useAuthStore.getState().userId;
    if (!userId) return undefined;
    const supabase = createClient();
    const channel = supabase.channel('ario-presence', {
      config: { presence: { key: userId } },
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        set({ onlineIds: Object.keys(state) });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ at: Date.now() });
          await supabase
            .from('profiles')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', userId);
        }
      });
    const tick = window.setInterval(() => {
      void supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId);
    }, 30000);
    return () => {
      window.clearInterval(tick);
      void supabase.removeChannel(channel);
    };
  },
  isOnline: (userId) => get().onlineIds.includes(userId),
}));
