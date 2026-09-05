'use client';

import { useEffect, useState } from 'react';

type BIP = Event & { prompt: () => Promise<void> };

export function InstallBanner() {
  const [event, setEvent] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);
  const [update, setUpdate] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIos(/iPad|iPhone|iPod/.test(ua) && !('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone));
    const onBip = (e: Event) => {
      e.preventDefault();
      setEvent(e as BIP);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js');
      navigator.serviceWorker.addEventListener('controllerchange', () => setUpdate(true));
    }
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  if (update) {
    return (
      <div className="fixed inset-x-3 top-3 z-[60] rounded-ario bg-ink px-4 py-3 text-sm text-[var(--ario-bg)]">
        نسخه تازه‌ای آماده است.
        <button className="mr-3 underline" onClick={() => window.location.reload()}>
          بارگذاری دوباره
        </button>
      </div>
    );
  }

  if (!event && !ios) return null;
  return (
    <div className="fixed inset-x-3 top-3 z-[60] rounded-ario bg-[var(--ario-surface-solid)] px-4 py-3 text-sm shadow-ario">
      {event ? (
        <button
          className="font-bold text-accent"
          onClick={async () => {
            await event.prompt();
            setEvent(null);
          }}
        >
          نصب آریو روی دستگاه
        </button>
      ) : (
        <p>برای نصب در آیفون: اشتراک ← Add to Home Screen</p>
      )}
    </div>
  );
}
