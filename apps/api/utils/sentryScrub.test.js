const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { scrubEvent, scrubUrl } = require('./sentryScrub');

describe('scrubEvent (Sentry beforeSend)', () => {
  it('drops bodies, cookies, query strings and auth headers', () => {
    const event = scrubEvent({
      request: {
        url: 'https://api.example/api/orders/abc?token=deadbeef',
        method: 'POST',
        data: { password: 'hunter2', shippingAddress: { address: '1 Main St' } },
        cookies: { token: 'jwt' },
        query_string: 'token=deadbeef',
        headers: {
          Authorization: 'Bearer jwt',
          Cookie: 'tv_refresh=x',
          'X-Guest-Token': 'f'.repeat(64),
          'stripe-signature': 't=1,v1=x',
          'user-agent': 'Mozilla',
        },
      },
    });

    assert.equal(event.request.data, undefined);
    assert.equal(event.request.cookies, undefined);
    assert.equal(event.request.query_string, undefined);
    assert.equal(event.request.url, 'https://api.example/api/orders/abc');
    assert.equal(event.request.headers.Authorization, '[Filtered]');
    assert.equal(event.request.headers.Cookie, '[Filtered]');
    assert.equal(event.request.headers['X-Guest-Token'], '[Filtered]');
    assert.equal(event.request.headers['stripe-signature'], '[Filtered]');
    assert.equal(event.request.headers['user-agent'], 'Mozilla');
  });

  it('keeps only the user id', () => {
    const event = scrubEvent({ user: { id: 42, email: 'a@b.c', ip_address: '1.2.3.4' } });
    assert.deepEqual(event.user, { id: '42' });
    assert.equal(scrubEvent({ user: { email: 'a@b.c' } }).user, undefined);
  });

  it('masks token-like strings in messages, keeps ordinary words', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyJ9.abc123signature';
    const event = scrubEvent({
      message: `bad token ${jwt}`,
      exception: { values: [{ value: `reset ${'a1'.repeat(20)} failed for InsufficientStockErrorExample` }] },
    });
    assert.equal(event.message.includes(jwt), false);
    assert.match(event.message, /\[Filtered\]/);
    assert.match(event.exception.values[0].value, /\[Filtered\]/);
    assert.match(event.exception.values[0].value, /InsufficientStockErrorExample/);
  });

  it('keeps the route shape of reset-password links', () => {
    assert.equal(
      scrubUrl('/api/password/reset-password/64b7f0c2a1b2/eyJhbGc.x.y?x=1'),
      '/api/password/reset-password/[id]/[token]',
    );
  });
});
