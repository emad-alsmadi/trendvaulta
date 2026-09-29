/**
 * K5 verified-purchase reviews + K8 newsletter/contact endpoints.
 *
 * Focus is on the rules that are easy to regress silently: the purchase gate
 * and its staff bypass, the non-enumerating newsletter responses, and the
 * contact honeypot (which must look exactly like a success while persisting
 * nothing).
 */
const { describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

// The public newsletter/contact limiters (10 and 5 per 15 min) are per-IP and
// shared across every test in this file, which all originate from 127.0.0.1.
// Raise the ceilings before ./setup pulls in app.js, so the limiter presets
// are built with these values. Limiter behaviour itself is covered elsewhere.
process.env.RATE_LIMIT_NEWSLETTER_MAX ||= '1000';
process.env.RATE_LIMIT_CONTACT_MAX ||= '1000';

const {
  app,
  connectDb,
  disconnectDb,
  clearDb,
  dbIt,
  createUser,
  createProduct,
  createOrder,
} = require('./setup');

const { Subscriber } = require('../models/Subscriber');
const { ContactMessage } = require('../models/ContactMessage');
const { Review } = require('../models/Review');

function postReview(token, product, body = {}) {
  return request(app)
    .post('/api/reviews')
    .set('Authorization', `Bearer ${token}`)
    .send({ product: String(product._id), rating: 5, comment: 'Great item', ...body });
}

const validContact = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Where is my order?',
  message: 'I ordered last week and would like a tracking number please.',
};

