import { useQuery } from '@tanstack/react-query';
import { lookbooksApi, type StorefrontLookbookStory } from '@/lib/api';
import type { DemoLookbookStory } from '@/data/demoStorefront';

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
