import { useMutation } from '@tanstack/react-query';
import { passwordApi } from '@/lib/api';

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: async (email: string) => {
      return await passwordApi.forgotPassword(email);
    },
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: async (vars: { userId: string; token: string; password: string }) => {
      return await passwordApi.resetPassword(vars.userId, vars.token, vars.password);
    },
  });
}
