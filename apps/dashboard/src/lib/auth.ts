import Cookies from 'js-cookie';

export const AUTH_TOKEN_COOKIE = 'token';
export const AUTH_ROLE_COOKIE = 'role';
export const AUTH_REFRESH_COOKIE = 'refreshToken';
/** '1' when the admin ticked "Remember me"; decides every cookie's lifetime. */
export const AUTH_REMEMBER_COOKIE = 'rememberSession';

// Matches the API's refresh token TTL (apps/api/utils/refreshTokens.js). The
// access token itself expires server-side after 15 minutes regardless of
// this cookie's lifetime — the refresh flow in lib/api.ts is what keeps the
// admin session alive without asking for re-login constantly.
const REMEMBER_DAYS = 30;

/**
 * `days` undefined = browser-session cookie. All auth cookies share one
 * lifetime so the role cookie can never expire before the token (which
 * showed a bogus "no dashboard access" logout), and an unticked "Remember
 * me" no longer leaves a 30-day refresh token behind.
 * `secure` follows the page protocol so http://localhost dev keeps working.
 */
function cookieOptions(days?: number): Cookies.CookieAttributes {
  return {
    ...(days ? { expires: days } : {}),
    path: '/',
    sameSite: 'lax',
    secure:
      typeof window !== 'undefined' && window.location.protocol === 'https:',
  };
}

function sessionDays(): number | undefined {
  return Cookies.get(AUTH_REMEMBER_COOKIE) === '1' ? REMEMBER_DAYS : undefined;
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
  const days = opts.remember ? REMEMBER_DAYS : undefined;
  if (opts.remember) {
    Cookies.set(AUTH_REMEMBER_COOKIE, '1', cookieOptions(days));
  } else {
    Cookies.remove(AUTH_REMEMBER_COOKIE, { path: '/' });
  }
  Cookies.set(AUTH_TOKEN_COOKIE, opts.token, cookieOptions(days));
  if (opts.role) {
    Cookies.set(AUTH_ROLE_COOKIE, opts.role, cookieOptions(days));
  }
  if (opts.refreshToken) {
    Cookies.set(AUTH_REFRESH_COOKIE, opts.refreshToken, cookieOptions(days));
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
  const days = sessionDays();
  Cookies.set(AUTH_TOKEN_COOKIE, opts.token, cookieOptions(days));
  // Re-set the role with the same lifetime so it stays in step with the token.
  const role = getAuthRole();
  if (role) Cookies.set(AUTH_ROLE_COOKIE, role, cookieOptions(days));
  if (days) Cookies.set(AUTH_REMEMBER_COOKIE, '1', cookieOptions(days));
  if (opts.refreshToken) {
    Cookies.set(AUTH_REFRESH_COOKIE, opts.refreshToken, cookieOptions(days));
  }
}

export function clearAuthSession() {
  Cookies.remove(AUTH_TOKEN_COOKIE, { path: '/' });
  Cookies.remove(AUTH_ROLE_COOKIE, { path: '/' });
  Cookies.remove(AUTH_REFRESH_COOKIE, { path: '/' });
  Cookies.remove(AUTH_REMEMBER_COOKIE, { path: '/' });
}

export function pickPrimaryRole(roles?: string[]): string {
  if (!roles?.length) return 'user';
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('moderator')) return 'moderator';
  return roles[0];
}
