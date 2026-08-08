'use client';

import { useQuery } from '@tanstack/react-query';
import { storefrontHomeApi, type StorefrontHomeModule } from '@/lib/api';
import type { DemoHeroSlide } from '@/data/demoStorefront';

export const FALLBACK_HOME_MODULE_KEYS = [
  'hero',
  'trust',
  'categories',
  'deals',
  'featured_products',
  'featured_brands',
  'gift_finder',
  'recently_viewed',
  'inspired',
  'lookbook',
  'why_choose_us',
  'testimonials',
  'cta',
] as const;

export type HomeModuleKey = (typeof FALLBACK_HOME_MODULE_KEYS)[number];

export function storefrontHomeKey() {
  return ['storefront', 'home'] as const;
}

export function pickActiveHomeModules(
  modules: StorefrontHomeModule[] | undefined,
): StorefrontHomeModule[] {
  if (!modules?.length) return [];
  return [...modules]
    .filter((mod) => mod.active !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function getHeroSlidesFromHome(
  modules: StorefrontHomeModule[] | undefined,
): DemoHeroSlide[] | undefined {
  const hero = modules?.find((mod) => mod.key === 'hero');
  const slides = hero?.slides;
  if (!slides?.length) return undefined;

  return slides
    .map((slide, index) => {
      const href = slide.ctaHref?.trim() || slide.href?.trim() || '/products';
      const title = slide.title?.trim() ?? '';
      if (!title) return null;

      return {
        id: slide.id?.trim() || `hero-slide-${index}`,
        eyebrow: slide.eyebrow?.trim() ?? '',
        title,
        subtitle: slide.subtitle?.trim() ?? '',
        ctaLabel: slide.ctaLabel?.trim() || 'Shop now',
        href,
        imageUrl: slide.imageUrl?.trim() || '/images/1.webp',
        tone: slide.tone ?? 'rose',
      } satisfies DemoHeroSlide;
    })
    .filter((slide): slide is DemoHeroSlide => slide != null);
}

/** GET /api/storefront/home — homepage module layout + hero/trust CMS content */
export function useStorefrontHome() {
  return useQuery({
    queryKey: storefrontHomeKey(),
    queryFn: () => storefrontHomeApi.getHome(),
    staleTime: 60_000,
    retry: 1,
  });
}
