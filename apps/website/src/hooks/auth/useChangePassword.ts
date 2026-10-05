import { useMutation, useQueryClient } from '@tanstack/react-query';
import { passwordApi } from '@/lib/api';

// Not exported: the caller (app/user/security/page.tsx) checks auth itself
// before calling mutate, where it has a translator — a plain `Error` thrown
// from inside the mutation function has no locale and showed up in English
// regardless of the reader's language (WEB-505).
export function useChangePassword() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      return await passwordApi.changePassword(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'profile'] });
    },
  });
}