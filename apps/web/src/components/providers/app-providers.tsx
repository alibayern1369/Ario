'use client';

import { useEffect } from 'react';
import { CallOverlay } from '@/components/calls/call-overlay';
import { InstallBanner } from '@/components/pwa/install-banner';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/stores/auth-store';
import { useCallStore } from '@/stores/call-store';
import { usePresenceStore } from '@/stores/presence-store';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const listenCalls = useCallStore((s) => s.listen);
  const listenPresence = usePresenceStore((s) => s.listen);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const offCall = listenCalls();
    const offPresence = listenPresence();
    return () => {
      offCall?.();
      offPresence?.();
    };
  }, [listenCalls, listenPresence]);

  return (
    <>
      {children}
      <CallOverlay />
      <InstallBanner />
      <Toaster />
    </>
  );
}
