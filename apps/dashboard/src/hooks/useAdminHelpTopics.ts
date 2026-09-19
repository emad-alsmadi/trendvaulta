import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminHelpTopicsApi, type HelpTopicPayload } from '../lib/api';

export const ADMIN_HELP_TOPICS_KEY = ['admin', 'help-topics'] as const;

export function useAdminHelpTopics(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...ADMIN_HELP_TOPICS_KEY, params ?? {}] as const,
    queryFn: () => adminHelpTopicsApi.getHelpTopics(params),
    staleTime: 30_000,
  });
}

export function useCreateHelpTopicMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: HelpTopicPayload) =>
      adminHelpTopicsApi.createHelpTopic(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_HELP_TOPICS_KEY });
    },
  });
}

export function useUpdateHelpTopicMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<HelpTopicPayload>;
    }) => adminHelpTopicsApi.updateHelpTopic(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_HELP_TOPICS_KEY });
    },
  });
}

export function useDeleteHelpTopicMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminHelpTopicsApi.deleteHelpTopic(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_HELP_TOPICS_KEY });
    },
  });
}
