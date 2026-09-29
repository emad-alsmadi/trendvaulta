'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
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

/**
 * StorefrontModule `type` (the dashboard selector) → homepage section.
 * `key` is free text in the dashboard, so it only decides the section for
 * legacy /storefront/home modules that carry no known type.
 */
const MODULE_TYPE_TO_HOME_KEY: Record<string, HomeModuleKey> = {
  hero_carousel: 'hero',
  trust_strip: 'trust',
  categories: 'categories',
  deals_rail: 'deals',
  bestsellers: 'featured_products',
  // No dedicated new-arrivals rail yet — reuse the product rail.
  new_arrivals: 'featured_products',
  featured_brands: 'featured_brands',
  lookbooks: 'lookbook',
  testimonials: 'testimonials',
  why_choose_us: 'why_choose_us',
};

/** Sections a CMS module can switch on/off (and reorder). */
const CMS_MANAGED_HOME_KEYS = new Set<HomeModuleKey>(
  Object.values(MODULE_TYPE_TO_HOME_KEY),
);

export function resolveHomeModuleKey(
  mod: Pick<StorefrontHomeModule, 'key' | 'type'>,
): HomeModuleKey | null {
  const byType = mod.type ? MODULE_TYPE_TO_HOME_KEY[mod.type] : undefined;
  if (byType) return byType;
  return (FALLBACK_HOME_MODULE_KEYS as readonly string[]).includes(mod.key)
    ? (mod.key as HomeModuleKey)
    : null;
}

/**
 * Homepage section order. CMS-managed sections follow the active modules
 * exactly (order + on/off); sections the module enum cannot express
 * (gift finder, recently viewed, inspired, CTA) are always kept, each placed
 * after its nearest preceding default section — so one CMS module no longer
 * wipes out the rest of the page.
 */
export function resolveHomeLayout(
  modules: StorefrontHomeModule[] | undefined,
): HomeModuleKey[] {
  const active = pickActiveHomeModules(modules);
  if (!active.length) return [...FALLBACK_HOME_MODULE_KEYS];

  const layout: HomeModuleKey[] = [];
  for (const mod of active) {
    const key = resolveHomeModuleKey(mod);
    if (key && !layout.includes(key)) layout.push(key);
  }

  FALLBACK_HOME_MODULE_KEYS.forEach((key, index) => {
    if (CMS_MANAGED_HOME_KEYS.has(key) || layout.includes(key)) return;
    let insertAt = 0;
    for (let i = index - 1; i >= 0; i -= 1) {
      const anchor = layout.indexOf(FALLBACK_HOME_MODULE_KEYS[i]);
      if (anchor !== -1) {
        insertAt = anchor + 1;
        break;
      }
    }
    layout.splice(insertAt, 0, key);
  });

  return layout;
}

export function getHeroSlidesFromHome(
  modules: StorefrontHomeModule[] | undefined,
  locale: Locale = 'en',
): DemoHeroSlide[] | undefined {
  const hero = modules?.find((mod) => resolveHomeModuleKey(mod) === 'hero');
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
    // The modules result is part of the key: the queryFn depends on it, so
    // a modules refetch must produce a new layout instead of a stale one.
    queryKey: [...storefrontHomeKey(), modulesQ.dataUpdatedAt] as const,
    queryFn: async () => {
      // Try new CMS modules API first
      if (modulesQ.data && modulesQ.data.length > 0) {
        const legacyModules = modulesQ.data.map(convertModuleToLegacy);
        return { message: 'ok', modules: legacyModules };
      }
      // No modules — or the modules request failed: use the legacy layout
      return storefrontHomeApi.getHome();
    },
    staleTime: 60_000,
    retry: 1,
    // Wait for modules to settle either way (success OR error); before, an
    // error left this disabled forever and the page silently used demo keys.
    enabled: !modulesQ.isPending,
    placeholderData: keepPreviousData,
  });
}
