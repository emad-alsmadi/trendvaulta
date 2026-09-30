import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  adminContactApi,
  adminSubscribersApi,
  type ContactMessageStatus,
  type SubscriberStatus,
} from '../lib/api';

export const ADMIN_CONTACT_KEY = ['admin', 'contact-messages'] as const;
export const ADMIN_SUBSCRIBERS_KEY = ['admin', 'subscribers'] as const;

export function useAdminContactMessages(params: {
  page?: number;
  limit?: number;
  status?: ContactMessageStatus;
}) {
  return useQuery({
    queryKey: [...ADMIN_CONTACT_KEY, params] as const,
    queryFn: () => adminContactApi.getMessages(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useUpdateContactStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactMessageStatus }) =>
      adminContactApi.updateStatus(id, status),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_CONTACT_KEY });
    },
  });
}

export function useAdminSubscribers(params: {
  page?: number;
  limit?: number;
  status?: SubscriberStatus;
}) {
  return useQuery({
    queryKey: [...ADMIN_SUBSCRIBERS_KEY, params] as const,
    queryFn: () => adminSubscribersApi.getSubscribers(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
