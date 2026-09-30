/**
 * Invoices (P0-05): who may open one, when it exists, and gap-free
 * numbering assigned once at payment. Stripe is faked (see setup.js).
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
  completedSession,
  checkoutCompletedEvent,
  postWebhook,
  reloadOrder,
} = require('./setup');
const { Order } = require('../models/Order');
const { StoreSettings, SINGLETON_ID } = require('../models/StoreSettings');
const { invalidateStoreSettingsCache } = require('../utils/commerce');
const { ensureInvoiceNumber } = require('../utils/invoice');

function getInvoice(token, orderId, query = {}) {
  const req = request(app).get(`/api/orders/${orderId}/invoice`).query(query);
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
}

async function paidOrder(user, product, overrides = {}) {
  return createOrder({
    user,
    product,
    status: 'paid',
    paymentStatus: 'paid',
    paidAt: new Date(),
    stockDecremented: true,
    ...overrides,
  });
}

describe('order invoices', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(async () => {
    await clearDb();
    invalidateStoreSettingsCache();
  });

  // -------------------------------------------------------------------------
  describe('access', () => {
    dbIt('the owner and staff (admin and moderator) can open it; anyone else gets 404', async () => {
      const owner = await createUser();
      const other = await createUser();
      const admin = await createUser({ roles: ['admin'] });
      const mod = await createUser({ roles: ['moderator'] });
      const order = await paidOrder(owner.user, await createProduct());

      for (const { token } of [owner, admin, mod]) {
        assert.equal((await getInvoice(token, order._id)).status, 200);
      }
      assert.equal((await getInvoice(other.token, order._id)).status, 404);
      assert.equal((await getInvoice(null, order._id)).status, 401);
      assert.equal((await getInvoice(owner.token, 'not-an-id')).status, 404);
    });

    dbIt('an unpaid order has no invoice yet (409) and gets no number', async () => {
      const { user, token } = await createUser();
      const order = await createOrder({ user, product: await createProduct() });

      const res = await getInvoice(token, order._id);
      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'INVOICE_NOT_AVAILABLE');
      assert.equal((await reloadOrder(order._id)).invoiceNumber, '');
    });

    dbIt('serves a no-store HTML document that forbids scripts', async () => {
      const { user, token } = await createUser();
      const order = await paidOrder(user, await createProduct());

      const res = await getInvoice(token, order._id);
      assert.match(res.headers['content-type'], /^text\/html; charset=utf-8/);
      assert.match(res.headers['content-security-policy'], /default-src 'none'/);
      assert.equal(res.headers['cache-control'], 'private, no-store');
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
    });

    dbIt('escapes a malicious shipping address', async () => {
      const { user, token } = await createUser();
      const order = await paidOrder(user, await createProduct(), {
        shippingAddress: {
          name: '<img src=x onerror=alert(1)>',
          phone: '0123456789',
          address: '<script>alert(1)</script>',
          city: 'Testville',
          zip: '12345',
        },
      });

      const res = await getInvoice(token, order._id);
      assert.equal(res.text.includes('<script>alert'), false);
      assert.equal(res.text.includes('<img src=x'), false);
      assert.ok(res.text.includes('&lt;img src=x onerror=alert(1)&gt;'));
    });
  });

  // -------------------------------------------------------------------------
  describe('content', () => {
    dbIt('prints the seller block from store settings and follows ?lang=ar', async () => {
      await StoreSettings.create({
        _id: SINGLETON_ID,
        storeName: 'TrendVaulta',
        invoice: { legalName: 'TrendVaulta Trading LLC', address: 'Riyadh', taxId: '300123456700003', prefix: 'TVS' },
      });
      const { user, token } = await createUser();
      const order = await paidOrder(user, await createProduct());

      const en = await getInvoice(token, order._id);
      assert.ok(en.text.includes('TrendVaulta Trading LLC'));
      assert.ok(en.text.includes('300123456700003'));
      assert.match(en.text, /TVS-\d{4}-000001/);

      const ar = await getInvoice(token, order._id, { lang: 'ar' });
      assert.ok(ar.text.includes('<html lang="ar" dir="rtl">'));
      assert.ok(ar.text.includes('الرقم الضريبي'));
    });
  });

  // -------------------------------------------------------------------------
  describe('numbering', () => {
    dbIt('is assigned when the payment is captured, in payment order', async () => {
      const { user } = await createUser();
      const product = await createProduct({ stock: 10 });
      const a = await createOrder({ user, product });
      const b = await createOrder({ user, product });

      for (const [order, pi] of [[b, 'pi_b'], [a, 'pi_a']]) {
        const res = await postWebhook(request, checkoutCompletedEvent(completedSession(order, { paymentIntentId: pi })));
        assert.equal(res.status, 200);
      }

      const year = new Date().getUTCFullYear();
      assert.equal((await reloadOrder(b._id)).invoiceNumber, `TV-${year}-000001`);
      assert.equal((await reloadOrder(a._id)).invoiceNumber, `TV-${year}-000002`);
    });

    dbIt('never changes once issued, even after the prefix changes', async () => {
      const { user, token } = await createUser();
      const order = await paidOrder(user, await createProduct());

      await getInvoice(token, order._id);
      const first = (await reloadOrder(order._id)).invoiceNumber;
      assert.ok(first);

      await StoreSettings.create({ _id: SINGLETON_ID, invoice: { prefix: 'NEW' } });
      invalidateStoreSettingsCache();
      await getInvoice(token, order._id);
      assert.equal((await reloadOrder(order._id)).invoiceNumber, first);
    });

    dbIt('concurrent requests number an older paid order once, with no gap', async () => {
      const { user, token } = await createUser();
      const product = await createProduct();
      // Paid before invoice numbers existed
      const legacy = await paidOrder(user, product);
      const next = await paidOrder(user, product);

      const results = await Promise.all([
        getInvoice(token, legacy._id),
        getInvoice(token, legacy._id),
        ensureInvoiceNumber(Order, legacy._id),
        ensureInvoiceNumber(Order, legacy._id),
      ]);
      assert.ok(results.slice(0, 2).every((r) => r.status === 200));

      const year = new Date().getUTCFullYear();
      assert.equal((await reloadOrder(legacy._id)).invoiceNumber, `TV-${year}-000001`);
      assert.equal(results[2], `TV-${year}-000001`);
      assert.equal(results[3], `TV-${year}-000001`);

      // The next order continues the sequence: no number was burned
      assert.equal(await ensureInvoiceNumber(Order, next._id), `TV-${year}-000002`);
    });

    dbIt('takes over a claim left by a crash after a minute', async () => {
      const { user } = await createUser();
      const order = await paidOrder(user, await createProduct(), {
        invoiceClaimedAt: new Date(Date.now() - 2 * 60 * 1000),
      });

      const number = await ensureInvoiceNumber(Order, order._id);
      assert.match(number, /^TV-\d{4}-000001$/);
      assert.equal((await reloadOrder(order._id)).invoiceClaimedAt, null);
    });
  });

  // -------------------------------------------------------------------------
  describe('settings', () => {
    dbIt('validates the invoice prefix and keeps the other invoice fields on a partial update', async () => {
      const { token } = await createUser({ roles: ['admin'] });
      const put = (body) =>
        request(app).put('/api/admin/settings').set('Authorization', `Bearer ${token}`).send(body);

      assert.equal((await put({ invoice: { legalName: 'Shop LLC', taxId: '123' } })).status, 200);
      const res = await put({ invoice: { prefix: 'shop' } });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.invoice.prefix, 'SHOP');
      assert.equal(res.body.data.invoice.legalName, 'Shop LLC');
      assert.equal(res.body.data.invoice.taxId, '123');

      assert.equal((await put({ invoice: { prefix: 'TV-1' } })).status, 400);
      assert.equal((await put({ invoice: { prefix: 'ABCDEFGHIJK' } })).status, 400);
    });
  });
});
