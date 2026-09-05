import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { publicEnv } from '@/lib/env';
import { AppProviders } from '@/components/providers/app-providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'آریو',
    template: '%s · آریو',
  },
  description: 'پیام‌رسان خصوصی فارسی آریو',
  applicationName: 'ARIO',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'آریو',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/branding/logo.svg',
    apple: '/icons/apple-touch-icon.png',
  },
  metadataBase: (() => {
    try {
      return new URL(publicEnv().appUrl);
    } catch {
      return new URL('http://localhost:3000');
    }
  })(),
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4efe6' },
    { media: '(prefers-color-scheme: dark)', color: '#12100d' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === 'en' ? 'ltr' : 'rtl';
  const runtimePublic = publicEnv();

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ARIO_PUBLIC__=${JSON.stringify(runtimePublic)};`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(()=>{try{const t=localStorage.getItem('ario-theme')||'system';const d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
