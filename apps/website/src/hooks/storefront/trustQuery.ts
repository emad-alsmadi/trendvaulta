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

  return {
    id: item.id?.trim() || `trust-${index}-${item.icon}`,
    icon: item.icon,
    title,
    description,
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
