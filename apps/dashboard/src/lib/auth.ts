import Cookies from 'js-cookie';

export const AUTH_TOKEN_COOKIE = 'token';
export const AUTH_ROLE_COOKIE = 'role';
export const AUTH_REFRESH_COOKIE = 'refreshToken';

// Matches the API's refresh token TTL (apps/api/utils/refreshTokens.js). The
// access token itself expires server-side after 15 minutes regardless of
// this cookie's lifetime — the refresh flow in lib/api.ts is what keeps the
// admin session alive without asking for re-login constantly.
const REFRESH_COOKIE_DAYS = 30;

/** `secure` follows the page protocol so http://localhost dev keeps working. */
function cookieOptions(days: number): Cookies.CookieAttributes {
  return {
    expires: days,
    path: '/',
    sameSite: 'lax',
    secure:
      typeof window !== 'undefined' && window.location.protocol === 'https:',
  };
}

export function getAuthToken(): string | undefined {
  return Cookies.get(AUTH_TOKEN_COOKIE);
}

export function getRefreshToken(): string | undefined {
  return Cookies.get(AUTH_REFRESH_COOKIE);
}

export function getAuthRole(): string | undefined {
  return Cookies.get(AUTH_ROLE_COOKIE);
}

export function setAuthSession(opts: {
  token: string;
  role?: string;
  refreshToken?: string;
  remember?: boolean;
}) {
  const expires = opts.remember ? 30 : 1;
  Cookies.set(AUTH_TOKEN_COOKIE, opts.token, cookieOptions(expires));
  if (opts.role) {
    Cookies.set(AUTH_ROLE_COOKIE, opts.role, cookieOptions(expires));
  }
  if (opts.refreshToken) {
    Cookies.set(
      AUTH_REFRESH_COOKIE,
      opts.refreshToken,
      cookieOptions(REFRESH_COOKIE_DAYS),
    );
  }
}

/**
 * Updates only the access token (and, when rotated, the refresh token) —
 * used after a successful /auth/refresh call.
 */
export function setRefreshedTokens(opts: {
  token: string;
  refreshToken?: string;
}) {
  Cookies.set(AUTH_TOKEN_COOKIE, opts.token, cookieOptions(1));
  if (opts.refreshToken) {
    Cookies.set(
      AUTH_REFRESH_COOKIE,
      opts.refreshToken,
      cookieOptions(REFRESH_COOKIE_DAYS),
    );
  }
}

export function clearAuthSession() {
  Cookies.remove(AUTH_TOKEN_COOKIE, { path: '/' });
  Cookies.remove(AUTH_ROLE_COOKIE, { path: '/' });
  Cookies.remove(AUTH_REFRESH_COOKIE, { path: '/' });
}

export function pickPrimaryRole(roles?: string[]): string {
  if (!roles?.length) return 'user';
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('moderator')) return 'moderator';
  return roles[0];
}
