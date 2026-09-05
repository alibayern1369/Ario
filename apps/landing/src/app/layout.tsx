import type { Metadata } from 'next';
import { getLandingContent, siteUrl } from '@/lib/content';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const c = await getLandingContent();
  const url = siteUrl();
  return {
    title: c.title,
    description: c.description,
    metadataBase: new URL(url),
    alternates: { canonical: url },
    openGraph: {
      title: c.title,
      description: c.description,
      locale: 'fa_IR',
      type: 'website',
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title: c.title,
      description: c.description,
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
