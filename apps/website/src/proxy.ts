import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  REDIRECT_PARAM,
  buildLoginUrl,
  getSafeRedirectPath,
} from '@/lib/safeRedirect';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const publicAuthPages = ['/auth/login', '/auth/signup'];

  const protectedPaths: Array<{ path: string; role: string | string[] }> = [
    { path: '/profile', role: ['user', 'admin', 'moderator'] },
    { path: '/welcome', role: ['user', 'admin', 'moderator'] },
    { path: '/orders', role: ['user', 'admin', 'moderator'] },
    { path: '/checkout', role: ['user', 'admin', 'moderator'] },
  ];

  const protectedPath = protectedPaths.find((p) => path.startsWith(p.path));

  const token = request.cookies.get('token')?.value;
  const userRole = request.cookies.get('userRole')?.value;

  // Scenario 1: Authenticated user trying to access auth pages - redirect to appropriate page
  if (publicAuthPages.some((p) => path.startsWith(p))) {
    if (token && userRole) {
      // Already signed in: honour a pending ?redirect= (e.g. back to
      // /checkout/success?order_id=…), otherwise go home. Admin management
      // lives entirely in the dashboard app, not here.
      const target =
        getSafeRedirectPath(request.nextUrl.searchParams.get(REDIRECT_PARAM)) ||
        '/';
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  // Scenario 2: Protected routes - check authentication and authorization
  if (protectedPath) {
    // Keep the intended destination (path + query, e.g. order_id after
    // returning from Stripe) so login can send the user straight back.
    if (!token || !userRole) {
      const returnTo = `${path}${request.nextUrl.search}`;
      return NextResponse.redirect(new URL(buildLoginUrl(returnTo), request.url));
    }

    const requiredRole = protectedPath.role;
    if (Array.isArray(requiredRole)) {
      if (!requiredRole.includes(userRole)) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    } else {
      if (userRole !== requiredRole) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
  }

  // Scenario 3: Welcome page should only be accessible immediately after login
  if (path === '/welcome') {
    if (!token || !userRole) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Check if this is a fresh login or signup (has redirect param or from login page)
    const isFromLogin =
      request.nextUrl.searchParams.has('redirected') ||
      request.headers.get('referer')?.includes('/auth');

    if (!isFromLogin) {
      // If not from login, redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
