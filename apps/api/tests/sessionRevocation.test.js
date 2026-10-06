/**
 * Sessions the API has ended, and roles changed behind a live token. The old
 * access token is still unexpired in every test here, so only the
 * per-request account check (verfiyToken, and its strict optional variant on
 * the invoice route) stands between it and the data.
 */
const { describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const {
  app,
  models: { Order, User },
  connectDb,
  disconnectDb,
  clearDb,
  dbIt,
  createUser,
  createProduct,
  createOrder,
  checkoutBody,
} = require('./setup');
const { invalidateStoreSettingsCache } = require('../utils/commerce');

function get(path, token) {
  const req = request(app).get(path);
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
}

/** Staff-only list: 200 for staff, 403 for a customer, 401 for a dead session. */
const listOrders = (token) => get('/api/orders', token);
const getInvoice = (token, orderId) => get(`/api/orders/${orderId}/invoice`, token);

function updateUser(adminToken, userId, body) {
  return request(app)
    .put(`/api/users/${userId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send(body);
}

/** A paid order (so it has an invoice) belonging to some other customer. */
async function someoneElsesPaidOrder() {
  const { user } = await createUser();
  return createOrder({
    user,
    product: await createProduct(),
    status: 'paid',
    paymentStatus: 'paid',
    paidAt: new Date(),
    stockDecremented: true,
  });
}

describe('ended sessions and changed roles', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(async () => {
    await clearDb();
    invalidateStoreSettingsCache();
  });

  // -------------------------------------------------------------------------
  describe('a session ended by an admin', () => {
    for (const [what, change] of [
      ['demoted', { roles: ['user'] }],
      ['disabled', { disabled: true }],
    ]) {
      dbIt(`a ${what} admin loses the staff routes and every invoice at once`, async () => {
        const { token: otherAdmin } = await createUser({ roles: ['admin'] });
        const { user: staff, token } = await createUser({ roles: ['admin'] });
        const order = await someoneElsesPaidOrder();
        assert.equal((await listOrders(token)).status, 200);
        assert.equal((await getInvoice(token, order._id)).status, 200);

        const res = await updateUser(otherAdmin, staff._id, change);
        assert.equal(res.status, 200, JSON.stringify(res.body));

        assert.equal((await listOrders(token)).status, 401);
        assert.equal((await getInvoice(token, order._id)).status, 401);
      });
    }

    dbIt('an ended session opens nothing, yet does not block a guest token sent with it', async () => {
      const { token: admin } = await createUser({ roles: ['admin'] });
      const { user: shopper, token } = await createUser();
      const ended = await updateUser(admin, shopper._id, { disabled: true });
      assert.equal(ended.status, 200, JSON.stringify(ended.body));

      const product = await createProduct();
      const checkout = await request(app)
        .post('/api/payments/checkout-session')
        .send(checkoutBody([{ productId: String(product._id), qty: 1 }], { email: 'guest@example.com' }));
      const { orderId, guestToken } = checkout.body;
      assert.ok(guestToken, JSON.stringify(checkout.body));
      await Order.updateOne(
        { _id: orderId },
        { $set: { status: 'paid', paymentStatus: 'paid', paidAt: new Date() } },
      );

      assert.equal((await getInvoice(token, orderId)).status, 401);
      const res = await getInvoice(token, orderId).set('X-Guest-Token', guestToken);
      assert.equal(res.status, 200);
    });
  });

  // -------------------------------------------------------------------------
  describe('roles come from the account, not the token', () => {
    dbIt('a role removed behind a live token applies on the next request', async () => {
      const { user: staff, token } = await createUser({ roles: ['admin'] });
      const order = await someoneElsesPaidOrder();

      // No tokenVersion bump (a script, a direct DB edit): the token stays
      // valid and still says "admin".
      await User.updateOne({ _id: staff._id }, { $set: { roles: ['user'] } });

      assert.equal((await listOrders(token)).status, 403);
      // No longer staff and not the owner: "not found", like any stranger
      assert.equal((await getInvoice(token, order._id)).status, 404);
    });

    dbIt('a role granted behind a live token applies on the next request', async () => {
      const { user, token } = await createUser();
      assert.equal((await listOrders(token)).status, 403);

      await User.updateOne({ _id: user._id }, { $set: { roles: ['admin'] } });

      assert.equal((await listOrders(token)).status, 200);
    });
  });
});
