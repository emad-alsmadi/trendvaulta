import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  adminUsersApi,
  type AdminUsersQuery,
  type UserUpdatePayload,
} from '../lib/api';

export const ADMIN_USERS_KEY = ['admin', 'users'] as const;

export function useAdminUsers(params?: AdminUsersQuery) {
  return useQuery({
    queryKey: [...ADMIN_USERS_KEY, params ?? {}] as const,
    queryFn: () => adminUsersApi.getUsers(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useUpdateUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserUpdatePayload }) =>
      adminUsersApi.updateUser(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
    },
  });
}

export function useDeleteUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.deleteUser(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
    },
  });
}
