import { NextResponse, type NextRequest } from 'next/server';
import { getBackendApiBase } from '@/lib/serverAuth';
import { AUTH_TOKEN_COOKIE } from '@/lib/authCookies';
import { LOCALE_COOKIE, resolveLocale } from '@/lib/locale';
import { buildLoginUrl } from '@/lib/safeRedirect';

/**
 * GET /user/orders/:id/invoice — the printable invoice as a same-origin page.
 *
 * A plain link can't send the Bearer header the API needs, so this handler
 * reads the access token from the `token` cookie server-side and fetches the
 * HTML from the API. The token never appears in a URL. The API document is
 * self-contained, escapes everything, and forbids scripts via its CSP, which
 * is passed through here.
 *
 * Failures go back to pages that explain them: an expired session to login
 * (then straight back here), anything else to the order page.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const back = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (!/^[a-f0-9]{24}$/i.test(id)) return back('/user/orders');

  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const self = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (!token) return back(buildLoginUrl(self));

  const lang = resolveLocale(
    request.nextUrl.searchParams.get('lang') ?? request.cookies.get(LOCALE_COOKIE)?.value,
  );

  let upstream: Response;
  try {
    upstream = await fetch(`${getBackendApiBase()}/orders/${id}/invoice?lang=${lang}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return back(`/user/orders/${id}`);
  }

  if (upstream.status === 401) return back(buildLoginUrl(self));
  if (upstream.status === 404) return back('/user/orders');
  if (!upstream.ok) return back(`/user/orders/${id}`);

  return new NextResponse(await upstream.text(), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy':
        upstream.headers.get('content-security-policy') || "default-src 'none'; style-src 'unsafe-inline'",
      'X-Robots-Tag': 'noindex',
    },
  });
}
