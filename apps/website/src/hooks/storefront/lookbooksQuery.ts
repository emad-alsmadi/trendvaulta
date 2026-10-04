import { useQuery } from '@tanstack/react-query';
import { lookbooksApi, type StorefrontLookbookStory } from '@/lib/api';
import type { DemoLookbookStory } from '@/data/demoStorefront';
import type { Locale } from '@/lib/locale';

export function lookbooksKey() {
  return ['storefront', 'lookbooks'] as const;
}

const TONES = new Set<DemoLookbookStory['tone']>(['rose', 'stone', 'teal']);

function mapLookbookToStory(item: StorefrontLookbookStory): DemoLookbookStory {
  const tone = TONES.has(item.tone as DemoLookbookStory['tone'])
    ? (item.tone as DemoLookbookStory['tone'])
    : 'stone';

  return {
    id: item.id,
    eyebrow: item.eyebrow,
    title: item.title,
    body: item.body,
    ctaLabel: item.ctaLabel,
    href: item.ctaHref,
    imageUrl: item.imageUrl,
    tone,
    translations: item.translations,
  };
}

/**
 * Eyebrow/title/body/ctaLabel in the reader's language. Each field falls
 * back to English on its own (same pattern as localizeContent,
 * hooks/storefront/contentQuery.ts) so a half-translated story still reads
 * as a whole card rather than mixing an empty Arabic field into English copy.
 */
export function localizeLookbookStory(story: DemoLookbookStory, locale: Locale) {
  const ar = locale === 'ar' ? story.translations?.ar : undefined;
  return {
    eyebrow: ar?.eyebrow?.trim() || story.eyebrow,
    title: ar?.title?.trim() || story.title,
    body: ar?.body?.trim() || story.body,
    ctaLabel: ar?.ctaLabel?.trim() || story.ctaLabel,
  };
}

/** GET /api/storefront/lookbooks — editorial lookbook modules */
export function useLookbooks() {
  return useQuery<DemoLookbookStory[]>({
    queryKey: lookbooksKey(),
    queryFn: async () => {
      const res = await lookbooksApi.getLookbooks();
      return (res.results ?? []).map(mapLookbookToStory);
    },
    staleTime: 60_000,
  });
}
