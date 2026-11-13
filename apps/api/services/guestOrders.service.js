/**
 * Guest checkout (plan P0-03, decision D2).
 *
 * A guest order has no `user`; it carries `guestEmail`. Access to it (view,
 * cancel, invoice) is granted by a per-order token: an HMAC of the order id
 * and email, keyed off the server secret. It is stateless on purpose. The
 * same token goes to the browser at checkout and into every order email
 * (including the confirmation the webhook sends later), and nothing
 * secret has to be stored.
 *
 * Returns need a confirmed email (decision D5); a guest gets one by
 * registering with the same address, which also attaches their guest
 * orders to the new account.
 */
const crypto = require('node:crypto');

const TOKEN_CONTEXT = 'trendvaulta:guest-order:v1';

function secret() {
  const key = process.env.JWT_SECRET_KEY;
  if (!key) throw new Error('JWT_SECRET_KEY is required for guest order links');
  return key;
}

/** The access token for one guest order (64 hex chars). */
function guestOrderToken(order) {
  return crypto
    .createHmac('sha256', secret())
    .update(`${TOKEN_CONTEXT}:${String(order._id)}:${String(order.guestEmail).toLowerCase()}`)
    .digest('hex');
}

/** Constant-time check of a presented token against a guest order. */
function isValidGuestToken(order, token) {
  if (!order || order.user || !order.guestEmail) return false;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) return false;
  const expected = Buffer.from(guestOrderToken(order), 'hex');
  const given = Buffer.from(token.toLowerCase(), 'hex');
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/** Storefront page for a guest order; the token lives only in this link. */
function guestOrderUrl(order) {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:3001';
  const params = new URLSearchParams({ order: String(order._id), token: guestOrderToken(order) });
  return `${frontend}/guest-order?${params}`;
}

/**
 * Where order emails for this order go, and the link they should carry:
 * the account email + account order page, or the guest email + guest link.
 * @returns {Promise<{ to: string, orderUrl: string }>} `to` is '' if unknown
 */
async function orderEmailTarget(order, UserModel) {
  if (!order) return { to: '', orderUrl: '' };
  if (!order.user && order.guestEmail) {
    return { to: order.guestEmail, orderUrl: guestOrderUrl(order) };
  }
  const frontend = process.env.FRONTEND_URL || 'http://localhost:3001';
  const orderUrl = `${frontend}/user/orders/${order._id}`;
  // Populated user, or an id to look up
  if (order.user && typeof order.user === 'object' && order.user.email) {
    return { to: order.user.email, orderUrl };
  }
  const user = order.user
    ? await UserModel.findById(order.user).select('email').lean()
    : null;
  return { to: user?.email || '', orderUrl };
}

/**
 * Hand an account the guest orders placed with its email. Only call this
 * once the account has proven it owns that email.
 * @returns {Promise<number>} orders attached
 */
async function attachGuestOrders(OrderModel, userId, email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!userId || !normalized) return 0;
  const res = await OrderModel.updateMany(
    { user: null, guestEmail: normalized },
    { $set: { user: userId } },
  );
  return res.modifiedCount ?? 0;
}

module.exports = {
  guestOrderToken,
  isValidGuestToken,
  guestOrderUrl,
  orderEmailTarget,
  attachGuestOrders,
};
