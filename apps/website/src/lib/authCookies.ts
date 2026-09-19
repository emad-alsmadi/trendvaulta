import Cookies from 'js-cookie';

export const AUTH_TOKEN_COOKIE = 'token';
export const AUTH_ROLE_COOKIE = 'userRole';
export const AUTH_REFRESH_COOKIE = 'refreshToken';

// Matches the API's refresh token TTL (apps/api/utils/refreshTokens.js).
// The access token itself expires server-side after 15 minutes regardless of
// this cookie's lifetime — this is what keeps the session alive without
// asking the user to log in again every 15 minutes.
const REFRESH_COOKIE_DAYS = 30;

export type UserRole = 'user' | 'admin' | 'moderator' | 'host' | null;

export function getAuthToken() {
  return Cookies.get(AUTH_TOKEN_COOKIE) || null;
}

export function getRefreshToken() {
  return Cookies.get(AUTH_REFRESH_COOKIE) || null;
}

export function getUserRole(): UserRole {
  const r = Cookies.get(AUTH_ROLE_COOKIE);
  if (!r) return null;
  return r as UserRole;
}

export function setAuthCookies(opts: {
  token: string;
  role: Exclude<UserRole, null>;
  refreshToken?: string;
  days?: number;
}) {
  const expires = opts.days ?? 7;
  Cookies.set(AUTH_TOKEN_COOKIE, opts.token, { expires, path: '/' });
  Cookies.set(AUTH_ROLE_COOKIE, opts.role, { expires, path: '/' });
  if (opts.refreshToken) {
    Cookies.set(AUTH_REFRESH_COOKIE, opts.refreshToken, {
      expires: REFRESH_COOKIE_DAYS,
      path: '/',
    });
  }
}

/**
 * Updates only the access token (and, when rotated, the refresh token) —
 * used after a successful /auth/refresh call. Leaves the role cookie as-is
 * since refresh does not change identity.
 */
export function setRefreshedTokens(opts: {
  token: string;
  refreshToken?: string;
}) {
  Cookies.set(AUTH_TOKEN_COOKIE, opts.token, { expires: 7, path: '/' });
  if (opts.refreshToken) {
    Cookies.set(AUTH_REFRESH_COOKIE, opts.refreshToken, {
      expires: REFRESH_COOKIE_DAYS,
      path: '/',
    });
  }
}

export function clearAuthCookies() {
  Cookies.remove(AUTH_TOKEN_COOKIE, { path: '/' });
  Cookies.remove(AUTH_ROLE_COOKIE, { path: '/' });
  Cookies.remove(AUTH_REFRESH_COOKIE, { path: '/' });
}
