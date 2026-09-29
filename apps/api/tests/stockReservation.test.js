/**
 * Stock reservation at checkout (P0-01): the checkout session holds the
 * stock, every way out of an unpaid checkout gives it back exactly once, and
 * the reconciler settles checkouts whose webhook never arrived.
 * Stripe is faked in-process (see setup.js).
 */
const { describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const {
  app,
  models: { Order },
  stripeMock,
  connectDb,
  disconnectDb,
  clearDb,
  dbIt,
  createUser,
  createProduct,
  checkoutBody,
  completedSession,
  checkoutCompletedEvent,
  postWebhook,
  patchOrderStatus,
  reloadProduct,
  reloadOrder,
} = require('./setup');
const { reconcileStaleCheckouts } = require('../controllers/payment.controller');

/** Well past the 30 min session TTL plus the reconciler's grace period. */
const LATER = () => Date.now() + 45 * 60 * 1000;

function postCheckout(token, body) {
  return request(app)
    .post('/api/payments/checkout-session')
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

async function reserve(token, product, qty = 1) {
  const res = await postCheckout(
    token,
    checkoutBody([{ productId: String(product._id), qty }]),
  );
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body;
}

/** What Stripe would hold for a checkout session in the given state. */
function storeSession(sessionId, orderId, fields) {
  stripeMock.sessions.set(sessionId, {
    id: sessionId,
    object: 'checkout.session',
    mode: 'payment',
    client_reference_id: String(orderId),
    metadata: { orderId: String(orderId), kind: 'order_payment' },
    ...fields,
  });
}

function expiredEvent(id, sessionId, orderId) {
  return {
    id,
    type: 'checkout.session.expired',
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        status: 'expired',
        metadata: { orderId: String(orderId), kind: 'order_payment' },
      },
    },
  };
}

