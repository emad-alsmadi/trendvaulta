import type { MetadataRoute } from 'next';
import { getServerApiBase, getSiteUrl } from '@/lib/site';

export const revalidate = 3600;

const STATIC_ROUTES = [
  '/',
  '/products',
  '/brands',
  '/offers',
  '/about',
  '/help',
  '/faq',
  '/contact',
  '/shipping',
  '/returns',
  '/privacy',
  '/terms',
  '/cookies',
];

const CATEGORIES = ['makeup', 'perfumes', 'clothing', 'skincare', 'accessories', 'home'];

type Listed = { _id: string; slug?: string; updatedAt?: string };

async function fetchList(path: string): Promise<Listed[]> {
  try {
    const res = await fetch(`${getServerApiBase()}${path}`, {
      next: { revalidate },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const rows = Array.isArray(json) ? json : json?.data;
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    ...STATIC_ROUTES.map((path) => ({
      url: `${site}${path}`,
      lastModified: now,
      changeFrequency: path === '/' ? ('daily' as const) : ('weekly' as const),
      priority: path === '/' ? 1 : 0.7,
    })),
    ...CATEGORIES.map((c) => ({
      url: `${site}/products?category=${c}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ];

  const [products, brands] = await Promise.all([
    fetchList('/api/products?limit=100&sort=-createdAt'),
    fetchList('/api/brands?limit=50'),
  ]);

  for (const p of products) {
    entries.push({
      url: `${site}/products/${p._id}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }
  for (const b of brands) {
    entries.push({
      url: `${site}/brands/${b.slug || b._id}`,
      lastModified: b.updatedAt ? new Date(b.updatedAt) : now,
      changeFrequency: 'weekly',
      priority: 0.5,
    });
  }

  return entries;
}
