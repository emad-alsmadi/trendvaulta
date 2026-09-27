'use client';

import { useQuery } from '@tanstack/react-query';
import {
  storefrontHomeApi,
  type StorefrontHomeModule,
  type StorefrontModule,
  type StorefrontTrustItem,
} from '@/lib/api';
import { useStorefrontModules } from './storefrontModulesQuery';
import type { DemoHeroSlide } from '@/data/demoStorefront';
import type { Locale } from '@/lib/locale';

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
  locale: Locale = 'en',
): DemoHeroSlide[] | undefined {
  const hero = modules?.find((mod) => mod.key === 'hero');
  const slides = hero?.slides;
  if (!slides?.length) return undefined;

  return slides
    .map((slide, index) => {
      const href = slide.ctaHref?.trim() || slide.href?.trim() || '/products';
      // Each field falls back to English on its own, so a half-translated
      // slide still reads as a whole slide.
      const local = locale === 'en' ? undefined : slide.translations?.[locale];
      const text = (field: 'eyebrow' | 'title' | 'subtitle' | 'ctaLabel') =>
        local?.[field]?.trim() || slide[field]?.trim() || '';
      const title = text('title');
      if (!title) return null;

      return {
        id: slide.id?.trim() || `hero-slide-${index}`,
        eyebrow: text('eyebrow'),
        title,
        subtitle: text('subtitle'),
        // Message key — HeroPromoCarousel renders ctaLabel with t()
        ctaLabel: text('ctaLabel') || 'demo.hero.shopNow',
        href,
        imageUrl: slide.imageUrl?.trim() || '/images/1.jpeg',
        tone: slide.tone ?? 'rose',
      } satisfies DemoHeroSlide;
    })
    .filter((slide): slide is DemoHeroSlide => slide != null);
}

/**
 * Convert new StorefrontModule to legacy StorefrontHomeModule format
 * for backward compatibility with existing homepage components
 */
function convertModuleToLegacy(mod: StorefrontModule): StorefrontHomeModule {
  return {
    key: mod.key,
    type: mod.type,
    active: mod.active,
    sortOrder: mod.sortOrder,
    title: mod.title,
    subtitle: undefined,
    ctaLabel: undefined,
    ctaHref: undefined,
    imageUrl: undefined,
    limit: mod.limit,
    sort: undefined,
    slides: mod.slides,
    items: mod.trustItems || (mod.items as StorefrontTrustItem[] | undefined),
  };
}

/** GET /api/storefront/home — homepage module layout + hero/trust CMS content */
export function useStorefrontHome() {
  const modulesQ = useStorefrontModules();

  return useQuery({
    queryKey: storefrontHomeKey(),
    queryFn: async () => {
      // Try new CMS modules API first
      if (modulesQ.data && modulesQ.data.length > 0) {
        const legacyModules = modulesQ.data.map(convertModuleToLegacy);
        return { message: 'ok', modules: legacyModules };
      }
      // Fallback to old endpoint
      return storefrontHomeApi.getHome();
    },
    staleTime: 60_000,
    retry: 1,
    enabled: modulesQ.data !== undefined,
  });
}
