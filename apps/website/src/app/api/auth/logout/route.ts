import { NextResponse, type NextRequest } from 'next/server';
import {
  REFRESH_COOKIE,
  callBackendAuth,
  clearRefreshCookie,
} from '@/lib/serverAuth';

/**
 * POST /api/auth/logout — revokes the refresh token held in the httpOnly
 * `tv_refresh` cookie (best-effort) and clears the cookie. Always 200: the
 * client clears its own cookies regardless of what the backend says.
 */
export async function POST(request: NextRequest) {
  const presented = request.cookies.get(REFRESH_COOKIE)?.value;
  if (presented) {
    await callBackendAuth(
      '/auth/logout',
      { refreshToken: presented },
      request.headers.get('x-forwarded-for'),
    );
  }
  return clearRefreshCookie(
    NextResponse.json({ message: 'Logged out' }, { status: 200 }),
  );
}
