const crypto = require('node:crypto');

// Stateless, signed newsletter links: nothing to store or clean up, and a
// token only works for the address and purpose it was issued for.
const CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function secret() {
  return process.env.NEWSLETTER_SECRET || process.env.JWT_SECRET_KEY || '';
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Double opt-in link parts; valid for 7 days. */
function createConfirmToken(email, now = Date.now()) {
  const exp = now + CONFIRM_TTL_MS;
  return { exp, token: sign(`confirm:${email}:${exp}`) };
}

function verifyConfirmToken(email, exp, token, now = Date.now()) {
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < now) return false;
  return safeEqual(token, sign(`confirm:${email}:${expNum}`));
}

/** Per-address unsubscribe token; never expires (links live in old mail). */
function createUnsubscribeToken(email) {
  return sign(`unsubscribe:${email}`);
}

function verifyUnsubscribeToken(email, token) {
  return safeEqual(token, createUnsubscribeToken(email));
}

function newsletterLinks(email) {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:3001';
  const { exp, token } = createConfirmToken(email);
  const q = (params) => new URLSearchParams({ email, ...params }).toString();
  return {
    confirmUrl: `${frontend}/newsletter/confirm?${q({ exp: String(exp), token })}`,
    unsubscribeUrl: `${frontend}/newsletter/unsubscribe?${q({
      token: createUnsubscribeToken(email),
    })}`,
  };
}

module.exports = {
  createConfirmToken,
  verifyConfirmToken,
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  newsletterLinks,
};
