import { NextResponse, type NextRequest } from 'next/server';
import { getBackendApiBase } from '@/lib/serverAuth';
import { resolveLocale } from '@/lib/locale';

/**
 * GET /guest-order/invoice?order=…&token=…&lang=… — a guest's invoice as a
 * same-origin page. The order token (the one in the order email) is sent
 * to the API as X-Guest-Token. Anything else returns to the guest order page.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const orderId = sp.get('order') || '';
  const token = sp.get('token') || '';
  const back = NextResponse.redirect(
    new URL(`/guest-order?${new URLSearchParams({ order: orderId, token })}`, request.url),
  );
  if (!/^[a-f0-9]{24}$/i.test(orderId) || !/^[a-f0-9]{64}$/i.test(token)) return back;

  let upstream: Response;
  try {
    upstream = await fetch(
      `${getBackendApiBase()}/orders/${orderId}/invoice?lang=${resolveLocale(sp.get('lang'))}`,
      { headers: { 'X-Guest-Token': token }, cache: 'no-store' },
    );
  } catch {
    return back;
  }
  if (!upstream.ok) return back;

  return new NextResponse(await upstream.text(), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy':
        upstream.headers.get('content-security-policy') || "default-src 'none'; style-src 'unsafe-inline'",
      'X-Robots-Tag': 'noindex',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
