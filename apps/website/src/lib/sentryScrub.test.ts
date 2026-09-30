import { describe, expect, it } from 'vitest';
import type { ErrorEvent } from '@sentry/nextjs';
import { DATA_COLLECTION, scrubEvent, scrubUrl } from './sentryScrub';

describe('storefront Sentry scrubbing', () => {
  it('filters guest-order, reset and Stripe tokens out of URLs', () => {
    expect(scrubUrl('/guest-order?order=64b7&token=abc123')).toBe(
      '/guest-order?order=[Filtered]&token=[Filtered]',
    );
    expect(scrubUrl('/checkout/success?order_id=1&session_id=cs_live_x')).toBe(
      '/checkout/success?order_id=1&session_id=[Filtered]',
    );
  });

  it('drops bodies, cookies, query strings and auth headers; keeps only the user id', () => {
    const event = scrubEvent({
      type: undefined,
      request: {
        url: 'https://shop.example/auth/verify-email?token=abc',
        data: { password: 'x' },
        cookies: { token: 'jwt' },
        query_string: 'token=abc',
        headers: { Authorization: 'Bearer jwt', Cookie: 'tv_refresh=1', 'User-Agent': 'UA' },
      },
      user: { id: 'u1', email: 'a@b.c' },
      breadcrumbs: [{ data: { from: '/guest-order?token=abc', to: '/cart' } }],
    } as ErrorEvent);

    expect(event.request?.data).toBeUndefined();
    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.query_string).toBeUndefined();
    expect(event.request?.url).toBe('https://shop.example/auth/verify-email');
    expect(event.request?.headers).toEqual({
      Authorization: '[Filtered]',
      Cookie: '[Filtered]',
      'User-Agent': 'UA',
    });
    expect(event.user).toEqual({ id: 'u1' });
    expect(event.breadcrumbs?.[0].data?.from).toBe('/guest-order?token=[Filtered]');
  });

  it('collects nothing sensitive at the source', () => {
    expect(DATA_COLLECTION).toMatchObject({
      userInfo: false,
      cookies: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    });
  });
});
