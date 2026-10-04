'use client';

import { useQuery } from '@tanstack/react-query';
import {
  giftFinderApi,
  type GiftFinderResponse,
} from '@/lib/api';
import {
  DEMO_GIFT_FINDER,
  type DemoGiftFinderConfig,
  type DemoGiftOption,
} from '@/data/demoStorefront';
import type { Locale } from '@/lib/locale';

export type GiftFinderQueryResult = {
  config: DemoGiftFinderConfig;
  fromApi: boolean;
};

export function giftFinderKey() {
  return ['storefront', 'gift-finder'] as const;
}

function hasFacetOptions(res: GiftFinderResponse): boolean {
  return (
    Array.isArray(res.occasions) &&
    res.occasions.length > 0 &&
    Array.isArray(res.recipients) &&
    res.recipients.length > 0 &&
    Array.isArray(res.budgets) &&
    res.budgets.length > 0
  );
}

/**
 * GET /api/storefront/gift-finder
 * Falls back to DEMO_GIFT_FINDER on 404 / network error / empty facets.
 */
export function useGiftFinderConfig() {
  return useQuery<GiftFinderQueryResult>({
    queryKey: giftFinderKey(),
    queryFn: async () => {
      try {
        const res = await giftFinderApi.getConfig();
        if (!hasFacetOptions(res)) {
          return { config: DEMO_GIFT_FINDER, fromApi: false };
        }
        return {
          config: {
            occasions: res.occasions,
            recipients: res.recipients,
            budgets: res.budgets,
          },
          fromApi: true,
        };
      } catch {
        return { config: DEMO_GIFT_FINDER, fromApi: false };
      }
    },
    staleTime: 60_000,
    placeholderData: { config: DEMO_GIFT_FINDER, fromApi: false },
  });
}

/**
 * Label in the reader's language, falling back to English when missing
 * (same pattern as localizeContent, hooks/storefront/contentQuery.ts).
 */
export function localizeGiftOption(option: DemoGiftOption, locale: Locale) {
  const ar = locale === 'ar' ? option.translations?.ar : undefined;
  return ar?.label?.trim() || option.label;
}
