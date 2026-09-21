import type { NextResponse } from 'next/server';

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
