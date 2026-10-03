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
    // The whole account area. Old /orders, /account and /profile URLs
    // redirect here (next.config.ts); redirects run before this proxy, so
    // the guard sits on the destination.
    { path: '/user', role: ['user', 'admin', 'moderator'] },
    // /checkout is open: guests check out with an email (plan P0-03, D2)
  ];

  // Whole segments only: /user and /user/orders, not /users.
  const protectedPath = protectedPaths.find(
    (p) => path === p.path || path.startsWith(`${p.path}/`),
  );

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

  return NextResponse.next();
}

export const config = {
  // Also skip public static assets (robots.txt, manifest, images/fonts
  // under /public) — none of them need the auth/role redirect logic above,
  // and running it on every asset request was pure overhead.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|txt|xml|json|woff2?|ttf)$).*)',
  ],
};
