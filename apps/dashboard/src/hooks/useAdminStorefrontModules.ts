import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminStorefrontModulesApi, type StorefrontModulePayload } from '../lib/api';

export const ADMIN_STOREFRONT_MODULES_KEY = ['admin', 'storefront-modules'] as const;

export function useAdminStorefrontModules(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...ADMIN_STOREFRONT_MODULES_KEY, params ?? {}] as const,
    queryFn: () => adminStorefrontModulesApi.getStorefrontModules(params),
    staleTime: 30_000,
  });
}

export function useCreateStorefrontModuleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StorefrontModulePayload) =>
      adminStorefrontModulesApi.createStorefrontModule(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_STOREFRONT_MODULES_KEY });
    },
  });
}

export function useUpdateStorefrontModuleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<StorefrontModulePayload>;
    }) => adminStorefrontModulesApi.updateStorefrontModule(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_STOREFRONT_MODULES_KEY });
    },
  });
}

export function useDeleteStorefrontModuleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminStorefrontModulesApi.deleteStorefrontModule(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_STOREFRONT_MODULES_KEY });
    },
  });
}
