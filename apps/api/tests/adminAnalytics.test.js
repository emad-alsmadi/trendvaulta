/**
 * GET /api/admin/analytics and GET /api/admin/low-stock — the data behind the
 * dashboard charts and the restock queue.
 *
 * What matters here: the day series is zero-filled (a chart must not draw a
 * line across a missing day), only orders that took money are counted, the
 * brand leaderboard survives the two-hop products -> brands join, and low
 * stock is ordered by urgency.
 */
const { describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const {
  app,
  mongoose,
  connectDb,
  disconnectDb,
  clearDb,
  dbIt,
  createUser,
  createProduct,
  createOrder,
} = require('./setup');

const { Brand } = require('../models/Brand');

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

describe('admin analytics', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(clearDb);

  dbIt('requires orders:read', async () => {
    const { token } = await createUser({ roles: ['user'] });
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 403);
  });

  dbIt('zero-fills every day in the window and counts only paid-like orders', async () => {
    const { user, token } = await createUser({ roles: ['admin'] });
    const product = await createProduct({ price: 40, stock: 50 });

    const paid = await createOrder({ user, product, qty: 2 });
    // createdAt is immutable through Mongoose, so backdate via the driver.
    await mongoose.connection.collection('orders').updateOne(
      { _id: paid._id },
      { $set: { paymentStatus: 'paid', status: 'paid', createdAt: daysAgo(2) } },
    );

    // Pending and unpaid: must not reach the series.
    await createOrder({ user, product, qty: 5 });

    const res = await request(app)
      .get('/api/admin/analytics?days=7')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    const { series } = res.body.data;
    assert.equal(series.length, 7, 'one point per requested day');

    const day = daysAgo(2).toISOString().slice(0, 10);
    const point = series.find((p) => p.date === day);
    assert.ok(point, `series contains ${day}`);
    assert.equal(point.orders, 1);
    assert.equal(point.revenue, 80, 'only the paid order, 2 x 40');

    const total = series.reduce((sum, p) => sum + p.orders, 0);
    assert.equal(total, 1, 'the pending order is excluded');
    assert.ok(
      series.every((p) => typeof p.revenue === 'number'),
      'gaps are zeros, not undefined',
    );
  });

  dbIt('ranks products and brands by revenue', async () => {
    const { user, token } = await createUser({ roles: ['admin'] });
    const brand = await Brand.create({ name: 'Aurelia', slug: 'aurelia' });
    const cheap = await createProduct({ title: 'Cheap', price: 10, brand: brand._id });
    const rich = await createProduct({ title: 'Rich', price: 100, brand: brand._id });

    for (const [product, qty] of [
      [cheap, 3],
      [rich, 2],
    ]) {
      const order = await createOrder({ user, product, qty });
      await order.updateOne({ paymentStatus: 'paid', status: 'paid' });
    }

    const res = await request(app)
      .get('/api/admin/analytics?days=30')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    const { topProducts, topBrands } = res.body.data;

    assert.equal(topProducts[0].title, 'Rich', 'highest revenue first');
    assert.equal(topProducts[0].revenue, 200);
    assert.equal(topProducts[1].revenue, 30);

    assert.equal(topBrands.length, 1, 'both products share one brand');
    assert.equal(topBrands[0].name, 'Aurelia');
    assert.equal(topBrands[0].revenue, 230, 'brand revenue sums its products');
    assert.equal(topBrands[0].units, 5);
  });

  dbIt('clamps the window to a sane range', async () => {
    const { token } = await createUser({ roles: ['admin'] });

    const huge = await request(app)
      .get('/api/admin/analytics?days=99999')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(huge.body.data.days, 365);

    const junk = await request(app)
      .get('/api/admin/analytics?days=not-a-number')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(junk.body.data.days, 30, 'falls back to the default');
  });
});

describe('admin low stock', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(clearDb);

  dbIt('returns products at or below the threshold, most urgent first', async () => {
    const { token } = await createUser({ roles: ['admin'] });
    const brand = await Brand.create({ name: 'Aurelia', slug: 'aurelia' });
    await createProduct({ title: 'Plenty', stock: 99, brand: brand._id });
    await createProduct({ title: 'Low', stock: 3, brand: brand._id });
    await createProduct({ title: 'Gone', stock: 0, brand: brand._id });
    await createProduct({ title: 'Hidden', stock: 1, isActive: false, brand: brand._id });

    const res = await request(app)
      .get('/api/admin/low-stock')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    const titles = res.body.data.map((p) => p.title);
    assert.deepEqual(titles, ['Gone', 'Low'], 'out of stock first, inactive excluded');
    assert.equal(res.body.threshold, 5, 'defaults to the model threshold');
    assert.equal(res.body.data[0].brand.name, 'Aurelia', 'brand is populated');
  });

  dbIt('honours an explicit threshold', async () => {
    const { token } = await createUser({ roles: ['admin'] });
    await createProduct({ title: 'Twenty', stock: 20 });

    const tight = await request(app)
      .get('/api/admin/low-stock?threshold=5')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(tight.body.data.length, 0);

    const loose = await request(app)
      .get('/api/admin/low-stock?threshold=25')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(loose.body.data.length, 1);
    assert.equal(loose.body.threshold, 25);
  });
});
