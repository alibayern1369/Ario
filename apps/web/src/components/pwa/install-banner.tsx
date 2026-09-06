'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

type BIP = Event & { prompt: () => Promise<void>; userChoice?: Promise<{ outcome: string }> };

type PwaInstallContextValue = {
  canInstall: boolean;
  iosHint: boolean;
  dismissed: boolean;
  promptInstall: () => Promise<void>;
  dismiss: () => void;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

const DISMISS_KEY = 'ario.pwa.install.dismissed';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations('pwa');
  const [event, setEvent] = useState<BIP | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [update, setUpdate] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1' || isStandalone());

    const ua = navigator.userAgent;
    const ios =
      /iPad|iPhone|iPod/.test(ua) &&
      !('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone);
    setIosHint(ios);

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

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
    setEvent(null);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!event) return;
    await event.prompt();
    setEvent(null);
    dismiss();
  }, [dismiss, event]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      canInstall: Boolean(event) && !dismissed,
      iosHint: iosHint && !dismissed && !event,
      dismissed,
      promptInstall,
      dismiss,
    }),
    [dismiss, dismissed, event, iosHint, promptInstall],
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
      {update ? (
        <div
          role="status"
          className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] flex items-center justify-between gap-3 rounded-ario border border-[var(--ario-line)] bg-ink px-4 py-3 text-sm text-[var(--ario-bg)] shadow-ario md:inset-x-auto md:bottom-4 md:left-4 md:right-auto md:max-w-sm"
        >
          <span>{t('update')}</span>
          <button type="button" className="shrink-0 font-semibold underline" onClick={() => window.location.reload()}>
            {t('reload')}
          </button>
        </div>
      ) : null}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    return {
      canInstall: false,
      iosHint: false,
      dismissed: true,
      promptInstall: async () => undefined,
      dismiss: () => undefined,
    } satisfies PwaInstallContextValue;
  }
  return ctx;
}

/** Compact install control for chat-list / page headers — never a floating overlay. */
export function InstallHeaderControl() {
  const t = useTranslations('pwa');
  const { canInstall, iosHint, promptInstall, dismiss } = usePwaInstall();
  const [showIos, setShowIos] = useState(false);

  if (!canInstall && !iosHint) return null;

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        className="ario-btn ario-btn-ghost !min-h-9 gap-1.5 !px-2.5 text-accent"
        onClick={() => {
          if (canInstall) void promptInstall();
          else setShowIos((v) => !v);
        }}
        aria-label={t('install')}
        aria-expanded={iosHint ? showIos : undefined}
      >
        <Download size={16} strokeWidth={2} />
        <span className="hidden text-xs font-semibold sm:inline">{t('install')}</span>
      </button>
      <button
        type="button"
        className="ario-btn ario-btn-icon !min-h-8 !w-8 text-muted"
        onClick={dismiss}
        aria-label="بستن"
      >
        <X size={14} />
      </button>
      {showIos && iosHint ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-ario border border-[var(--ario-line)] bg-[var(--ario-surface-solid)] p-3 text-xs leading-relaxed text-soft shadow-ario sm:left-auto sm:right-0">
          {t('iosHint')}
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Use PwaInstallProvider + InstallHeaderControl */
export function InstallBanner() {
  return null;
}
