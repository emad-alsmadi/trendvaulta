/**
 * Email language (P1-02): which language each recipient gets, and the
 * endpoint that records it. Mail itself is off in tests; rendering is
 * covered by utils/emailTemplates.test.js.
 */
const { describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const {
  app,
  connectDb,
  disconnectDb,
  clearDb,
  dbIt,
  createUser,
  createProduct,
  createOrder,
  checkoutBody,
  reloadOrder,
} = require('./setup');
const { User } = require('../models/User');
const { localeForOrder, localeForEmail } = require('../utils/mail');

describe('email language', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(clearDb);

  dbIt('PUT /auth/locale records the language for a signed-in customer only', async () => {
    const { user, token } = await createUser();
    const put = (body, t = token) =>
      request(app).put('/api/auth/locale').set('Authorization', `Bearer ${t}`).send(body);

    const ok = await put({ locale: 'ar' });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.locale, 'ar');
    assert.equal((await User.findById(user._id).lean()).locale, 'ar');

    assert.equal((await put({ locale: 'fr' })).status, 400);
    assert.equal((await put({})).status, 400);
    assert.equal((await request(app).put('/api/auth/locale').send({ locale: 'ar' })).status, 401);
  });

  dbIt('an account email follows the account language; unknown addresses get English', async () => {
    await createUser({ email: 'layla@example.com', locale: 'ar' });
    await createUser({ email: 'ada@example.com' });
    assert.equal(await localeForEmail('layla@example.com'), 'ar');
    assert.equal(await localeForEmail('LAYLA@example.com'), 'ar');
    assert.equal(await localeForEmail('ada@example.com'), 'en');
    assert.equal(await localeForEmail('nobody@example.com'), 'en');
  });

  dbIt("an order email uses the account's language over the order's", async () => {
    const { user } = await createUser({ locale: 'ar' });
    const order = await createOrder({ user, product: await createProduct(), locale: 'en' });
    assert.equal(await localeForOrder(order._id), 'ar');
  });

  dbIt('a guest checkout stores the storefront language, which its emails use', async () => {
    const product = await createProduct();
    const res = await request(app)
      .post('/api/payments/checkout-session')
      .send(checkoutBody([{ productId: String(product._id), qty: 1 }], { email: 'guest@example.com', locale: 'ar' }));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((await reloadOrder(res.body.orderId)).locale, 'ar');
    assert.equal(await localeForOrder(res.body.orderId), 'ar');

    const bad = await request(app)
      .post('/api/payments/checkout-session')
      .send(checkoutBody([{ productId: String(product._id), qty: 1 }], { email: 'guest@example.com', locale: 'fr' }));
    assert.equal(bad.status, 400);
  });

  dbIt('new accounts and orders default to English', async () => {
    const { user } = await createUser();
    assert.equal((await User.findById(user._id).lean()).locale, 'en');
    const order = await createOrder({ user, product: await createProduct() });
    assert.equal((await reloadOrder(order._id)).locale, 'en');
  });
});
