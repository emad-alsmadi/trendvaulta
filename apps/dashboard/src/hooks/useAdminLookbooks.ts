import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminLookbooksApi, type LookbookPayload } from '../lib/api';

export const ADMIN_LOOKBOOKS_KEY = ['admin', 'lookbooks'] as const;

export function useAdminLookbooks(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...ADMIN_LOOKBOOKS_KEY, params ?? {}] as const,
    queryFn: () => adminLookbooksApi.getLookbooks(params),
    staleTime: 30_000,
  });
}

export function useCreateLookbookMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LookbookPayload) => adminLookbooksApi.createLookbook(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_LOOKBOOKS_KEY });
    },
  });
}

export function useUpdateLookbookMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<LookbookPayload>;
    }) => adminLookbooksApi.updateLookbook(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_LOOKBOOKS_KEY });
    },
  });
}

export function useDeleteLookbookMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminLookbooksApi.deleteLookbook(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_LOOKBOOKS_KEY });
    },
  });
}
