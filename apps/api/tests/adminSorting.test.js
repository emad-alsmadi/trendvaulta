/**
 * Server-side sorting and pagination on the admin lists.
 *
 * The properties that matter: a page is a real slice of a totally-ordered set
 * (no row repeated across pages, none skipped), `limit` is bounded, and a
 * sort field outside the allow-list is ignored rather than passed to Mongo.
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

async function admin() {
  return createUser({ roles: ['admin'] });
}

describe('admin order list: sorting and paging', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(clearDb);

  /** Nine orders at distinct totals, so ordering is unambiguous. */
  async function seedOrders(user) {
    const product = await createProduct({ price: 10, stock: 500 });
    for (let i = 1; i <= 9; i += 1) {
      await createOrder({ user, product, qty: i });
    }
    return product;
  }

  dbIt('sorts by an allow-listed column in both directions', async () => {
    const { user, token } = await admin();
    await seedOrders(user);

    const asc = await request(app)
      .get('/api/orders?sort=totalPrice&order=asc&limit=100')
      .set('Authorization', `Bearer ${token}`);
    const desc = await request(app)
      .get('/api/orders?sort=totalPrice&order=desc&limit=100')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(asc.status, 200);
    const ascTotals = asc.body.data.map((o) => o.totalPrice);
    assert.deepEqual(ascTotals, [...ascTotals].sort((a, b) => a - b));
    assert.deepEqual(
      desc.body.data.map((o) => o.totalPrice),
      [...ascTotals].reverse(),
    );
  });

  dbIt('ignores a field outside the allow-list instead of sorting by it', async () => {
    const { user, token } = await admin();
    await seedOrders(user);

    const res = await request(app)
      // paymentIntentId is a real field but not sortable here.
      .get('/api/orders?sort=paymentIntentId&order=asc&limit=100')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200, 'a rejected sort is not an error');
    const dates = res.body.data.map((o) => new Date(o.createdAt).getTime());
    assert.deepEqual(
      dates,
      [...dates].sort((a, b) => b - a),
      'falls back to newest first',
    );
  });

  dbIt('survives an operator-shaped sort key', async () => {
    const { user, token } = await admin();
    await seedOrders(user);

    const res = await request(app)
      .get('/api/orders?sort=$where&order=asc')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.length > 0);
  });

  dbIt('pages without repeating or dropping a row', async () => {
    const { user, token } = await admin();
    await seedOrders(user);

    const seen = [];
    let pages = 0;
    for (let page = 1; page <= 3; page += 1) {
      const res = await request(app)
        .get(`/api/orders?sort=status&order=asc&limit=4&page=${page}`)
        .set('Authorization', `Bearer ${token}`);
      assert.equal(res.status, 200);
      pages = res.body.meta.pages;
      seen.push(...res.body.data.map((o) => o._id));
    }

    assert.equal(pages, 3, '9 rows at 4 per page');
    assert.equal(seen.length, 9);
    assert.equal(new Set(seen).size, 9, 'every row appears exactly once');
  });

  dbIt('reports meta that matches the filter, not the whole collection', async () => {
    const { user, token } = await admin();
    await seedOrders(user);
    const [first] = await mongoose.connection
      .collection('orders')
      .find({})
      .limit(1)
      .toArray();
    await mongoose.connection
      .collection('orders')
      .updateOne({ _id: first._id }, { $set: { status: 'canceled' } });

    const res = await request(app)
      .get('/api/orders?status=canceled')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.body.meta.total, 1);
    assert.equal(res.body.meta.pages, 1);
    assert.equal(res.body.data.length, 1);
  });

  dbIt('searches by customer email as well as order id', async () => {
    const { user, token } = await admin();
    const other = await createUser({ email: 'shopper@example.com' });
    const product = await createProduct({ price: 10, stock: 100 });
    const mine = await createOrder({ user, product });
    await createOrder({ user: other.user, product });

    const byId = await request(app)
      .get(`/api/orders?q=${mine._id}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(byId.body.meta.total, 1);
    assert.equal(byId.body.data[0]._id, String(mine._id));

    const byEmail = await request(app)
      .get('/api/orders?q=shopper@example.com')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(byEmail.body.meta.total, 1, 'only the other customer order');
  });

  dbIt('returns nothing for a search that matches no customer', async () => {
    const { user, token } = await admin();
    const product = await createProduct({ price: 10, stock: 100 });
    await createOrder({ user, product });

    const res = await request(app)
      .get('/api/orders?q=nobody@example.com')
      .set('Authorization', `Bearer ${token}`);

    // Before, an unmatched term dropped the filter and returned every order.
    assert.equal(res.body.meta.total, 0);
    assert.equal(res.body.data.length, 0);
  });

  dbIt('clamps an oversized limit', async () => {
    const { user, token } = await admin();
    await seedOrders(user);

    const res = await request(app)
      .get('/api/orders?limit=100000')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.body.meta.limit, 100);
  });
});

describe('admin user list', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(clearDb);

  dbIt('returns a paginated envelope rather than every user', async () => {
    const { token } = await admin();
    for (let i = 0; i < 6; i += 1) await createUser();

    const res = await request(app)
      .get('/api/users?limit=3')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data), 'data is an array');
    assert.equal(res.body.data.length, 3, 'limit is honoured');
    assert.equal(res.body.meta.total, 7, '6 plus the admin');
    assert.ok(
      res.body.data.every((u) => u.password === undefined),
      'password never leaves the server',
    );
  });

  dbIt('searches username and email, and filters by role', async () => {
    const { token } = await admin();
    await createUser({ username: 'findme', email: 'findme@example.com' });
    await createUser({ username: 'other', email: 'other@example.com' });
    await createUser({ roles: ['moderator'], username: 'mod1' });

    const byName = await request(app)
      .get('/api/users?q=findme')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(byName.body.meta.total, 1);
    assert.equal(byName.body.data[0].username, 'findme');

    const byEmail = await request(app)
      .get('/api/users?q=other@example.com')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(byEmail.body.meta.total, 1);

    const mods = await request(app)
      .get('/api/users?role=moderator')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(mods.body.meta.total, 1);
    assert.equal(mods.body.data[0].username, 'mod1');
  });

  dbIt('treats a regex-shaped search term as literal text', async () => {
    const { token } = await admin();
    await createUser({ username: 'plain', email: 'plain@example.com' });

    const res = await request(app)
      .get('/api/users?q=.*')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 0, '.* must not match everything');
  });

  dbIt('ignores an unknown role filter rather than returning nothing', async () => {
    const { token } = await admin();
    await createUser();

    const res = await request(app)
      .get('/api/users?role=superuser')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.body.meta.total, 2, 'filter dropped, all users returned');
  });
});

describe('admin brand list', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(clearDb);

  const { Brand } = require('../models/Brand');

  dbIt('keeps the legacy -field sort spelling working', async () => {
    const { token } = await admin();
    for (const name of ['Aurelia', 'Lumen', 'Zenith']) {
      await Brand.create({ name, slug: name.toLowerCase() });
    }

    const res = await request(app)
      .get('/api/brands?sort=-name')
      .set('Authorization', `Bearer ${token}`);

    assert.deepEqual(
      res.body.data.map((b) => b.name),
      ['Zenith', 'Lumen', 'Aurelia'],
    );
  });

  dbIt('no longer sorts by an arbitrary path', async () => {
    const { token } = await admin();
    for (const name of ['Aurelia', 'Lumen', 'Zenith']) {
      await Brand.create({ name, slug: name.toLowerCase() });
    }

    const res = await request(app)
      .get('/api/brands?sort=slug&order=desc')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.data.map((b) => b.name),
      ['Aurelia', 'Lumen', 'Zenith'],
      'falls back to name ascending',
    );
  });
});
