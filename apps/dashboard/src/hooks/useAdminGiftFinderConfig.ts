import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminGiftFinderConfigApi, type GiftFinderConfigPayload } from '../lib/api';

export const ADMIN_GIFT_FINDER_CONFIG_KEY = ['admin', 'gift-finder-config'] as const;

export function useAdminGiftFinderConfigs() {
  return useQuery({
    queryKey: ADMIN_GIFT_FINDER_CONFIG_KEY,
    queryFn: () => adminGiftFinderConfigApi.getGiftFinderConfigs(),
    staleTime: 30_000,
  });
}

export function useCreateGiftFinderConfigMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GiftFinderConfigPayload) => adminGiftFinderConfigApi.createGiftFinderConfig(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_GIFT_FINDER_CONFIG_KEY });
    },
  });
}

export function useUpdateGiftFinderConfigMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<GiftFinderConfigPayload>;
    }) => adminGiftFinderConfigApi.updateGiftFinderConfig(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_GIFT_FINDER_CONFIG_KEY });
    },
  });
}

export function useDeleteGiftFinderConfigMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminGiftFinderConfigApi.deleteGiftFinderConfig(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_GIFT_FINDER_CONFIG_KEY });
    },
  });
}
