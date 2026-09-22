import { useMutation, useQueryClient } from '@tanstack/react-query';
import { passwordApi } from '@/lib/api';
import { getAuthToken } from '@/lib/authCookies';

export function useChangePassword() {
  const qc = useQueryClient();
  const isAuthenticated = typeof window !== 'undefined' && !!getAuthToken();

  return useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      if (!isAuthenticated) {
        throw new Error('Not authenticated');
      }
      return await passwordApi.changePassword(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'profile'] });
    },
  });
}