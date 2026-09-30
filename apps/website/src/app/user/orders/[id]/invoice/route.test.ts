// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const ID = '64b7f0c2a1b2c3d4e5f60718';

function call(path: string, cookie = '') {
  const request = new NextRequest(`http://localhost:3001${path}`, {
    headers: cookie ? { cookie } : {},
  });
  const id = path.split('/')[3];
  return GET(request, { params: Promise.resolve({ id }) });
}

function mockUpstream(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /user/orders/:id/invoice', () => {
  it('fetches the invoice with the cookie token as a Bearer header, in the reader language', async () => {
    const fetchMock = mockUpstream(
      new Response('<!DOCTYPE html><html>invoice</html>', {
        status: 200,
        headers: { 'content-security-policy': "default-src 'none'" },
      }),
    );

    const res = await call(`/user/orders/${ID}/invoice`, 'token=abc.def; tv_locale=ar');

    expect(res.status).toBe(200);
    expect(await res.text()).toContain('invoice');
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('content-security-policy')).toBe("default-src 'none'");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(new RegExp(`/api/orders/${ID}/invoice\\?lang=ar$`));
    expect(init.headers).toEqual({ Authorization: 'Bearer abc.def' });
  });

  it('lets ?lang override the locale cookie, and ignores unknown languages', async () => {
    // A Response body can be read once: a fresh one per call
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => new Response('<html></html>', { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await call(`/user/orders/${ID}/invoice?lang=en`, 'token=t; tv_locale=ar');
    await call(`/user/orders/${ID}/invoice?lang=fr`, 'token=t');
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/lang=en$/);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/lang=en$/);
  });

  it('sends a visitor without a session to login and back', async () => {
    const fetchMock = mockUpstream(new Response('', { status: 200 }));
    const res = await call(`/user/orders/${ID}/invoice?lang=ar`);
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location') as string);
    expect(location.pathname).toBe('/auth/login');
    expect(location.searchParams.get('redirect')).toBe(`/user/orders/${ID}/invoice?lang=ar`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats an expired token (401) like no session', async () => {
    mockUpstream(new Response('{}', { status: 401 }));
    const res = await call(`/user/orders/${ID}/invoice`, 'token=old');
    expect(new URL(res.headers.get('location') as string).pathname).toBe('/auth/login');
  });

  it('returns to the order page when there is no invoice yet, or the API is down', async () => {
    mockUpstream(new Response('{"code":"INVOICE_NOT_AVAILABLE"}', { status: 409 }));
    let res = await call(`/user/orders/${ID}/invoice`, 'token=t');
    expect(new URL(res.headers.get('location') as string).pathname).toBe(`/user/orders/${ID}`);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    res = await call(`/user/orders/${ID}/invoice`, 'token=t');
    expect(new URL(res.headers.get('location') as string).pathname).toBe(`/user/orders/${ID}`);
  });

  it('returns to the order list for an unknown or malformed order id', async () => {
    mockUpstream(new Response('{}', { status: 404 }));
    let res = await call(`/user/orders/${ID}/invoice`, 'token=t');
    expect(new URL(res.headers.get('location') as string).pathname).toBe('/user/orders');

    res = await call('/user/orders/not-an-id/invoice', 'token=t');
    expect(new URL(res.headers.get('location') as string).pathname).toBe('/user/orders');
  });
});
