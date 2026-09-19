import { useQuery } from '@tanstack/react-query';
import { brandsApi } from '@/lib/api';
import type { Brand } from '@/types';

export function brandsKey() {
  return ['brands'] as const;
}

export function brandByIdKey(id: string) {
  return ['brands', 'byId', id] as const;
}

export function featuredBrandsKey(limit = 8) {
  return ['brands', 'featured', { limit }] as const;
}

/** Normalize list payloads: array or `{ data: Brand[] }`. */
function normalizeBrandsList(payload: unknown): Brand[] {
  if (Array.isArray(payload)) return payload as Brand[];
  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: Brand[] }).data;
  }
  return [];
}

export function useBrands() {
  return useQuery({
    queryKey: brandsKey(),
    queryFn: async () => {
      const res = await brandsApi.getBrands();
      return normalizeBrandsList(res);
    },
    staleTime: 60_000,
    retry: 1,
  });
}

/** Featured brands for homepage strip — GET /api/brands?featured=true&limit=8 */
export function useFeaturedBrands(limit = 8) {
  return useQuery({
    queryKey: featuredBrandsKey(limit),
    queryFn: async () => {
      const res = await brandsApi.getBrands({ featured: true, limit });
      return normalizeBrandsList(res);
    },
    staleTime: 60_000,
    retry: 1,
  });
}

export function useBrandById(id?: string) {
  return useQuery({
    queryKey: id ? brandByIdKey(id) : ['brands', 'byId', 'missing'],
    queryFn: async () => {
      if (!id) throw new Error('Missing brand id');
      return await brandsApi.getBrandById(id);
    },
    enabled: Boolean(id),
    staleTime: 60_000,
    retry: 1,
  });
}