describe('stock reservation', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(clearDb);

  // -------------------------------------------------------------------------
  describe('at checkout', () => {
    dbIt('two concurrent checkouts for the last unit: one reserves, the other is refused', async () => {
      const a = await createUser();
      const b = await createUser();
      const product = await createProduct({ stock: 1 });
      const body = checkoutBody([{ productId: String(product._id), qty: 1 }]);

      const results = await Promise.all([
        postCheckout(a.token, body),
        postCheckout(b.token, body),
      ]);

      const won = results.filter((r) => r.status === 200);
      const lost = results.filter((r) => r.status !== 200);
      assert.equal(won.length, 1, JSON.stringify(results.map((r) => r.body)));
      assert.equal(lost.length, 1);
      // 400 when the loser's stock read already saw 0, 409 when it lost the
      // atomic decrement: the same code either way
      assert.ok([400, 409].includes(lost[0].status), String(lost[0].status));
      assert.equal(lost[0].body.code, 'OUT_OF_STOCK');

      assert.equal((await reloadProduct(product._id)).stock, 0);
      assert.equal(await Order.countDocuments(), 1);
      assert.equal(stripeMock.calls.sessionsCreate.length, 1);
    });

    dbIt('a Stripe outage while opening the session gives the stock back', async () => {
      const { token } = await createUser();
      const product = await createProduct({ stock: 5 });
      stripeMock.createImpl = () => {
        throw new Error('Stripe is down');
      };

      const res = await postCheckout(
        token,
        checkoutBody([{ productId: String(product._id), qty: 2 }]),
      );

      assert.equal(res.status, 502);
      assert.equal((await reloadProduct(product._id)).stock, 5);
      assert.equal(await Order.countDocuments(), 0);
    });

    dbIt('paying a reserved order does not take the stock a second time', async () => {
      const { token } = await createUser();
      const product = await createProduct({ stock: 5 });
      const { orderId, sessionId } = await reserve(token, product, 2);
      assert.equal((await reloadProduct(product._id)).stock, 3);

      const order = await reloadOrder(orderId);
      const paid = await postWebhook(
        request,
        checkoutCompletedEvent(completedSession(order, { sessionId })),
      );
      assert.equal(paid.status, 200);

      const updated = await reloadOrder(orderId);
      assert.equal(updated.status, 'paid');
      assert.equal(updated.stockDecremented, true);
      const p = await reloadProduct(product._id);
      assert.equal(p.stock, 3);
      assert.equal(p.salesCount, 2);
    });
  });

  // -------------------------------------------------------------------------
  describe('release', () => {
    dbIt('checkout.session.expired releases the hold exactly once', async () => {
      const { token } = await createUser();
      const product = await createProduct({ stock: 5 });
      const { orderId, sessionId } = await reserve(token, product, 2);

      const first = await postWebhook(request, expiredEvent('evt_exp_1', sessionId, orderId));
      assert.equal(first.status, 200);
      assert.equal((await reloadProduct(product._id)).stock, 5);

      const order = await reloadOrder(orderId);
      assert.equal(order.status, 'canceled');
      assert.equal(order.paymentStatus, 'failed');
      assert.equal(order.stockRestored, true);

      // A second, distinct event for the same session (e.g. async failure)
      const second = await postWebhook(request, expiredEvent('evt_exp_2', sessionId, orderId));
      assert.equal(second.status, 200);
      assert.equal((await reloadProduct(product._id)).stock, 5);
    });

    dbIt('a customer canceling an unpaid checkout releases the hold', async () => {
      const { token } = await createUser();
      const product = await createProduct({ stock: 5 });
      const { orderId } = await reserve(token, product, 1);

      const res = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${token}`);
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal((await reloadProduct(product._id)).stock, 5);
    });

    dbIt('staff canceling an unpaid checkout releases the hold', async () => {
      const { token } = await createUser();
      const { token: adminToken } = await createUser({ roles: ['admin'] });
      const product = await createProduct({ stock: 5 });
      const { orderId } = await reserve(token, product, 1);

      const res = await patchOrderStatus(request, adminToken, orderId, 'canceled');
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.stockRestored, true);
      assert.equal((await reloadProduct(product._id)).stock, 5);
    });

    dbIt('a released checkout paid late takes the stock again when staff resolve it to paid', async () => {
      const { token } = await createUser();
      const { token: adminToken } = await createUser({ roles: ['admin'] });
      const product = await createProduct({ stock: 5 });
      const { orderId, sessionId } = await reserve(token, product, 1);

      await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${token}`);
      assert.equal((await reloadProduct(product._id)).stock, 5);

      const order = await reloadOrder(orderId);
      await postWebhook(
        request,
        checkoutCompletedEvent(completedSession(order, { sessionId, paymentIntentId: 'pi_late' })),
      );
      const flagged = await reloadOrder(orderId);
      assert.equal(flagged.status, 'needs_attention');
      assert.equal(flagged.attentionReason, 'paid_after_cancel');
      assert.equal((await reloadProduct(product._id)).stock, 5);

      const resolved = await patchOrderStatus(request, adminToken, orderId, 'paid');
      assert.equal(resolved.status, 200, JSON.stringify(resolved.body));
      assert.equal((await reloadProduct(product._id)).stock, 4);
      assert.equal((await reloadOrder(orderId)).stockRestored, false);

      // Held again, so a refund-cancel puts it back once more
      const canceled = await patchOrderStatus(request, adminToken, orderId, 'canceled');
      assert.equal(canceled.status, 200, JSON.stringify(canceled.body));
      assert.equal((await reloadProduct(product._id)).stock, 5);
    });
  });

  // -------------------------------------------------------------------------
  describe('reconciler', () => {
    dbIt('releases a checkout whose session expired without a webhook', async () => {
      const { token } = await createUser();
      const product = await createProduct({ stock: 5 });
      const { orderId, sessionId } = await reserve(token, product, 2);
      storeSession(sessionId, orderId, { status: 'expired', payment_status: 'unpaid' });

      const result = await reconcileStaleCheckouts({ now: LATER() });

      assert.deepEqual(result, { paid: 0, released: 1, skipped: 0 });
      assert.equal((await reloadProduct(product._id)).stock, 5);
      assert.equal((await reloadOrder(orderId)).status, 'canceled');
    });

    dbIt('closes a session Stripe still reports open before releasing it', async () => {
      const { token } = await createUser();
      const product = await createProduct({ stock: 5 });
      const { orderId, sessionId } = await reserve(token, product, 1);
      storeSession(sessionId, orderId, { status: 'open', payment_status: 'unpaid' });

      const result = await reconcileStaleCheckouts({ now: LATER() });

      assert.equal(result.released, 1);
      assert.deepEqual(stripeMock.calls.sessionsExpire, [sessionId]);
      assert.equal((await reloadProduct(product._id)).stock, 5);
    });

    dbIt('marks paid a checkout whose completion webhook was missed, keeping its stock', async () => {
      const { token } = await createUser();
      const product = await createProduct({ stock: 5 });
      const { orderId, sessionId } = await reserve(token, product, 2);
      const order = await reloadOrder(orderId);
      stripeMock.sessions.set(sessionId, completedSession(order, { sessionId }));

      const result = await reconcileStaleCheckouts({ now: LATER() });

      assert.deepEqual(result, { paid: 1, released: 0, skipped: 0 });
      const updated = await reloadOrder(orderId);
      assert.equal(updated.paymentStatus, 'paid');
      assert.equal(updated.status, 'paid');
      assert.equal((await reloadProduct(product._id)).stock, 3);
    });

    dbIt('keeps the hold when Stripe is unreachable or a payment is still settling', async () => {
      const { token } = await createUser();
      const product = await createProduct({ stock: 5 });
      const unreachable = await reserve(token, product, 1);
      const settling = await reserve(token, product, 1);
      storeSession(settling.sessionId, settling.orderId, {
        status: 'complete',
        payment_status: 'unpaid',
      });
      stripeMock.retrieveImpl = (id) => {
        if (id === unreachable.sessionId) throw new Error('ECONNRESET');
        return stripeMock.sessions.get(id);
      };

      const result = await reconcileStaleCheckouts({ now: LATER() });

      assert.deepEqual(result, { paid: 0, released: 0, skipped: 2 });
      assert.equal((await reloadProduct(product._id)).stock, 3);
      assert.equal((await reloadOrder(unreachable.orderId)).status, 'pending');
      assert.equal((await reloadOrder(settling.orderId)).status, 'pending');
    });

    dbIt('leaves checkouts alone until their session has certainly expired', async () => {
      const { token } = await createUser();
      const product = await createProduct({ stock: 5 });
      const { orderId, sessionId } = await reserve(token, product, 1);
      storeSession(sessionId, orderId, { status: 'expired', payment_status: 'unpaid' });

      const result = await reconcileStaleCheckouts({ now: Date.now() + 20 * 60 * 1000 });

      assert.deepEqual(result, { paid: 0, released: 0, skipped: 0 });
      assert.equal(stripeMock.calls.sessionsRetrieve.length, 0);
      assert.equal((await reloadProduct(product._id)).stock, 4);
    });

    dbIt('the expired webhook and the reconciler racing restock exactly once', async () => {
      const { token } = await createUser();
      const product = await createProduct({ stock: 5 });
      const { orderId, sessionId } = await reserve(token, product, 3);
      storeSession(sessionId, orderId, { status: 'expired', payment_status: 'unpaid' });

      await Promise.all([
        postWebhook(request, expiredEvent('evt_race', sessionId, orderId)),
        reconcileStaleCheckouts({ now: LATER() }),
        reconcileStaleCheckouts({ now: LATER() }),
      ]);

      assert.equal((await reloadProduct(product._id)).stock, 5);
      assert.equal((await reloadOrder(orderId)).stockRestored, true);
    });
  });
});
