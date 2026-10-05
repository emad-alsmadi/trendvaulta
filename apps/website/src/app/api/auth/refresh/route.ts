import { NextResponse, type NextRequest } from 'next/server';
import { getTranslation } from '@/lib/i18n-server';
import {
  REFRESH_COOKIE,
  callBackendAuth,
  clearRefreshCookie,
  isSuccessStatus,
  setRefreshCookie,
  splitRefreshToken,
} from '@/lib/serverAuth';

/**
 * POST /api/auth/refresh — exchanges the httpOnly `tv_refresh` cookie for a
 * new access token. The request body is ignored; the backend rotates the
 * refresh token on every call, so the cookie is replaced with the new one.
 * Any failure (missing/expired/reused token) clears the cookie so the client
 * falls through to its normal forced-logout path.
 */
export async function POST(request: NextRequest) {
  const { t } = await getTranslation();

  const presented = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!presented) {
    return clearRefreshCookie(
      NextResponse.json({ message: t('bff.notAuthenticated') }, { status: 401 }),
    );
  }

  const { status, data } = await callBackendAuth(
    '/auth/refresh',
    { refreshToken: presented },
    request.headers.get('x-forwarded-for'),
    t('bff.serviceUnavailable'),
  );
  const { refreshToken, rest } = splitRefreshToken(data);

  if (isSuccessStatus(status) && typeof rest.token === 'string') {
    const res = NextResponse.json(rest, { status });
    return refreshToken ? setRefreshCookie(res, refreshToken) : res;
  }

  return clearRefreshCookie(NextResponse.json(rest, { status }));
}
