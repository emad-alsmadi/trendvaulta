import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminContentApi, type ContentPayload } from '../lib/api';

export const ADMIN_CONTENT_KEY = ['admin', 'content'] as const;

export function useAdminContent(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...ADMIN_CONTENT_KEY, params ?? {}] as const,
    queryFn: () => adminContentApi.getContent(params),
    staleTime: 30_000,
  });
}

export function useCreateContentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ContentPayload) =>
      adminContentApi.createContent(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_CONTENT_KEY });
    },
  });
}

export function useUpdateContentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<ContentPayload>;
    }) => adminContentApi.updateContent(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_CONTENT_KEY });
    },
  });
}

export function useDeleteContentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminContentApi.deleteContent(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_CONTENT_KEY });
    },
  });
}
