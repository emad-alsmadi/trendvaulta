import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/cart', '/checkout', '/orders', '/user/', '/auth/', '/password/'],
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
