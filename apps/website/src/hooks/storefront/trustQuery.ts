'use client';

import { useQuery } from '@tanstack/react-query';
import {
  storefrontTrustApi,
  type StorefrontTrustIcon,
  type StorefrontTrustItem,
} from '@/lib/api';
import type { DemoTrustItem } from '@/data/demoStorefront';

const TRUST_ICONS = new Set<StorefrontTrustIcon>([
  'truck',
  'refresh',
  'shield',
  'headset',
]);

const TRANSLATED_TRUST_IDS = new Set(['shipping', 'returns', 'secure', 'support']);

export function trustKey() {
  return ['storefront', 'trust'] as const;
}

function mapTrustItem(
  item: StorefrontTrustItem,
  index: number,
): DemoTrustItem | null {
  if (!TRUST_ICONS.has(item.icon)) return null;
  const title = typeof item.title === 'string' ? item.title.trim() : '';
  const description =
    typeof item.description === 'string' ? item.description.trim() : '';
  if (!title || !description) return null;

  const id = item.id?.trim() || `trust-${index}-${item.icon}`;
  // Default items have translated copy in messages (demo.trust.<id>.*);
  // TrustServiceStrip runs title/description through t(), custom text passes through.
  const translated = TRANSLATED_TRUST_IDS.has(id);

  return {
    id,
    icon: item.icon,
    title: translated ? `demo.trust.${id}.title` : title,
    description: translated ? `demo.trust.${id}.description` : description,
  };
}

/** GET /api/storefront/trust — mapped for TrustServiceStrip */
export function useStorefrontTrust() {
  return useQuery<DemoTrustItem[]>({
    queryKey: trustKey(),
    queryFn: async () => {
      const res = await storefrontTrustApi.getTrust();
      return (res.items ?? [])
        .map(mapTrustItem)
        .filter((item): item is DemoTrustItem => item != null);
    },
    staleTime: 60_000,
  });
}
