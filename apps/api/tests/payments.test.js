/**
 * Payment flow integration tests: checkout-session, webhook idempotency,
 * the verify-payment/webhook race, oversell handling, quotes and rate-limit
 * bucket isolation. Stripe is faked in-process (see setup.js).
 */
const { describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');

const {
  app,
  models: { Order, Product, Coupon, StripeWebhookEvent },
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
  completedSession,
  checkoutCompletedEvent,
  postWebhook,
  reloadProduct,
  reloadOrder,
} = require('./setup');

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

function postCheckout(token, body) {
  return request(app)
    .post('/api/payments/checkout-session')
    .set(auth(token))
    .send(body);
}

describe('payments API', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(clearDb);

  // -------------------------------------------------------------------------
  describe('POST /api/payments/checkout-session', () => {
    dbIt('creates a pending order priced server-side (client price ignored)', async () => {
      const { user, token } = await createUser();
      const product = await createProduct({ price: 25, stock: 10 });

      const res = await postCheckout(
        token,
        checkoutBody([
          { productId: String(product._id), qty: 2, price: 1, title: 'hacked' },
        ]),
      );

      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.ok(res.body.orderId);
      assert.match(res.body.sessionId, /^cs_test_/);
      assert.match(res.body.url, /^https:\/\/checkout\.stripe\.test\//);

      const order = await reloadOrder(res.body.orderId);
      assert.equal(String(order.user), String(user._id));
      assert.equal(order.status, 'pending');
      assert.equal(order.paymentStatus, 'pending');
      assert.equal(order.items.length, 1);
      assert.equal(order.items[0].price, 25);
      assert.equal(order.items[0].qty, 2);
      assert.equal(order.items[0].title, product.title);
      assert.equal(order.itemsPrice, 50);
      assert.equal(order.totalPrice, 50);
      assert.equal(order.stripeSessionId, res.body.sessionId);
      assert.equal(order.stockDecremented, false);

      // Stripe received the server price, in cents
      assert.equal(stripeMock.calls.sessionsCreate.length, 1);
      const params = stripeMock.calls.sessionsCreate[0];
      assert.equal(params.mode, 'payment');
      assert.equal(params.client_reference_id, String(order._id));
      assert.equal(params.metadata.orderId, String(order._id));
      assert.equal(params.line_items[0].price_data.unit_amount, 2500);
      assert.equal(params.line_items[0].quantity, 2);

      // Stock is never reserved before payment
      assert.equal((await reloadProduct(product._id)).stock, 10);
    });

    dbIt('rejects a variant product ordered without a variant (400)', async () => {
      const { token } = await createUser();
      const product = await createProduct({
        variants: [
          { size: 'M', stock: 3, sku: 'SKU-M' },
          { size: 'L', stock: 3, sku: 'SKU-L' },
        ],
      });

      const res = await postCheckout(
        token,
        checkoutBody([{ productId: String(product._id), qty: 1 }]),
      );

      assert.equal(res.status, 400);
      assert.match(res.body.message, /variant selection required/i);
      assert.equal(await Order.countDocuments(), 0);
      assert.equal(stripeMock.calls.sessionsCreate.length, 0);
    });

    dbIt('rejects qty above available stock (400)', async () => {
      const { token } = await createUser();
      const product = await createProduct({ stock: 2 });

      const res = await postCheckout(
        token,
        checkoutBody([{ productId: String(product._id), qty: 3 }]),
      );

      assert.equal(res.status, 400);
      assert.match(res.body.message, /insufficient stock/i);
      assert.equal(await Order.countDocuments(), 0);
      assert.equal(stripeMock.calls.sessionsCreate.length, 0);
    });

    dbIt('requires authentication (401)', async () => {
      const product = await createProduct();
      const res = await request(app)
        .post('/api/payments/checkout-session')
        .send(checkoutBody([{ productId: String(product._id), qty: 1 }]));

      assert.equal(res.status, 401);
      assert.equal(await Order.countDocuments(), 0);
    });
  });

  // -------------------------------------------------------------------------
  describe('webhook idempotency', () => {
    dbIt('processes checkout.session.completed once; replay is a duplicate no-op', async () => {
      const { user } = await createUser();
      const product = await createProduct({ stock: 10 });
      const order = await createOrder({ user, product, qty: 2 });
      const event = checkoutCompletedEvent(completedSession(order));

      const first = await postWebhook(request, event);
      assert.equal(first.status, 200);
      assert.deepEqual(first.body, { received: true });

      const second = await postWebhook(request, event);
      assert.equal(second.status, 200);
      assert.deepEqual(second.body, { received: true, duplicate: true });

      assert.equal((await reloadProduct(product._id)).stock, 8);

      const updated = await reloadOrder(order._id);
      assert.equal(updated.paymentStatus, 'paid');
      assert.equal(updated.status, 'paid');
      assert.equal(updated.stockDecremented, true);
      assert.equal(updated.paymentIntentId, 'pi_test_1');

      const rows = await StripeWebhookEvent.find({ eventId: event.id }).lean();
      assert.equal(rows.length, 1);
      assert.equal(rows[0].type, 'checkout.session.completed');
      assert.equal(rows[0].orderId, String(order._id));
      assert.equal(rows[0].status, 'processed');
    });
  });

  // -------------------------------------------------------------------------
  describe('double mark-paid race (webhook + verify-payment)', () => {
    dbIt('applies stock, coupon and salesCount side-effects exactly once', async () => {
      const { token } = await createUser();
      const product = await createProduct({ price: 25, stock: 10 });
      const coupon = await createCoupon({ discountType: 'fixed', discountValue: 5 });

      const checkout = await postCheckout(
        token,
        checkoutBody([{ productId: String(product._id), qty: 1 }], {
          couponCode: coupon.code,
        }),
      );
      assert.equal(checkout.status, 200, JSON.stringify(checkout.body));
      const { orderId, sessionId } = checkout.body;

      const order = await reloadOrder(orderId);
      assert.equal(order.discountAmount, 5);
      assert.equal(order.totalPrice, 20);
      assert.equal(String(order.couponId), String(coupon._id));

      const session = completedSession(order, { sessionId, paymentIntentId: 'pi_race' });
      stripeMock.sessions.set(sessionId, session);

      const [webhookRes, verifyRes] = await Promise.all([
        postWebhook(request, checkoutCompletedEvent(session)),
        request(app)
          .post('/api/payments/verify-payment')
          .set(auth(token))
          .send({ orderId }),
      ]);

      assert.equal(webhookRes.status, 200, JSON.stringify(webhookRes.body));
      assert.equal(verifyRes.status, 200, JSON.stringify(verifyRes.body));
      assert.equal(verifyRes.body.paymentStatus, 'paid');

      const paid = await reloadOrder(orderId);
      assert.equal(paid.paymentStatus, 'paid');
      assert.equal(paid.status, 'paid');
      assert.equal(paid.paymentIntentId, 'pi_race');
      assert.equal(paid.stockDecremented, true);
      assert.equal(paid.couponIncremented, true);
      assert.equal(paid.salesCountIncremented, true);

      const p = await reloadProduct(product._id);
      assert.equal(p.stock, 9);
      assert.equal(p.salesCount, 1);

      const c = await Coupon.findById(coupon._id).lean();
      assert.equal(c.usedCount, 1);
    });
  });

  // -------------------------------------------------------------------------
  describe('oversell after payment', () => {
    dbIt('two paid orders for the last unit: one paid, one needs_attention', async () => {
      const { user } = await createUser();
      const product = await createProduct({ stock: 1 });
      const orderA = await createOrder({ user, product, qty: 1 });
      const orderB = await createOrder({ user, product, qty: 1 });

      const resA = await postWebhook(
        request,
        checkoutCompletedEvent(completedSession(orderA, { paymentIntentId: 'pi_a' })),
      );
      const resB = await postWebhook(
        request,
        checkoutCompletedEvent(completedSession(orderB, { paymentIntentId: 'pi_b' })),
      );
      assert.equal(resA.status, 200);
      assert.equal(resB.status, 200);
      assert.deepEqual(resA.body, { received: true });
      assert.deepEqual(resB.body, { received: true });

      assert.equal((await reloadProduct(product._id)).stock, 0);

      const a = await reloadOrder(orderA._id);
      assert.equal(a.paymentStatus, 'paid');
      assert.equal(a.status, 'paid');
      assert.equal(a.attentionReason, '');
      assert.equal(a.stockDecremented, true);

      const b = await reloadOrder(orderB._id);
      assert.equal(b.paymentStatus, 'paid');
      assert.equal(b.status, 'needs_attention');
      assert.equal(b.attentionReason, 'insufficient_stock');
      assert.equal(b.stockDecremented, false);

      const rows = await StripeWebhookEvent.find({ status: 'processed' }).lean();
      assert.equal(rows.length, 2);
    });
  });

  // -------------------------------------------------------------------------
  describe('POST /api/payments/quote', () => {
    dbIt('prices lines server-side and reports stock/price/variant warnings', async () => {
      const a = await createProduct({ price: 25, stock: 10 });
      const v = await createProduct({
        price: 30,
        variants: [{ size: 'M', stock: 1, sku: 'V-M' }],
      });
      const b = await createProduct({ price: 10, stock: 1 });
      const c = await createProduct({ price: 40, stock: 5 });
      const unknownId = String(new mongoose.Types.ObjectId());

      const res = await request(app)
        .post('/api/payments/quote')
        .send({
          items: [
            { productId: String(a._id), qty: 2, price: 25 },
            { productId: unknownId, qty: 1 },
            { productId: String(v._id), qty: 1 },
            { productId: String(b._id), qty: 3 },
            { productId: String(c._id), qty: 1, price: 39 },
          ],
          shippingMethod: 'standard',
        });

      assert.equal(res.status, 200, JSON.stringify(res.body));

      const byId = Object.fromEntries(res.body.lines.map((l) => [l.productId, l]));
      assert.equal(res.body.lines.length, 4);
      assert.equal(byId[unknownId], undefined);
      assert.deepEqual(
        { price: byId[a._id].price, qty: byId[a._id].qty, available: byId[a._id].available },
        { price: 25, qty: 2, available: 10 },
      );
      assert.equal(byId[v._id].available, 0);
      assert.equal(byId[b._id].available, 1);
      assert.equal(byId[c._id].price, 40);

      // 25*2 + 30*0 (variant not chosen) + 10*min(3,1) + 40*1
      assert.equal(res.body.itemsPrice, 100);
      assert.equal(res.body.shippingPrice, 5);
      assert.equal(res.body.taxPrice, 0);
      assert.equal(res.body.discountAmount, 0);
      assert.equal(res.body.couponValid, false);
      assert.equal(res.body.totalPrice, 105);

      const warnings = res.body.warnings.map((w) => [w.code, w.productId]);
      assert.deepEqual(
        warnings.sort(),
        [
          ['insufficient_stock', String(b._id)],
          ['price_changed', String(c._id)],
          ['unavailable', unknownId],
          ['variant_required', String(v._id)],
        ].sort(),
      );
      const stockWarning = res.body.warnings.find((w) => w.code === 'insufficient_stock');
      assert.equal(stockWarning.available, 1);

      assert.equal(await Order.countDocuments(), 0);
    });

    dbIt('applies a valid coupon to the quote', async () => {
      const a = await createProduct({ price: 25, stock: 10 });
      const coupon = await createCoupon({ discountType: 'percentage', discountValue: 10 });

      const res = await request(app)
        .post('/api/payments/quote')
        .send({
          items: [{ productId: String(a._id), qty: 2 }],
          couponCode: coupon.code.toLowerCase(),
        });

      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.itemsPrice, 50);
      assert.equal(res.body.couponValid, true);
      assert.equal(res.body.discountAmount, 5);
      assert.equal(res.body.shippingPrice, 0);
      assert.equal(res.body.totalPrice, 45);
    });

    dbIt('rejects an invalid body (400) and creates nothing', async () => {
      for (const body of [{}, { items: [] }, { items: [{ productId: 'nope', qty: 1 }] }]) {
        const res = await request(app).post('/api/payments/quote').send(body);
        assert.equal(res.status, 400, JSON.stringify(body));
        assert.equal(typeof res.body.message, 'string');
      }
      assert.equal(await Order.countDocuments(), 0);
    });
  });

  // -------------------------------------------------------------------------
  describe('rate-limit buckets', () => {
    dbIt('verify-payment hits do not consume the checkout-session bucket', async () => {
      const { token } = await createUser();
      const product = await createProduct();
      const body = checkoutBody([{ productId: String(product._id), qty: 1 }]);

      const baseline = await postCheckout(token, body);
      assert.equal(baseline.status, 200);
      const checkoutLimit = Number(baseline.headers['x-ratelimit-limit']);
      const before = Number(baseline.headers['x-ratelimit-remaining']);

      const verifyRemaining = [];
      for (let i = 0; i < 3; i += 1) {
        const res = await request(app)
          .post('/api/payments/verify-payment')
          .set(auth(token))
          .send({ orderId: String(new mongoose.Types.ObjectId()) });
        assert.equal(res.status, 404); // limiter passed, order does not exist
        assert.notEqual(Number(res.headers['x-ratelimit-limit']), checkoutLimit);
        verifyRemaining.push(Number(res.headers['x-ratelimit-remaining']));
      }
      // The verify bucket itself counts every hit
      assert.equal(verifyRemaining[0] - verifyRemaining[2], 2);

      const after = await postCheckout(token, body);
      assert.equal(after.status, 200);
      // Only this second checkout call moved the checkout bucket
      assert.equal(Number(after.headers['x-ratelimit-remaining']), before - 1);
    });
  });
});
