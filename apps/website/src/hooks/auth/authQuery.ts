import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import {
  clearAuthCookies,
  getAuthToken,
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

/**
 * Shape returned by the Next /api/auth/login + /api/auth/register handlers
 * and /auth/profile (PUT). The handlers keep the backend refresh token in an
 * httpOnly cookie, so it never appears here.
 */
export type AuthResponse = {
  message?: string;
  token?: string;
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

/** Strip credentials before anything from an auth response is cached. */
function toCachedUser(payload: AuthResponse): MeResponse['user'] {
  const src = payload?.user ?? payload;
  if (!src) return null;
  return {
    _id: src._id,
    email: src.email,
    username: src.username,
    roles: src.roles,
  };
}

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
      const roles = payload?.roles || [];
      const role = (roles?.[0] as UserRole) || null;
      if (token) {
        setAuthCookies({ token, role: role || 'user' });
      }
      qc.setQueryData(AUTH_ME_QUERY_KEY, {
        user: toCachedUser(payload),
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
      const roles = payload?.roles || [];
      const role = (roles?.[0] as UserRole) || null;
      if (token && role) {
        setAuthCookies({ token, role });
      }
      qc.setQueryData(AUTH_ME_QUERY_KEY, {
        user: toCachedUser(payload),
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
    // exchanged for a new access token after this browser signs out. The
    // Next handler reads + clears the httpOnly refresh cookie itself.
    await authApi.logout();
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
