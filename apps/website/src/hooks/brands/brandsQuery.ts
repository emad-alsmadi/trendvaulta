import { useQuery } from '@tanstack/react-query';
import { brandsApi } from '@/lib/api';

export function brandsKey() {
  return ['brands'] as const;
}

export function useBrands() {
  return useQuery({
    queryKey: brandsKey(),
    queryFn: async () => {
      return await brandsApi.getBrands();
    },
    staleTime: 60_000,
    retry: 1,
  });
}
