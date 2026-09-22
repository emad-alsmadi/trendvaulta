import { useQuery } from '@tanstack/react-query';
import { offersApi, type StorefrontOffer } from '@/lib/api';
import type { DemoDeal } from '@/data/demoStorefront';

export type OffersQueryParams = {
  active?: boolean;
  limit?: number;
};

export function offersKey(params: OffersQueryParams = {}) {
  return ['offers', params] as const;
}

function mapOfferToDeal(offer: {
  _id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  href: string;
  imageUrl: string;
}): DemoDeal {
  return {
    id: offer._id,
    title: offer.title,
    subtitle: offer.subtitle ?? '',
    badge: offer.badge ?? '',
    href: offer.href,
    imageUrl: offer.imageUrl,
  };
}

/** Active storefront offers for the home deals rail */
export function useActiveOffers(limit = 12) {
  const params: OffersQueryParams = { active: true, limit };

  return useQuery<DemoDeal[]>({
    queryKey: offersKey(params),
    queryFn: async () => {
      const res = await offersApi.getOffers(params);
      return (res.results ?? []).map(mapOfferToDeal);
    },
    staleTime: 60_000,
    retry: 1,
  });
}

/** Full offers listing for /offers — raw API shape (keeps endsAt/badge). */
export function useOffersList(limit = 24) {
  const params: OffersQueryParams = { active: true, limit };

  return useQuery<StorefrontOffer[]>({
    queryKey: [...offersKey(params), 'raw'] as const,
    queryFn: async () => {
      const res = await offersApi.getOffers(params);
      return res.results ?? [];
    },
    staleTime: 60_000,
    retry: 1,
  });
}
