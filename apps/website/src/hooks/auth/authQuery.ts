import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import {
  clearAuthCookies,
  getAuthToken,
  getRefreshToken,
  getUserRole,
  setAuthCookies,
  type UserRole,
} from '@/lib/authCookies';

export const AUTH_ME_QUERY_KEY = ['auth', 'me'] as const;

export type MeResponse = {
  user: {
    _id?: string;
    email?: string;
    username?: string;
    roles?: string[];
  } | null;
  permissions?: string[];
};

/** Shape returned by /auth/login, /auth/register, /auth/profile (PUT) */
export type AuthResponse = {
  message?: string;
  token?: string;
  refreshToken?: string;
  _id?: string;
  email?: string;
  username?: string;
  roles?: string[];
  user?: {
    _id?: string;
    email?: string;
    username?: string;
    roles?: string[];
  };
};

export function useMe() {
  const token = getAuthToken();

  return useQuery<MeResponse>({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: async () => {
      const res = await authApi.profile();
      return res as MeResponse;
    },
    enabled: Boolean(token),
    retry: 1,
    staleTime: 30_000,
  });
}

export function useLoginMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const res = await authApi.login(payload);
      return res as AuthResponse;
    },
    onSuccess: async (payload: AuthResponse) => {
      const token = payload?.token || null;
      const refreshToken = payload?.refreshToken || null;
      const roles = payload?.roles || [];
      const role = (roles?.[0] as UserRole) || null;
      if (token) {
        setAuthCookies({ token, role: role || 'user', refreshToken: refreshToken || undefined });
      }
      qc.setQueryData(AUTH_ME_QUERY_KEY, {
        user: payload || null,
        permissions: [],
      } satisfies MeResponse);
      await qc.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
    },
  });
}

export function useRegisterMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      email: string;
      username: string;
      password: string;
    }) => {
      const res = await authApi.register(payload);
      return res as AuthResponse;
    },
    onSuccess: async (payload: AuthResponse) => {
      const token = payload?.token || null;
      const refreshToken = payload?.refreshToken || null;
      const roles = payload?.roles || [];
      const role = (roles?.[0] as UserRole) || null;
      if (token && role) {
        setAuthCookies({ token, role, refreshToken: refreshToken || undefined });
      }
      qc.setQueryData(AUTH_ME_QUERY_KEY, {
        user: payload || null,
        permissions: [],
      } satisfies MeResponse);
      await qc.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { username: string; email: string }) => {
      const res = await authApi.updateProfile(payload);
      return res as AuthResponse;
    },
    onSuccess: async (payload: AuthResponse) => {
      qc.setQueryData(AUTH_ME_QUERY_KEY, {
        user: payload?.user || null,
        permissions: [],
      } satisfies MeResponse);
      await qc.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();

  return async () => {
    // Revoke server-side first (best-effort) so the refresh token can't be
    // exchanged for a new access token after this browser signs out.
    const refreshToken = getRefreshToken();
    await authApi.logout(refreshToken);
    clearAuthCookies();
    qc.setQueryData(AUTH_ME_QUERY_KEY, {
      user: null,
      permissions: [],
    } satisfies MeResponse);
    await qc.resetQueries({ queryKey: AUTH_ME_QUERY_KEY });
  };
}

export function getClientAuthRole(): UserRole {
  return getUserRole();
}
