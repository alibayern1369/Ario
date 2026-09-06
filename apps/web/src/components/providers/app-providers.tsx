'use client';

import { useEffect } from 'react';
import { CallOverlay } from '@/components/calls/call-overlay';
import { InstallBanner } from '@/components/pwa/install-banner';
import { Toaster } from '@/components/ui/toaster';
import { realtimeHub } from '@/lib/realtime/channel-manager';
import { useAuthStore } from '@/stores/auth-store';
import { useCallStore } from '@/stores/call-store';
import { usePresenceStore } from '@/stores/presence-store';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const ready = useAuthStore((s) => s.ready);
  const userId = useAuthStore((s) => s.userId);
  const listenCalls = useCallStore((s) => s.listen);
  const listenPresence = usePresenceStore((s) => s.listen);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    realtimeHub.setUser(userId);
    if (!ready || !userId) return;
    const offCall = listenCalls(userId);
    const offPresence = listenPresence(userId);
    return () => {
      offCall?.();
      offPresence?.();
    };
  }, [ready, userId, listenCalls, listenPresence]);

  useEffect(() => {
    if (ready && !userId) {
      realtimeHub.reset(null);
    }
  }, [ready, userId]);

  return (
    <>
      {children}
      <CallOverlay />
      <InstallBanner />
      <Toaster />
    </>
  );
}
