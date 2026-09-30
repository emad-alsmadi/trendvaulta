/**
 * K5 verified-purchase reviews + K8 newsletter/contact endpoints.
 *
 * Focus is on the rules that are easy to regress silently: the purchase gate
 * and its staff bypass, the non-enumerating double opt-in newsletter, and the
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
const {
  createConfirmToken,
  createUnsubscribeToken,
} = require('../utils/newsletterTokens');
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

  dbIt('stores a new address as pending until it is confirmed', async () => {
    const res = await request(app)
      .post('/api/newsletter')
      .send({ email: 'New@Example.com' });

    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Check your inbox to confirm');

    const doc = await Subscriber.findOne({ email: 'new@example.com' }).lean();
    assert.ok(doc);
    assert.equal(doc.status, 'pending');
    assert.equal(doc.source, 'footer');
  });

  dbIt('answers identically for an address that already exists', async () => {
    await Subscriber.create({ email: 'dup@example.com', status: 'subscribed' });
    const res = await request(app)
      .post('/api/newsletter')
      .send({ email: 'dup@example.com' });

    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Check your inbox to confirm');
    assert.equal(await Subscriber.countDocuments({ email: 'dup@example.com' }), 1);
    const doc = await Subscriber.findOne({ email: 'dup@example.com' }).lean();
    assert.equal(doc.status, 'subscribed');
  });

  dbIt('a previously unsubscribed address must confirm again', async () => {
    await Subscriber.create({ email: 'back@example.com', status: 'unsubscribed' });

    await request(app).post('/api/newsletter').send({ email: 'back@example.com' });

    const doc = await Subscriber.findOne({ email: 'back@example.com' }).lean();
    assert.equal(doc.status, 'pending');
  });

  dbIt('confirms only with a valid, unexpired signed link', async () => {
    await request(app).post('/api/newsletter').send({ email: 'ok@example.com' });
    const { exp, token } = createConfirmToken('ok@example.com');

    const tampered = await request(app)
      .post('/api/newsletter/confirm')
      .send({ email: 'other@example.com', exp, token });
    assert.equal(tampered.status, 400);
    assert.equal(tampered.body.code, 'NEWSLETTER_LINK_INVALID');

    const old = createConfirmToken('ok@example.com', Date.now() - 8 * 86400000);
    const expired = await request(app)
      .post('/api/newsletter/confirm')
      .send({ email: 'ok@example.com', ...old });
    assert.equal(expired.status, 400);

    const res = await request(app)
      .post('/api/newsletter/confirm')
      .send({ email: 'ok@example.com', exp, token });
    assert.equal(res.status, 200);
    const doc = await Subscriber.findOne({ email: 'ok@example.com' }).lean();
    assert.equal(doc.status, 'subscribed');
    assert.ok(doc.confirmedAt);
  });

  dbIt('unsubscribes only with the signed token, generic for unknown', async () => {
    await Subscriber.create({ email: 'bye@example.com', status: 'subscribed' });

    const noToken = await request(app)
      .post('/api/newsletter/unsubscribe')
      .send({ email: 'bye@example.com' });
    assert.equal(noToken.status, 400);
    const forged = await request(app)
      .post('/api/newsletter/unsubscribe')
      .send({ email: 'bye@example.com', token: createUnsubscribeToken('x@example.com') });
    assert.equal(forged.status, 400);
    let doc = await Subscriber.findOne({ email: 'bye@example.com' }).lean();
    assert.equal(doc.status, 'subscribed');

    const res = await request(app)
      .post('/api/newsletter/unsubscribe')
      .send({ email: 'bye@example.com', token: createUnsubscribeToken('bye@example.com') });
    assert.equal(res.status, 200);
    doc = await Subscriber.findOne({ email: 'bye@example.com' }).lean();
    assert.equal(doc.status, 'unsubscribed');

    const unknown = await request(app)
      .post('/api/newsletter/unsubscribe')
      .send({ email: 'never@example.com', token: createUnsubscribeToken('never@example.com') });
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
});
