/**
 * Admin order transitions vs. payment side-effects: late webhook after
 * cancel, cancel-paid → Stripe refund + inventory release (once), and
 * per-variant stock atomicity. Stripe is faked in-process (see setup.js).
 */
const { describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const {
  stripeMock,
  connectDb,
  disconnectDb,
  clearDb,
  dbIt,
  createUser,
  createProduct,
  createOrder,
  completedSession,
  checkoutCompletedEvent,
  postWebhook,
  patchOrderStatus,
  reloadProduct,
  reloadOrder,
} = require('./setup');

/** An order whose payment was captured and whose stock is already taken. */
async function createPaidOrder({ user, product, qty = 1, variant, paymentIntentId = 'pi_paid_1' }) {
  return createOrder({
    user,
    product,
    qty,
    variant,
    status: 'paid',
    paymentStatus: 'paid',
    paymentIntentId,
    paidAt: new Date(),
    stockDecremented: true,
    salesCountIncremented: true,
  });
}

describe('orders API (admin transitions)', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(clearDb);

  // -------------------------------------------------------------------------
  describe('late webhook after admin cancel', () => {
    dbIt('flags the order needs_attention/paid_after_cancel and leaves stock alone', async () => {
      const { user } = await createUser();
      const { token: adminToken } = await createUser({ roles: ['admin'] });
      const product = await createProduct({ stock: 10 });
      const order = await createOrder({ user, product, qty: 1 });

      const cancel = await patchOrderStatus(request, adminToken, order._id, 'canceled');
      assert.equal(cancel.status, 200, JSON.stringify(cancel.body));
      assert.equal(cancel.body.status, 'canceled');
      assert.equal(cancel.body.stockRestored, false);
      assert.equal(cancel.body.refunded, false);
      assert.equal((await reloadOrder(order._id)).status, 'canceled');

      const webhook = await postWebhook(
        request,
        checkoutCompletedEvent(completedSession(order, { paymentIntentId: 'pi_late' })),
      );
      assert.equal(webhook.status, 200);
      assert.deepEqual(webhook.body, { received: true });

      const updated = await reloadOrder(order._id);
      assert.equal(updated.paymentStatus, 'paid');
      assert.equal(updated.paymentIntentId, 'pi_late');
      assert.equal(updated.status, 'needs_attention');
      assert.equal(updated.attentionReason, 'paid_after_cancel');
      assert.equal(updated.stockDecremented, false);
      assert.equal(updated.salesCountIncremented, false);

      const p = await reloadProduct(product._id);
      assert.equal(p.stock, 10);
      assert.equal(p.salesCount, 0);
      assert.equal(stripeMock.calls.refundsCreate.length, 0);
    });
  });

  // -------------------------------------------------------------------------
  describe('cancel a paid order', () => {
    dbIt('refunds via Stripe once and restores stock once', async () => {
      const { user } = await createUser();
      const { token: adminToken } = await createUser({ roles: ['admin'] });
      // stock 9 == 10 minus the unit already taken by the paid order
      const product = await createProduct({ stock: 9 });
      const order = await createPaidOrder({ user, product, qty: 1, paymentIntentId: 'pi_paid_1' });

      const res = await patchOrderStatus(request, adminToken, order._id, 'canceled');
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.status, 'canceled');
      assert.equal(res.body.paymentStatus, 'refunded');
      assert.equal(res.body.refunded, true);
      assert.equal(res.body.stockRestored, true);
      assert.equal(res.body.message, 'Order refunded via Stripe and inventory restored');

      assert.equal(stripeMock.calls.refundsCreate.length, 1);
      const { params, options } = stripeMock.calls.refundsCreate[0];
      assert.equal(params.payment_intent, 'pi_paid_1');
      assert.equal(params.amount, undefined); // full refund
      assert.equal(options.idempotencyKey, 'refund:pi_paid_1:full');

      const updated = await reloadOrder(order._id);
      assert.equal(updated.status, 'canceled');
      assert.equal(updated.paymentStatus, 'refunded');
      assert.match(updated.refundId, /^re_test_/);
      assert.ok(updated.refundedAt instanceof Date);
      assert.equal(updated.stockRestored, true);
      assert.equal(updated.attentionReason, '');
      assert.equal((await reloadProduct(product._id)).stock, 10);

      // Second release attempt (canceled → refunded): no new Stripe refund,
      // stock not restored twice.
      const again = await patchOrderStatus(request, adminToken, order._id, 'refunded');
      assert.equal(again.status, 200, JSON.stringify(again.body));
      assert.equal(again.body.status, 'refunded');
      assert.equal(again.body.refunded, true);
      assert.equal(stripeMock.calls.refundsCreate.length, 1);
      assert.equal((await reloadProduct(product._id)).stock, 10);

      // Cancel again is not a valid transition
      const repeat = await patchOrderStatus(request, adminToken, order._id, 'canceled');
      assert.equal(repeat.status, 400);
      assert.equal(stripeMock.calls.refundsCreate.length, 1);
    });

    dbIt('AUTO_REFUND_ON_CANCEL=false flags manual_refund_required without calling Stripe', async () => {
      const previous = process.env.AUTO_REFUND_ON_CANCEL;
      process.env.AUTO_REFUND_ON_CANCEL = 'false';
      try {
        const { user } = await createUser();
        const { token: adminToken } = await createUser({ roles: ['admin'] });
        const product = await createProduct({ stock: 9 });
        const order = await createPaidOrder({ user, product, qty: 1, paymentIntentId: 'pi_paid_2' });

        const res = await patchOrderStatus(request, adminToken, order._id, 'canceled');
        assert.equal(res.status, 200, JSON.stringify(res.body));
        assert.equal(res.body.status, 'canceled');
        assert.equal(res.body.attentionReason, 'manual_refund_required');
        assert.equal(res.body.refunded, false);
        assert.equal(res.body.stockRestored, true);

        assert.equal(stripeMock.calls.refundsCreate.length, 0);

        const updated = await reloadOrder(order._id);
        assert.equal(updated.status, 'canceled');
        assert.equal(updated.paymentStatus, 'paid');
        assert.equal(updated.attentionReason, 'manual_refund_required');
        assert.equal(updated.refundId, '');
        assert.equal((await reloadProduct(product._id)).stock, 10);
      } finally {
        if (previous === undefined) delete process.env.AUTO_REFUND_ON_CANCEL;
        else process.env.AUTO_REFUND_ON_CANCEL = previous;
      }
    });

    dbIt('non-admin users cannot transition orders (403)', async () => {
      const { user, token } = await createUser();
      const product = await createProduct({ stock: 9 });
      const order = await createPaidOrder({ user, product });

      const res = await patchOrderStatus(request, token, order._id, 'canceled');
      assert.equal(res.status, 403);
      assert.equal(stripeMock.calls.refundsCreate.length, 0);
      assert.equal((await reloadOrder(order._id)).status, 'paid');
    });
  });

  // -------------------------------------------------------------------------
  describe('variant stock atomicity', () => {
    const variants = () => [
      { size: 'M', stock: 1, sku: 'SKU-M' },
      { size: 'L', stock: 1, sku: 'SKU-L' },
    ];

    function variantStock(product, size) {
      return product.variants.find((v) => v.size === size).stock;
    }

    dbIt('paying for M decrements only M; admin cancel restores it', async () => {
      const { user } = await createUser();
      const { token: adminToken } = await createUser({ roles: ['admin'] });
      const product = await createProduct({ variants: variants() });
      assert.equal(product.stock, 2);

      const order = await createOrder({
        user,
        product,
        qty: 1,
        variant: { size: 'M', sku: 'SKU-M' },
      });

      const webhook = await postWebhook(
        request,
        checkoutCompletedEvent(completedSession(order, { paymentIntentId: 'pi_variant' })),
      );
      assert.equal(webhook.status, 200);

      let p = await reloadProduct(product._id);
      assert.equal(variantStock(p, 'M'), 0);
      assert.equal(variantStock(p, 'L'), 1);
      assert.equal(p.stock, 1);

      const paid = await reloadOrder(order._id);
      assert.equal(paid.status, 'paid');
      assert.equal(paid.stockDecremented, true);

      const cancel = await patchOrderStatus(request, adminToken, order._id, 'canceled');
      assert.equal(cancel.status, 200, JSON.stringify(cancel.body));
      assert.equal(cancel.body.stockRestored, true);
      assert.equal(stripeMock.calls.refundsCreate.length, 1);
      assert.equal(stripeMock.calls.refundsCreate[0].params.payment_intent, 'pi_variant');

      p = await reloadProduct(product._id);
      assert.equal(variantStock(p, 'M'), 1);
      assert.equal(variantStock(p, 'L'), 1);
      assert.equal(p.stock, 2);
    });

    dbIt('second paid order for the same last variant unit is flagged, sibling variant untouched', async () => {
      const { user } = await createUser();
      const product = await createProduct({ variants: variants() });
      const orderA = await createOrder({ user, product, variant: { size: 'M', sku: 'SKU-M' } });
      const orderB = await createOrder({ user, product, variant: { size: 'M', sku: 'SKU-M' } });

      for (const [order, pi] of [[orderA, 'pi_va'], [orderB, 'pi_vb']]) {
        const res = await postWebhook(
          request,
          checkoutCompletedEvent(completedSession(order, { paymentIntentId: pi })),
        );
        assert.equal(res.status, 200);
      }

      const p = await reloadProduct(product._id);
      assert.equal(variantStock(p, 'M'), 0);
      assert.equal(variantStock(p, 'L'), 1);
      assert.equal(p.stock, 1);

      assert.equal((await reloadOrder(orderA._id)).status, 'paid');
      const b = await reloadOrder(orderB._id);
      assert.equal(b.status, 'needs_attention');
      assert.equal(b.attentionReason, 'insufficient_stock');
    });
  });

  // -------------------------------------------------------------------------
  describe('charge.refunded webhook', () => {
    dbIt('marks a paid order refunded and restores stock once', async () => {
      const { user } = await createUser();
      const product = await createProduct({ stock: 8 });
      const order = await createPaidOrder({ user, product, qty: 2, paymentIntentId: 'pi_chg' });

      const charge = {
        id: 'ch_test_1',
        object: 'charge',
        payment_intent: 'pi_chg',
        amount: 5000,
        amount_refunded: 5000,
        refunded: true,
        refunds: { data: [{ id: 're_dash_1' }] },
        metadata: { orderId: String(order._id) },
      };
      const event = { id: 'evt_refund_1', type: 'charge.refunded', data: { object: charge } };

      const first = await postWebhook(request, event);
      assert.equal(first.status, 200);
      const replay = await postWebhook(request, event);
      assert.deepEqual(replay.body, { received: true, duplicate: true });

      const updated = await reloadOrder(order._id);
      assert.equal(updated.paymentStatus, 'refunded');
      assert.equal(updated.status, 'refunded');
      assert.equal(updated.refundId, 're_dash_1');
      assert.equal(updated.refundAmount, 50);
      assert.equal(updated.stockRestored, true);
      assert.equal((await reloadProduct(product._id)).stock, 10);
    });
  });
});
