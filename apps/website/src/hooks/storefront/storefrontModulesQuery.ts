import { useQuery } from '@tanstack/react-query';
import { storefrontModulesApi } from '@/lib/api';

export function storefrontModulesKey() {
  return ['storefront-modules'] as const;
}

/** Get active storefront modules for homepage */
export function useStorefrontModules() {
  return useQuery({
    queryKey: storefrontModulesKey(),
    queryFn: async () => {
      const res = await storefrontModulesApi.getStorefrontModules();
      return res.modules;
    },
    staleTime: 300_000, // 5 minutes - modules change rarely
    retry: 1,
  });
}
