/**
 * Regression tests for the 2026-09 audit fixes (report removed from the tree;
 * read it with `git show a602258:docs/audit/AUDIT_REPORT.md`):
 * checkout edge cases, Stripe paid-state rules, fulfilment, money rounding,
 * coupon limits, restocking, permissions, account safety and soft delete.
 * Stripe is faked in-process (see setup.js).
 */
// The login lockout test needs more attempts than the per-IP auth limiter
// allows by default; each test file runs in its own process.
process.env.RATE_LIMIT_AUTH_MAX ||= '1000';

const { describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');

const {
  app,
  models: { Order, Product, User },
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
  patchOrderStatus,
  reloadProduct,
  reloadOrder,
} = require('./setup');

function postCheckout(token, body) {
  return request(app)
    .post('/api/payments/checkout-session')
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

/** Newest order for a user (checkout-session creates it). */
/**
 * createUser() stores an unhashed password and a `.local` email (which Joi's
 * email rule rejects) — fine for token-based tests, not for password checks.
 */
async function createLoginUser(email) {
  return createUser({ email, password: await bcrypt.hash('password123', 10) });
}

async function latestOrder(userId) {
  return Order.findOne({ user: userId }).sort({ createdAt: -1 }).lean();
}

describe('audit hardening', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(clearDb);

  // -------------------------------------------------------------------------
  describe('checkout', () => {
    dbIt('accepts two variants of the same product in one cart (API-201)', async () => {
      const { token } = await createUser();
      const product = await createProduct({
        variants: [
          { size: 'M', stock: 3, sku: 'TEE-M' },
          { size: 'L', stock: 3, sku: 'TEE-L' },
        ],
      });

      const res = await postCheckout(
        token,
        checkoutBody([
          { productId: String(product._id), qty: 1, variant: { size: 'M', sku: 'TEE-M' } },
          { productId: String(product._id), qty: 2, variant: { size: 'L', sku: 'TEE-L' } },
        ]),
      );
      assert.equal(res.status, 200, JSON.stringify(res.body));
    });

    dbIt('stores store pickup vs delivery on the order (API-203)', async () => {
      const { user, token } = await createUser();
      const product = await createProduct({ price: 20, stock: 10 });
      const items = [{ productId: String(product._id), qty: 1 }];

      const pickup = await postCheckout(token, checkoutBody(items, { delivery: false }));
      assert.equal(pickup.status, 200, JSON.stringify(pickup.body));
      let order = await latestOrder(user._id);
      assert.equal(order.delivery, false);
      assert.equal(order.shippingMethod, 'none');
      assert.equal(order.shippingPrice, 0);

      const delivered = await postCheckout(token, checkoutBody(items, { delivery: true }));
      assert.equal(delivered.status, 200, JSON.stringify(delivered.body));
      order = await latestOrder(user._id);
      assert.equal(order.delivery, true);
      assert.equal(order.shippingMethod, 'standard');
      assert.ok(order.shippingPrice > 0);
    });

    dbIt('rounds unit prices to cents so totals match Stripe (API-207)', async () => {
      const { user, token } = await createUser();
      const product = await createProduct({ price: 19.999, stock: 10 });

      const res = await postCheckout(
        token,
        checkoutBody([{ productId: String(product._id), qty: 3 }], { delivery: false }),
      );
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const order = await latestOrder(user._id);
      assert.equal(order.items[0].price, 20);
      assert.equal(order.itemsPrice, 60);
      assert.equal(order.totalPrice, 60);
    });

    dbIt('enforces a coupon per-customer limit on paid orders (API-204)', async () => {
      const { user, token } = await createUser();
      const product = await createProduct({ price: 30, stock: 10 });
      const coupon = await createCoupon({ perCustomerLimit: 1 });
      await createOrder({
        user,
        product,
        couponId: coupon._id,
        couponCode: coupon.code,
        status: 'paid',
        paymentStatus: 'paid',
      });

      const res = await postCheckout(
        token,
        checkoutBody([{ productId: String(product._id), qty: 1 }], {
          couponCode: coupon.code,
        }),
      );
      assert.equal(res.status, 400);
      assert.match(res.body.message, /already used/i);
    });
  });

  // -------------------------------------------------------------------------
  describe('Stripe paid state', () => {
    dbIt('an unpaid (async) completed session does not mark the order paid until async success (PAY-202)', async () => {
      const { user } = await createUser();
      const product = await createProduct({ stock: 5 });
      const order = await createOrder({ user, product });

      const session = { ...completedSession(order), payment_status: 'unpaid' };
      const completed = await postWebhook(request, checkoutCompletedEvent(session));
      assert.equal(completed.status, 200);
      let reloaded = await reloadOrder(order._id);
      assert.equal(reloaded.paymentStatus, 'pending');
      assert.equal((await reloadProduct(product._id)).stock, 5);

      const settled = await postWebhook(request, {
        id: 'evt_async_ok',
        type: 'checkout.session.async_payment_succeeded',
        data: { object: { ...session, payment_status: 'paid' } },
      });
      assert.equal(settled.status, 200);
      reloaded = await reloadOrder(order._id);
      assert.equal(reloaded.paymentStatus, 'paid');
      assert.equal(reloaded.status, 'paid');
      assert.equal((await reloadProduct(product._id)).stock, 4);
    });

    dbIt('payment_intent.succeeded alone never marks an order paid (PAY-201)', async () => {
      const { user } = await createUser();
      const product = await createProduct({ stock: 5 });
      const order = await createOrder({ user, product });

      const res = await postWebhook(request, {
        id: 'evt_pi_ok',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_x', metadata: { orderId: String(order._id) } } },
      });
      assert.equal(res.status, 200);
      const reloaded = await reloadOrder(order._id);
      assert.equal(reloaded.paymentStatus, 'pending');
      assert.equal(reloaded.stockDecremented, false);
    });
  });

  // -------------------------------------------------------------------------
  describe('restocking (API-205)', () => {
    dbIt('refunding a shipped order does not put goods back in stock', async () => {
      const { user } = await createUser();
      const { token: adminToken } = await createUser({ roles: ['admin'] });
      const product = await createProduct({ stock: 9 });
      const order = await createOrder({
        user,
        product,
        status: 'paid',
        paymentStatus: 'paid',
        paymentIntentId: 'pi_shipped',
        stockDecremented: true,
      });

      const shipped = await patchOrderStatus(request, adminToken, order._id, 'shipped');
      assert.equal(shipped.status, 200, JSON.stringify(shipped.body));
      assert.ok((await reloadOrder(order._id)).shippedAt);

      const refunded = await patchOrderStatus(request, adminToken, order._id, 'refunded');
      assert.equal(refunded.status, 200, JSON.stringify(refunded.body));
      assert.equal(refunded.body.stockRestored, false);
      assert.equal((await reloadProduct(product._id)).stock, 9);
    });
  });

  // -------------------------------------------------------------------------
  describe('permissions and accounts', () => {
    dbIt('only admins can change store settings (SEC-101)', async () => {
      const { token: modToken } = await createUser({ roles: ['moderator'] });
      const { token: adminToken } = await createUser({ roles: ['admin'] });
      const body = { taxRatePercent: 0 };

      const asMod = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${modToken}`)
        .send(body);
      assert.equal(asMod.status, 403);

      const asAdmin = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body);
      assert.equal(asAdmin.status, 200, JSON.stringify(asAdmin.body));
    });

    dbIt('admins cannot demote or delete themselves; another admin can (SEC-113)', async () => {
      const { user: admin, token } = await createUser({ roles: ['admin'] });

      const selfDemote = await request(app)
        .put(`/api/users/${admin._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ roles: ['user'] });
      assert.equal(selfDemote.status, 400);

      const selfDelete = await request(app)
        .delete(`/api/users/${admin._id}`)
        .set('Authorization', `Bearer ${token}`);
      assert.equal(selfDelete.status, 400);
      assert.deepEqual((await User.findById(admin._id).lean()).roles, ['admin']);

      // A second admin exists, so demoting the first no longer empties the role.
      const { token: otherToken } = await createUser({ roles: ['admin'] });
      const demoted = await request(app)
        .put(`/api/users/${admin._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ roles: ['user'] });
      assert.equal(demoted.status, 200, JSON.stringify(demoted.body));
    });

    dbIt('deleting a user anonymises instead of removing (OPS-725)', async () => {
      const { token: adminToken } = await createUser({ roles: ['admin'] });
      const { user } = await createUser();
      const product = await createProduct();
      const order = await createOrder({ user, product });

      const res = await request(app)
        .delete(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200, JSON.stringify(res.body));

      const after = await User.findById(user._id).lean();
      assert.ok(after, 'user document kept');
      assert.equal(after.email, `deleted-${user._id}@deleted.invalid`);
      assert.equal(after.disabled, true);
      assert.deepEqual(after.addresses, []);
      assert.ok(await Order.findById(order._id), 'orders stay linked');
    });

    dbIt('locks an account after 5 wrong passwords (SEC-108)', async () => {
      const { user } = await createLoginUser('lockout@example.com');
      const login = (password) =>
        request(app).post('/api/auth/login').send({ email: user.email, password });

      for (let i = 0; i < 5; i += 1) {
        const res = await login('wrong-password');
        assert.equal(res.status, 400);
      }
      const locked = await login('password123');
      assert.equal(locked.status, 429);
      assert.equal(locked.body.code, 'ACCOUNT_LOCKED');
    });

    dbIt('changing the email requires the current password (SEC-107)', async () => {
      const { user, token } = await createLoginUser('profile@example.com');
      const put = (body) =>
        request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ username: user.username, ...body });

      const missing = await put({ email: 'new@example.com' });
      assert.equal(missing.status, 400);
      assert.equal(missing.body.code, 'CURRENT_PASSWORD_REQUIRED');

      const wrong = await put({ email: 'new@example.com', currentPassword: 'nope-nope' });
      assert.equal(wrong.status, 400);
      assert.equal(wrong.body.code, 'CURRENT_PASSWORD_INCORRECT');

      const ok = await put({ email: 'new@example.com', currentPassword: 'password123' });
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      assert.equal((await User.findById(user._id).lean()).email, 'new@example.com');

      // Username-only edits need no password.
      const rename = await put({ email: 'new@example.com', username: 'renamed-user' });
      assert.equal(rename.status, 200, JSON.stringify(rename.body));
    });
  });

  // -------------------------------------------------------------------------
  describe('soft delete (API-212)', () => {
    dbIt('deleting a product deactivates it and keeps order references valid', async () => {
      const { token: adminToken } = await createUser({ roles: ['admin'] });
      const product = await createProduct();

      const res = await request(app)
        .delete(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200, JSON.stringify(res.body));

      const after = await Product.findById(product._id).lean();
      assert.ok(after, 'document kept');
      assert.equal(after.isActive, false);
    });
  });
});
