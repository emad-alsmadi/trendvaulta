import { NextResponse, type NextRequest } from 'next/server';
import {
  callBackendAuth,
  isSuccessStatus,
  setRefreshCookie,
  splitRefreshToken,
} from '@/lib/serverAuth';

/**
 * POST /api/auth/register — proxies the backend register endpoint. On success the
 * refresh token is moved into the httpOnly `tv_refresh` cookie and removed
 * from the JSON the browser receives.
 */
export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { message: 'Request body is required' },
      { status: 400 },
    );
  }

  const { status, data } = await callBackendAuth(
    '/auth/register',
    body,
    request.headers.get('x-forwarded-for'),
  );
  const { refreshToken, rest } = splitRefreshToken(data);
  const res = NextResponse.json(rest, { status });
  if (isSuccessStatus(status) && refreshToken) {
    setRefreshCookie(res, refreshToken);
  }
  return res;
}
