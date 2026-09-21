import Cookies from 'js-cookie';

export const AUTH_TOKEN_COOKIE = 'token';
export const AUTH_ROLE_COOKIE = 'userRole';

// Pre-S4 builds kept the 30-day refresh token in this JS-readable cookie.
// It now lives in the httpOnly `tv_refresh` cookie set by the Next auth route
// handlers (src/app/api/auth/*), so any leftover value is only ever removed.
const LEGACY_REFRESH_COOKIE = 'refreshToken';

/**
 * Shared cookie attributes for the short-lived access token + role. Both stay
 * JS-readable (not httpOnly) because src/proxy.ts and the axios request
 * interceptor read them; `sameSite: 'lax'` blocks them on cross-site POSTs
 * and `secure` is on in production builds.
 */
function cookieOptions(days: number): Cookies.CookieAttributes {
  return {
    expires: days,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  };
}

export type UserRole = 'user' | 'admin' | 'moderator' | 'host' | null;

export function getAuthToken() {
  return Cookies.get(AUTH_TOKEN_COOKIE) || null;
}

export function getUserRole(): UserRole {
  const r = Cookies.get(AUTH_ROLE_COOKIE);
  if (!r) return null;
  return r as UserRole;
}

export function setAuthCookies(opts: {
  token: string;
  role: Exclude<UserRole, null>;
  days?: number;
}) {
  const days = opts.days ?? 7;
  Cookies.set(AUTH_TOKEN_COOKIE, opts.token, cookieOptions(days));
  Cookies.set(AUTH_ROLE_COOKIE, opts.role, cookieOptions(days));
  Cookies.remove(LEGACY_REFRESH_COOKIE, { path: '/' });
}

/**
 * Updates only the access token — used after a successful refresh through
 * the Next `/api/auth/refresh` handler. Leaves the role cookie as-is since
 * refresh does not change identity.
 */
export function setAccessToken(token: string) {
  Cookies.set(AUTH_TOKEN_COOKIE, token, cookieOptions(7));
}

export function clearAuthCookies() {
  Cookies.remove(AUTH_TOKEN_COOKIE, { path: '/' });
  Cookies.remove(AUTH_ROLE_COOKIE, { path: '/' });
  Cookies.remove(LEGACY_REFRESH_COOKIE, { path: '/' });
}