describe('K5 — verified purchase reviews', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(clearDb);

  dbIt('rejects a review from a user who never bought the product', async () => {
    const { token } = await createUser();
    const product = await createProduct();

    const res = await postReview(token, product);

    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'PURCHASE_REQUIRED');
    assert.equal(await Review.countDocuments(), 0);
  });

  dbIt('accepts a review from a paid buyer and marks it verified', async () => {
    const { user, token } = await createUser();
    const product = await createProduct();
    await createOrder({
      user,
      product,
      status: 'paid',
      paymentStatus: 'paid',
      paidAt: new Date(),
    });

    const res = await postReview(token, product);

    assert.equal(res.status, 201);
    assert.equal(res.body.verifiedPurchase, true);
  });

  dbIt('treats a refunded (non-canceled) order as a purchase', async () => {
    const { user, token } = await createUser();
    const product = await createProduct();
    await createOrder({
      user,
      product,
      status: 'refunded',
      paymentStatus: 'refunded',
    });

    const res = await postReview(token, product);

    assert.equal(res.status, 201);
    assert.equal(res.body.verifiedPurchase, true);
  });

  dbIt('does not count a canceled order as a purchase', async () => {
    const { user, token } = await createUser();
    const product = await createProduct();
    await createOrder({
      user,
      product,
      status: 'canceled',
      paymentStatus: 'refunded',
    });

    const res = await postReview(token, product);

    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'PURCHASE_REQUIRED');
  });

  dbIt('lets an admin review without buying, but not as a verified purchase', async () => {
    const { token } = await createUser({ roles: ['admin'] });
    const product = await createProduct();

    const res = await postReview(token, product);

    assert.equal(res.status, 201);
    assert.equal(res.body.verifiedPurchase, false);
  });

  dbIt('still allows only one review per user per product', async () => {
    const { user, token } = await createUser();
    const product = await createProduct();
    await createOrder({
      user,
      product,
      status: 'paid',
      paymentStatus: 'paid',
    });

    assert.equal((await postReview(token, product)).status, 201);
    const second = await postReview(token, product);

    assert.equal(second.status, 400);
    assert.equal(await Review.countDocuments(), 1);
  });

  dbIt('exposes verifiedPurchase publicly without leaking reviewer email', async () => {
    const { user, token } = await createUser();
    const product = await createProduct();
    await createOrder({
      user,
      product,
      status: 'paid',
      paymentStatus: 'paid',
    });
    await postReview(token, product);

    const res = await request(app).get(`/api/reviews/product/${product._id}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].verifiedPurchase, true);
    assert.equal(res.body[0].user.email, undefined);
  });
});

describe('K8 — newsletter', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(clearDb);

  dbIt('subscribes a new address', async () => {
    const res = await request(app)
      .post('/api/newsletter')
      .send({ email: 'New@Example.com' });

    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Subscribed');

    const doc = await Subscriber.findOne({ email: 'new@example.com' }).lean();
    assert.ok(doc);
    assert.equal(doc.status, 'subscribed');
    assert.equal(doc.source, 'footer');
  });

  dbIt('answers identically for an address that already exists', async () => {
    await request(app).post('/api/newsletter').send({ email: 'dup@example.com' });
    const res = await request(app)
      .post('/api/newsletter')
      .send({ email: 'dup@example.com' });

    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Subscribed');
    assert.equal(await Subscriber.countDocuments({ email: 'dup@example.com' }), 1);
  });

  dbIt('re-subscribes a previously unsubscribed address', async () => {
    await Subscriber.create({ email: 'back@example.com', status: 'unsubscribed' });

    await request(app).post('/api/newsletter').send({ email: 'back@example.com' });

    const doc = await Subscriber.findOne({ email: 'back@example.com' }).lean();
    assert.equal(doc.status, 'subscribed');
  });

  dbIt('unsubscribes, and stays generic for an unknown address', async () => {
    await request(app).post('/api/newsletter').send({ email: 'bye@example.com' });
    const res = await request(app)
      .post('/api/newsletter/unsubscribe')
      .send({ email: 'bye@example.com' });

    assert.equal(res.status, 200);
    const doc = await Subscriber.findOne({ email: 'bye@example.com' }).lean();
    assert.equal(doc.status, 'unsubscribed');

    const unknown = await request(app)
      .post('/api/newsletter/unsubscribe')
      .send({ email: 'never@example.com' });
    assert.equal(unknown.status, 200);
  });

  dbIt('rejects a malformed email', async () => {
    const res = await request(app).post('/api/newsletter').send({ email: 'nope' });
    assert.equal(res.status, 400);
    assert.equal(await Subscriber.countDocuments(), 0);
  });

  dbIt('requires content:read for the admin list', async () => {
    const { token: userToken } = await createUser();
    const { token: adminToken } = await createUser({ roles: ['admin'] });
    await request(app).post('/api/newsletter').send({ email: 'list@example.com' });

    assert.equal(
      (await request(app).get('/api/newsletter/admin')).status,
      401,
    );
    assert.equal(
      (
        await request(app)
          .get('/api/newsletter/admin')
          .set('Authorization', `Bearer ${userToken}`)
      ).status,
      403,
    );

    const ok = await request(app)
      .get('/api/newsletter/admin')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.length, 1);
    assert.equal(ok.body.meta.total, 1);
  });
});

describe('K8 — contact', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(clearDb);

  dbIt('persists a valid message', async () => {
    const res = await request(app).post('/api/contact').send(validContact);

    assert.equal(res.status, 201);
    assert.equal(res.body.message, 'Thanks, we will get back to you shortly.');

    const doc = await ContactMessage.findOne({ email: 'ada@example.com' }).lean();
    assert.ok(doc);
    assert.equal(doc.status, 'new');
    assert.equal(doc.subject, validContact.subject);
  });

  dbIt('silently drops a honeypot submission but looks successful', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ ...validContact, website: 'http://spam.example' });

    assert.equal(res.status, 201);
    assert.equal(res.body.message, 'Thanks, we will get back to you shortly.');
    assert.equal(await ContactMessage.countDocuments(), 0);
  });

  dbIt('accepts an empty honeypot field', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ ...validContact, website: '' });

    assert.equal(res.status, 201);
    assert.equal(await ContactMessage.countDocuments(), 1);
  });

  dbIt('rejects a too-short message', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ ...validContact, message: 'hi' });

    assert.equal(res.status, 400);
    assert.equal(await ContactMessage.countDocuments(), 0);
  });

  dbIt('requires content:read for the admin list', async () => {
    const { token: userToken } = await createUser();
    const { token: adminToken } = await createUser({ roles: ['admin'] });
    await request(app).post('/api/contact').send(validContact);

    assert.equal((await request(app).get('/api/contact/admin')).status, 401);
    assert.equal(
      (
        await request(app)
          .get('/api/contact/admin')
          .set('Authorization', `Bearer ${userToken}`)
      ).status,
      403,
    );

    const ok = await request(app)
      .get('/api/contact/admin')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.length, 1);
    assert.equal(ok.body.meta.total, 1);
  });

  // -------------------------------------------------------------------------
  // Dashboard inbox (P0-04)
  function adminGet(token, query = {}) {
    return request(app)
      .get('/api/contact/admin')
      .query(query)
      .set('Authorization', `Bearer ${token}`);
  }

  function adminPatch(token, id, body) {
    return request(app)
      .patch(`/api/contact/admin/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  async function seedInbox() {
    const make = (over) => ContactMessage.create({ ...validContact, ...over });
    const refund = await make({ name: 'Grace Hopper', email: 'grace@example.com', subject: 'Refund please' });
    const size = await make({ subject: 'Size chart', status: 'read' });
    const done = await make({ subject: 'Thanks!', status: 'closed' });
    return { refund, size, done };
  }

  dbIt('filters the inbox by status and search, with whole-inbox counts', async () => {
    const { token } = await createUser({ roles: ['admin'] });
    const { refund } = await seedInbox();

    const all = await adminGet(token);
    assert.equal(all.status, 200);
    assert.equal(all.body.meta.total, 3);
    assert.deepEqual(all.body.counts, { new: 1, read: 1, closed: 1 });

    const unread = await adminGet(token, { status: 'new' });
    assert.deepEqual(unread.body.data.map((m) => m.subject), ['Refund please']);
    // Counts stay whole-inbox while a filter is applied (sidebar badge)
    assert.deepEqual(unread.body.counts, { new: 1, read: 1, closed: 1 });

    for (const q of ['grace', 'GRACE@example', 'refund']) {
      const found = await adminGet(token, { q });
      assert.deepEqual(found.body.data.map((m) => String(m._id)), [String(refund._id)], q);
    }

    // A regex metacharacter matches literally instead of everything
    assert.equal((await adminGet(token, { q: '.*' })).body.meta.total, 0);
  });

  dbIt('sorts the inbox by an allowed field only', async () => {
    const { token } = await createUser({ roles: ['admin'] });
    await seedInbox();

    const byStatus = await adminGet(token, { sort: 'status', order: 'asc' });
    assert.deepEqual(byStatus.body.data.map((m) => m.status), ['closed', 'new', 'read']);

    // An unknown field falls back to newest first instead of erroring
    const fallback = await adminGet(token, { sort: 'message' });
    assert.equal(fallback.status, 200);
    assert.equal(fallback.body.data.length, 3);
  });

  dbIt('lets staff with content:write change status and note, recording who did it', async () => {
    const { user: mod, token: modToken } = await createUser({ roles: ['moderator'] });
    const { refund } = await seedInbox();

    const res = await adminPatch(modToken, refund._id, {
      status: 'closed',
      staffNote: '  Refunded order #123 by email  ',
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.status, 'closed');
    assert.equal(res.body.data.staffNote, 'Refunded order #123 by email');
    assert.equal(res.body.data.handledBy.email, mod.email);
    assert.ok(res.body.data.handledAt);

    // A note-only edit keeps the status and the status audit fields
    const before = await ContactMessage.findById(refund._id).lean();
    const note = await adminPatch(modToken, refund._id, { staffNote: 'Customer confirmed' });
    assert.equal(note.status, 200);
    const after = await ContactMessage.findById(refund._id).lean();
    assert.equal(after.status, 'closed');
    assert.equal(after.staffNote, 'Customer confirmed');
    assert.equal(String(after.handledAt), String(before.handledAt));
  });

  dbIt('guards the inbox update: auth, permission, validation and unknown ids', async () => {
    const { token: userToken } = await createUser();
    const { token: adminToken } = await createUser({ roles: ['admin'] });
    const { refund } = await seedInbox();

    assert.equal(
      (await request(app).patch(`/api/contact/admin/${refund._id}`).send({ status: 'read' })).status,
      401,
    );
    assert.equal((await adminPatch(userToken, refund._id, { status: 'read' })).status, 403);

    assert.equal((await adminPatch(adminToken, refund._id, { status: 'spam' })).status, 400);
    assert.equal((await adminPatch(adminToken, refund._id, {})).status, 400);
    assert.equal(
      (await adminPatch(adminToken, refund._id, { staffNote: 'x'.repeat(1001) })).status,
      400,
    );

    assert.equal((await adminPatch(adminToken, 'not-an-id', { status: 'read' })).status, 404);
    assert.equal(
      (await adminPatch(adminToken, '64b7f0c2a1b2c3d4e5f60718', { status: 'read' })).status,
      404,
    );

    // Nothing above changed the message
    const unchanged = await ContactMessage.findById(refund._id).lean();
    assert.equal(unchanged.status, 'new');
    assert.equal(unchanged.staffNote, '');
  });

  dbIt('never exposes the staff note to the sender', async () => {
    const res = await request(app).post('/api/contact').send(validContact);
    assert.equal(res.status, 201);
    assert.deepEqual(Object.keys(res.body), ['message']);
  });
});
