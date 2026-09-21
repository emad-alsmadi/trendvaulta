export const REDIRECT_PARAM = 'redirect';

/**
 * Only same-origin, path-style targets are honoured (blocks open redirects
 * such as `//evil.example` or `https://…`). Returns null when unusable.
 */
export function getSafeRedirectPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\')) return null;
  if (/[\r\n]/.test(v)) return null;
  if (v.startsWith('/auth/')) return null;
  return v;
}

/** `/auth/login?redirect=<current path + query>` */
export function buildLoginUrl(returnTo: string): string {
  const safe = getSafeRedirectPath(returnTo);
  if (!safe || safe === '/') return '/auth/login';
  return `/auth/login?${REDIRECT_PARAM}=${encodeURIComponent(safe)}`;
}
