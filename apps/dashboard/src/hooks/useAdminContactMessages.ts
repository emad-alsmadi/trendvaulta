import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  adminContactApi,
  type AdminContactMessagesQuery,
  type ContactMessageStatus,
} from '../lib/api';

export const ADMIN_CONTACT_KEY = ['admin', 'contact-messages'] as const;

export function useAdminContactMessages(params?: AdminContactMessagesQuery) {
  return useQuery({
    queryKey: [...ADMIN_CONTACT_KEY, params ?? {}] as const,
    queryFn: () => adminContactApi.getMessages(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

/**
 * Unread count for the sidebar badge: a one-row request whose `counts` cover
 * the whole inbox. Refreshed every minute so new enquiries show up while
 * staff work elsewhere in the dashboard.
 */
export function useUnreadContactCount(enabled: boolean) {
  return useQuery({
    queryKey: [...ADMIN_CONTACT_KEY, 'unread-count'] as const,
    queryFn: async () => {
      const res = await adminContactApi.getMessages({ status: 'new', limit: 1 });
      return res.counts?.new ?? res.meta?.total ?? 0;
    },
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useUpdateContactMessageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      status?: ContactMessageStatus;
      staffNote?: string;
    }) => adminContactApi.updateMessage(id, body),
    onSuccess: async () => {
      // Also refreshes the sidebar badge (same key prefix)
      await qc.invalidateQueries({ queryKey: ADMIN_CONTACT_KEY });
    },
  });
}
