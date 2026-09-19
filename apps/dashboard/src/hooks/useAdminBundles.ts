import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminBundlesApi, type BundlePayload } from '../lib/api';

export const ADMIN_BUNDLES_KEY = ['admin', 'bundles'] as const;

export function useAdminBundles(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...ADMIN_BUNDLES_KEY, params ?? {}] as const,
    queryFn: () => adminBundlesApi.getBundles(params),
    staleTime: 30_000,
  });
}

export function useCreateBundleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BundlePayload) => adminBundlesApi.createBundle(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_BUNDLES_KEY });
    },
  });
}

export function useUpdateBundleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<BundlePayload>;
    }) => adminBundlesApi.updateBundle(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_BUNDLES_KEY });
    },
  });
}

export function useDeleteBundleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminBundlesApi.deleteBundle(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_BUNDLES_KEY });
    },
  });
}
