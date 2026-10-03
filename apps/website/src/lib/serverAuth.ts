import { NextResponse, type NextRequest } from 'next/server';
import { getSiteUrl } from './site';

/**
 * Server-side helpers for the Next auth route handlers
 * (src/app/api/auth/{login,register,refresh,logout}/route.ts).
 *
 * The browser never sees the backend refresh token: the handlers proxy the
 * backend auth endpoints, keep the refresh token in the httpOnly `tv_refresh`
 * cookie (scoped to `/api/auth` so it is only ever sent to these handlers)
 * and strip it from the JSON returned to the client.
 *
 * Everything here is import-safe on the client (only a type import from
 * `next/server`) so `normalizeApiBase` can be shared with src/lib/api.ts.
 */

/**
 * Normalizes the API base URL to ensure it ends with /api
 * @param rawBaseUrl - The raw base URL from environment variables
 * @returns Normalized base URL with /api suffix
 */
export function normalizeApiBase(rawBaseUrl: string | undefined) {
  if (!rawBaseUrl) return '/api';

  const trimmed = rawBaseUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

/**
 * Absolute backend base the route handlers call server-to-server.
 * API_INTERNAL_URL (server-only, e.g. an internal Docker hostname) wins over
 * the public NEXT_PUBLIC_API_URL; a relative "/api" is never usable here.
 */
export function getBackendApiBase() {
  return normalizeApiBase(
    process.env.API_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3000',
  );
}

export const REFRESH_COOKIE = 'tv_refresh';

// Matches the API's refresh token TTL (apps/api/utils/refreshTokens.js).
const REFRESH_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  };
}

export function setRefreshCookie(res: NextResponse, value: string) {
  res.cookies.set(REFRESH_COOKIE, value, refreshCookieOptions());
  return res;
}

export function clearRefreshCookie(res: NextResponse) {
  res.cookies.set(REFRESH_COOKIE, '', { ...refreshCookieOptions(), maxAge: 0 });
  return res;
}

export type BackendAuthResult = {
  status: number;
  data: Record<string, unknown>;
};

const SERVICE_UNAVAILABLE_MESSAGE =
  'Authentication service is unavailable. Please try again.';

/**
 * POSTs a JSON body to a backend auth endpoint and returns its status + JSON.
 * Never throws: a network failure or a non-JSON reply becomes a 502 with a
 * user-safe message so the raw error is not forwarded to the browser.
 */
export async function callBackendAuth(
  path: string,
  body: unknown,
  forwardedFor?: string | null,
): Promise<BackendAuthResult> {
  try {
    const res = await fetch(`${getBackendApiBase()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}),
      },
      body: JSON.stringify(body ?? {}),
      cache: 'no-store',
    });
    const data: unknown = await res.json().catch(() => null);
    return {
      status: res.status,
      data:
        data && typeof data === 'object' && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : { message: res.ok ? 'OK' : SERVICE_UNAVAILABLE_MESSAGE },
    };
  } catch {
    return { status: 502, data: { message: SERVICE_UNAVAILABLE_MESSAGE } };
  }
}

/** Pulls the refresh token out of a backend auth payload. */
export function splitRefreshToken(data: Record<string, unknown>) {
  const { refreshToken, ...rest } = data;
  return {
    refreshToken: typeof refreshToken === 'string' ? refreshToken : null,
    rest,
  };
}

export function isSuccessStatus(status: number) {
  return status >= 200 && status < 300;
}

/**
 * Guards a same-origin-only BFF route (login/register) against being used
 * as a fire-and-forget request amplifier from an arbitrary page: a
 * cross-site `fetch()` can't read the JSON back (no CORS headers here),
 * but without this check the request still executes server-side and burns
 * the backend's IP-based rate-limit budget, or probes for valid emails.
 *
 * Mirrors the API's own corsAllowlist.js policy: a request with no Origin
 * header (curl, server-to-server, same-origin navigations in some browsers)
 * is allowed through — only a *present but mismatched* Origin is rejected.
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  const normalized = origin.replace(/\/+$/, '');
  const site = getSiteUrl();
  if (normalized === site) return true;
  if (process.env.NODE_ENV !== 'production') {
    return ['http://localhost:3001', 'http://127.0.0.1:3001'].includes(normalized);
  }
  return false;
}

/**
 * Rejects a request to a same-origin-only BFF route when its Content-Type
 * isn't JSON or its Origin doesn't match this site. Returns the response to
 * send (and bail out with) or null when the request may proceed.
 */
export function rejectCrossOriginJson(request: NextRequest): NextResponse | null {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ message: 'Unsupported content type' }, { status: 415 });
  }
  if (!isAllowedOrigin(request.headers.get('origin'))) {
    return NextResponse.json({ message: 'Origin not allowed' }, { status: 403 });
  }
  return null;
}
