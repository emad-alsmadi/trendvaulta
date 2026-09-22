import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { getAuthToken } from '@/lib/authCookies';

export const PROFILE_KEY = ['auth', 'profile'] as const;

export function useProfile() {
  const token = getAuthToken();

  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => authApi.profile(),
    enabled: Boolean(token),
    staleTime: 30_000,
  });
}

export function useUpdateProfile() {
  // This will be implemented when needed
  return { mutateAsync: async () => {} };
}