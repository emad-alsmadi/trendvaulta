import Cookies from 'js-cookie';

export const AUTH_TOKEN_COOKIE = 'token';
export const AUTH_ROLE_COOKIE = 'userRole';

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
  const expires = opts.days ?? 7;
  Cookies.set(AUTH_TOKEN_COOKIE, opts.token, { expires, path: '/' });
  Cookies.set(AUTH_ROLE_COOKIE, opts.role, { expires, path: '/' });
}

export function clearAuthCookies() {
  Cookies.remove(AUTH_TOKEN_COOKIE, { path: '/' });
  Cookies.remove(AUTH_ROLE_COOKIE, { path: '/' });
}
