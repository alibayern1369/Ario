import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/content';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return ['', '/privacy', '/terms'].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));
}
