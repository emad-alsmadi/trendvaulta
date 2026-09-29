/**
 * Email verification (P0-02, decision D5): sign-up sends a single-use link,
 * the link confirms the address, a changed email must be confirmed again,
 * and reviews/returns need a confirmed address. Older accounts count as
 * confirmed. Mail is captured in-process, never sent.
 */
const { describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');

process.env.RATE_LIMIT_AUTH_MAX ||= '1000';
process.env.RATE_LIMIT_EMAIL_VERIFY_MAX ||= '1000';

const {
  app,
  connectDb,
  disconnectDb,
  clearDb,
  dbIt,
  createUser,
  createProduct,
  createOrder,
  checkoutBody,
} = require('./setup');
const { User } = require('../models/User');
const mail = require('../utils/mail');

// Capture outgoing mail instead of sending it
let sent;
const realMail = {
  sendEmailVerificationEmail: mail.sendEmailVerificationEmail,
  sendEmailChangedNotice: mail.sendEmailChangedNotice,
};
function captureMail() {
  sent = { verification: [], changed: [] };
  mail.sendEmailVerificationEmail = async (opts) => {
    sent.verification.push(opts);
    return true;
  };
  mail.sendEmailChangedNotice = async (opts) => {
    sent.changed.push(opts);
    return true;
  };
}

const PASSWORD = 'password123';

async function register(email = 'new@example.com') {
  return request(app)
    .post('/api/auth/register')
    .send({ email, username: 'newbie', password: PASSWORD });
}

function confirm(token) {
  return request(app).post('/api/auth/verify-email').send({ token });
}

function resend(token) {
  return request(app)
    .post('/api/auth/verify-email/resend')
    .set('Authorization', `Bearer ${token}`);
}

function profile(token) {
  return request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`);
}

describe('email verification', () => {
  before(connectDb);
  after(async () => {
    Object.assign(mail, realMail);
    await disconnectDb();
  });
  beforeEach(async () => {
    await clearDb();
    captureMail();
  });

  // -------------------------------------------------------------------------
  describe('sign-up and the link', () => {
    dbIt('sign-up sends a link and leaves the address unconfirmed; only a hash is stored', async () => {
      const res = await register();
      assert.equal(res.status, 201, JSON.stringify(res.body));
      assert.equal(res.body.emailVerified, false);

      assert.equal(sent.verification.length, 1);
      const { to, token } = sent.verification[0];
      assert.equal(to, 'new@example.com');
      assert.match(token, /^[a-f0-9]{64}$/);

      const stored = await User.findOne({ email: 'new@example.com' })
        .select('+emailVerificationTokenHash +emailVerificationExpires')
        .lean();
      assert.equal(stored.emailVerifiedAt, null);
      assert.ok(stored.emailVerificationTokenHash);
      assert.notEqual(stored.emailVerificationTokenHash, token);
      assert.ok(stored.emailVerificationExpires > new Date(Date.now() + 23 * 3600 * 1000));

      // Nothing about the token leaks through the profile
      const me = await profile(res.body.token);
      assert.equal(me.body.user.emailVerified, false);
      assert.equal('emailVerificationTokenHash' in me.body.user, false);
      assert.equal('emailVerificationExpires' in me.body.user, false);
    });

    dbIt('the link confirms the address once; a second use is refused', async () => {
      const res = await register();
      const { token } = sent.verification[0];

      const ok = await confirm(token);
      assert.equal(ok.status, 200);
      assert.equal(ok.body.emailVerified, true);
      assert.equal((await profile(res.body.token)).body.user.emailVerified, true);

      const again = await confirm(token);
      assert.equal(again.status, 400);
      assert.equal(again.body.code, 'VERIFICATION_LINK_INVALID');
    });

    dbIt('refuses an expired, unknown or malformed token with the same answer', async () => {
      await register();
      const { token } = sent.verification[0];
      await User.updateOne(
        { email: 'new@example.com' },
        { $set: { emailVerificationExpires: new Date(Date.now() - 1000) } },
      );

      for (const bad of [token, 'a'.repeat(64), 'nope', '', undefined, { $gt: '' }]) {
        const res = await confirm(bad);
        assert.equal(res.status, 400, JSON.stringify(bad));
        assert.equal(res.body.code, 'VERIFICATION_LINK_INVALID');
      }
      const user = await User.findOne({ email: 'new@example.com' }).lean();
      assert.equal(user.emailVerifiedAt, null);
    });

    dbIt('accounts created before verification existed count as confirmed', async () => {
      const { token } = await createUser(); // no emailVerifiedAt field at all
      assert.equal((await profile(token)).body.user.emailVerified, true);
    });
  });

  // -------------------------------------------------------------------------
  describe('resend', () => {
    dbIt('sends a new link that replaces the old one, at most once a minute', async () => {
      const res = await register();
      const first = sent.verification[0].token;
      // Pretend the sign-up mail went out over a minute ago
      await User.updateOne(
        { email: 'new@example.com' },
        { $set: { emailVerificationSentAt: new Date(Date.now() - 61 * 1000) } },
      );

      const again = await resend(res.body.token);
      assert.equal(again.status, 200, JSON.stringify(again.body));
      const second = sent.verification[1].token;
      assert.notEqual(second, first);
      assert.equal((await confirm(first)).status, 400, 'old link no longer works');

      const tooSoon = await resend(res.body.token);
      assert.equal(tooSoon.status, 429);
      assert.equal(tooSoon.body.code, 'VERIFICATION_RESEND_TOO_SOON');
      assert.ok(Number(tooSoon.headers['retry-after']) > 0);

      assert.equal((await confirm(second)).status, 200);
      const done = await resend(res.body.token);
      assert.equal(done.status, 200);
      assert.equal(done.body.emailVerified, true);
    });

    dbIt('needs a session, and reports a mail outage instead of pretending', async () => {
      assert.equal((await request(app).post('/api/auth/verify-email/resend')).status, 401);

      const res = await register();
      await User.updateOne(
        { email: 'new@example.com' },
        { $set: { emailVerificationSentAt: new Date(0) } },
      );
      mail.sendEmailVerificationEmail = async () => false;
      const down = await resend(res.body.token);
      assert.equal(down.status, 503);
      assert.equal(down.body.code, 'MAIL_UNAVAILABLE');
    });
  });

  // -------------------------------------------------------------------------
  describe('changing the email', () => {
    dbIt('asks the new address to confirm and tells the old one', async () => {
      const password = await bcrypt.hash(PASSWORD, 10);
      const { token } = await createUser({ email: 'old@example.com', password });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'renamed', email: 'fresh@example.com', currentPassword: PASSWORD });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.user.emailVerified, false);

      assert.deepEqual(sent.verification.map((m) => m.to), ['fresh@example.com']);
      assert.deepEqual(sent.changed, [{ to: 'old@example.com', newEmail: 'fresh@example.com' }]);

      const link = sent.verification[0].token;
      assert.equal((await confirm(link)).status, 200);
      assert.equal((await profile(token)).body.user.emailVerified, true);
    });

    dbIt('a username-only edit keeps the address confirmed and sends nothing', async () => {
      const { token } = await createUser({ email: 'same@example.com' });
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'renamed', email: 'same@example.com' });
      assert.equal(res.status, 200);
      assert.equal(res.body.user.emailVerified, true);
      assert.equal(sent.verification.length, 0);
      assert.equal(sent.changed.length, 0);
    });
  });

  // -------------------------------------------------------------------------
  describe('what needs a confirmed address', () => {
    async function unverifiedBuyer() {
      const { user, token } = await createUser({ emailVerifiedAt: null });
      const product = await createProduct();
      const order = await createOrder({
        user,
        product,
        status: 'delivered',
        paymentStatus: 'paid',
        deliveredAt: new Date(),
      });
      return { user, token, product, order };
    }

    dbIt('a review: refused until confirmed, then accepted; staff are exempt', async () => {
      const { user, token, product } = await unverifiedBuyer();
      const post = (t) =>
        request(app)
          .post('/api/reviews')
          .set('Authorization', `Bearer ${t}`)
          .send({ product: String(product._id), rating: 5, comment: 'Lovely fabric' });

      const blocked = await post(token);
      assert.equal(blocked.status, 403);
      assert.equal(blocked.body.code, 'EMAIL_NOT_VERIFIED');

      await User.updateOne({ _id: user._id }, { $set: { emailVerifiedAt: new Date() } });
      assert.equal((await post(token)).status, 201);

      const { token: staff } = await createUser({ roles: ['moderator'], emailVerifiedAt: null });
      assert.equal((await post(staff)).status, 201);
    });

    dbIt('a return request: refused until confirmed', async () => {
      const { token, product, order } = await unverifiedBuyer();
      const res = await request(app)
        .post(`/api/orders/${order._id}/return`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Too small', items: [{ productId: String(product._id), qty: 1 }] });
      assert.equal(res.status, 403, JSON.stringify(res.body));
      assert.equal(res.body.code, 'EMAIL_NOT_VERIFIED');
    });

    dbIt('checkout does not need a confirmed address', async () => {
      const { token } = await createUser({ emailVerifiedAt: null });
      const product = await createProduct({ stock: 5 });
      const res = await request(app)
        .post('/api/payments/checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send(checkoutBody([{ productId: String(product._id), qty: 1 }]));
      assert.equal(res.status, 200, JSON.stringify(res.body));
    });
  });
});
