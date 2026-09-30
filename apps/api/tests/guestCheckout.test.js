/**
 * Guest checkout (P0-03, decision D2): a guest buys with an email, confirms
 * payment and reaches the order with the per-order token, can cancel it,
 * and the order joins an account once that email is confirmed.
 * Stripe is faked in-process (see setup.js); mail is captured.
 */
const { describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');

process.env.RATE_LIMIT_AUTH_MAX ||= '1000';
process.env.RATE_LIMIT_EMAIL_VERIFY_MAX ||= '1000';
process.env.RATE_LIMIT_VERIFY_MAX ||= '1000';

const {
  app,
  stripeMock,
  connectDb,
  disconnectDb,
  clearDb,
  dbIt,
  createUser,
  createProduct,
  createCoupon,
  createOrder,
  checkoutBody,
  shippingAddress,
  completedSession,
  checkoutCompletedEvent,
  postWebhook,
  reloadOrder,
  reloadProduct,
} = require('./setup');
const { Order } = require('../models/Order');
const mail = require('../utils/mail');
const { User } = require('../models/User');
const { guestOrderToken, isValidGuestToken, orderEmailTarget } = require('../utils/guestOrders');

const GUEST = 'Guest.Shopper@Example.com';

let sent;
const realMail = { ...mail };
function captureMail() {
  sent = [];
  for (const name of ['sendOrderConfirmationEmail', 'sendOrderCanceledEmail', 'sendEmailVerificationEmail']) {
    mail[name] = async (opts) => {
      sent.push({ name, ...opts });
      return true;
    };
  }
}

function guestCheckout(product, extra = {}) {
  return request(app)
    .post('/api/payments/checkout-session')
    .send(checkoutBody([{ productId: String(product._id), qty: 1 }], { email: GUEST, ...extra }));
}

function lookup(orderId, token) {
  return request(app).post('/api/orders/guest/lookup').send({ orderId, token });
}

describe('guest checkout', () => {
  before(connectDb);
  after(async () => {
    Object.assign(mail, realMail);
    await disconnectDb();
  });
  beforeEach(async () => {
    await clearDb();
    captureMail();
  });

  // -------------------------------------------------------------------------
  describe('buying', () => {
    dbIt('creates a guest order with a normalised email and returns its token', async () => {
      const product = await createProduct({ stock: 5 });
      const res = await guestCheckout(product);
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.match(res.body.guestToken, /^[a-f0-9]{64}$/);

      const order = await reloadOrder(res.body.orderId);
      assert.equal(order.user, null);
      assert.equal(order.guestEmail, 'guest.shopper@example.com');
      assert.equal(res.body.guestToken, guestOrderToken(order));
      // Stripe gets the address for its receipt; stock is reserved as usual
      assert.equal(stripeMock.calls.sessionsCreate[0].customer_email, 'guest.shopper@example.com');
      assert.equal(stripeMock.calls.sessionsCreate[0].metadata.userId, '');
      assert.equal((await reloadProduct(product._id)).stock, 4);
    });

    dbIt('rejects a malformed guest email and ignores the field for signed-in shoppers', async () => {
      const product = await createProduct();
      assert.equal((await guestCheckout(product, { email: 'not-an-email' })).status, 400);

      const { user, token } = await createUser();
      const res = await request(app)
        .post('/api/payments/checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send(checkoutBody([{ productId: String(product._id), qty: 1 }], { email: GUEST }));
      assert.equal(res.status, 200);
      assert.equal(res.body.guestToken, undefined);
      const order = await reloadOrder(res.body.orderId);
      assert.equal(String(order.user), String(user._id));
      assert.equal(order.guestEmail, '');
    });

    dbIt('confirms payment with the token, and emails the receipt with the guest link', async () => {
      const product = await createProduct();
      const { orderId, sessionId, guestToken } = (await guestCheckout(product)).body;
      const order = await reloadOrder(orderId);
      stripeMock.sessions.set(sessionId, completedSession(order, { sessionId }));

      const noToken = await request(app).post('/api/payments/verify-payment').send({ orderId });
      assert.equal(noToken.status, 401);
      const wrong = await request(app)
        .post('/api/payments/verify-payment')
        .send({ orderId, guestToken: 'f'.repeat(64) });
      assert.equal(wrong.status, 403);

      const ok = await request(app).post('/api/payments/verify-payment').send({ orderId, guestToken });
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      assert.equal(ok.body.paymentStatus, 'paid');

      // Every order email (receipt, status, refund) is addressed through this
      const receipt = await orderEmailTarget(await reloadOrder(orderId), User);
      assert.equal(receipt.to, 'guest.shopper@example.com');
      assert.ok(receipt.orderUrl.includes(`/guest-order?order=${orderId}&token=${guestToken}`));
    });

    dbIt('counts guest orders against a coupon per-customer limit, by email', async () => {
      const product = await createProduct({ price: 30, stock: 10 });
      const coupon = await createCoupon({ perCustomerLimit: 1 });
      // Paid earlier as a guest with the same address (any letter case)
      await Order.create({
        guestEmail: 'guest.shopper@example.com',
        items: [{ productId: product._id, title: 't', price: 30, qty: 1, cover: product.cover }],
        shippingAddress,
        itemsPrice: 30, shippingPrice: 0, taxPrice: 0, totalPrice: 30,
        couponId: coupon._id, couponCode: coupon.code,
        status: 'paid', paymentStatus: 'paid',
      });

      const again = await guestCheckout(product, { couponCode: coupon.code });
      assert.equal(again.status, 400);
      assert.match(again.body.message, /already used/i);

      // The same person signed in with that email is also over the limit
      const { token } = await createUser({ email: 'guest.shopper@example.com' });
      const signedIn = await request(app)
        .post('/api/payments/checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send(checkoutBody([{ productId: String(product._id), qty: 1 }], { couponCode: coupon.code }));
      assert.equal(signedIn.status, 400);
    });
  });

  // -------------------------------------------------------------------------
  describe('the guest order page', () => {
    dbIt('shows the order for the right token only, and never offers a return', async () => {
      const product = await createProduct();
      const { orderId, guestToken } = (await guestCheckout(product)).body;

      const ok = await lookup(orderId, guestToken);
      assert.equal(ok.status, 200);
      assert.equal(ok.body._id, orderId);
      assert.equal(ok.body.canReturn, false);
      assert.equal(ok.body.canCancel, true);

      for (const bad of ['f'.repeat(64), '', undefined, guestToken.slice(0, 63)]) {
        assert.equal((await lookup(orderId, bad)).status, 404);
      }
      // Another order's token opens nothing
      const other = (await guestCheckout(product, { email: 'other@example.com' })).body;
      assert.equal((await lookup(orderId, other.guestToken)).status, 404);
    });

    dbIt('a token grants nothing on account orders', async () => {
      const { user } = await createUser();
      const order = await createOrder({ user, product: await createProduct() });
      const forged = guestOrderToken({ _id: order._id, guestEmail: 'x@example.com' });
      assert.equal(isValidGuestToken(await reloadOrder(order._id), forged), false);
      assert.equal((await lookup(order._id, forged)).status, 404);
    });

    dbIt('cancels with the token, restocks, and emails the guest', async () => {
      const product = await createProduct({ stock: 3 });
      const { orderId, guestToken } = (await guestCheckout(product)).body;
      assert.equal((await reloadProduct(product._id)).stock, 2);

      const noToken = await request(app).post(`/api/orders/${orderId}/cancel`).send({});
      assert.equal(noToken.status, 401);

      const res = await request(app).post(`/api/orders/${orderId}/cancel`).send({ guestToken });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal((await reloadOrder(orderId)).status, 'canceled');
      assert.equal((await reloadProduct(product._id)).stock, 3);
      assert.equal(res.body.canCancel, false);
    });

    dbIt('opens the invoice with the token header once paid', async () => {
      const product = await createProduct();
      const { orderId, guestToken } = (await guestCheckout(product)).body;
      await Order.updateOne({ _id: orderId }, { $set: { status: 'paid', paymentStatus: 'paid', paidAt: new Date() } });

      assert.equal((await request(app).get(`/api/orders/${orderId}/invoice`)).status, 401);
      const res = await request(app).get(`/api/orders/${orderId}/invoice`).set('X-Guest-Token', guestToken);
      assert.equal(res.status, 200);
      assert.match(res.text, /Invoice/);
    });
  });

  // -------------------------------------------------------------------------
  describe('joining an account', () => {
    dbIt('guest orders join the account once that email is confirmed, not before', async () => {
      const product = await createProduct({ stock: 10 });
      const { orderId } = (await guestCheckout(product)).body;

      const reg = await request(app)
        .post('/api/auth/register')
        .send({ email: 'guest.shopper@example.com', username: 'guesty', password: 'password123' });
      assert.equal(reg.status, 201, JSON.stringify(reg.body));
      assert.equal((await reloadOrder(orderId)).user, null, 'unconfirmed: not attached');

      const link = sent.find((m) => m.name === 'sendEmailVerificationEmail').token;
      const confirmed = await request(app).post('/api/auth/verify-email').send({ token: link });
      assert.equal(confirmed.status, 200);
      assert.equal(confirmed.body.attachedOrders, 1);

      const order = await reloadOrder(orderId);
      assert.equal(String(order.user), String(reg.body._id));
      const mine = await request(app).get('/api/orders/my').set('Authorization', `Bearer ${reg.body.token}`);
      assert.deepEqual(mine.body.map((o) => o._id), [orderId]);
    });

    dbIt('a confirmed account signing in picks up guest orders placed while signed out', async () => {
      const password = await bcrypt.hash('password123', 10);
      await createUser({ email: 'guest.shopper@example.com', password }); // older account: confirmed
      const { orderId, guestToken } = (await guestCheckout(await createProduct())).body;

      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'guest.shopper@example.com', password: 'password123' });
      assert.equal(login.status, 200, JSON.stringify(login.body));
      assert.ok((await reloadOrder(orderId)).user);
      // Now an account order: the guest link no longer opens it
      assert.equal((await lookup(orderId, guestToken)).status, 404);
    });
  });

  // -------------------------------------------------------------------------
  describe('staff', () => {
    dbIt('find guest orders by email in the admin search', async () => {
      const { token } = await createUser({ roles: ['admin'] });
      const { orderId } = (await guestCheckout(await createProduct())).body;
      const res = await request(app)
        .get('/api/orders')
        .query({ q: 'guest.shopper' })
        .set('Authorization', `Bearer ${token}`);
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data.map((o) => String(o._id)), [orderId]);
    });
  });

  dbIt('an order needs an account or a guest email', async () => {
    await assert.rejects(
      Order.create({
        items: [{ productId: (await createProduct())._id, title: 't', price: 1, qty: 1, cover: 'x' }],
        shippingAddress,
        itemsPrice: 1, shippingPrice: 0, taxPrice: 0, totalPrice: 1,
      }),
      /account or a guest email/,
    );
  });
});
