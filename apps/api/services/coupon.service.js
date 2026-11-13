/**
 * Coupon domain: discount math, usage-limit checks against order history,
 * and the paid-order usedCount bump. Extracted from commerce.service.js —
 * behavior unchanged.
 */

const { Coupon } = require('../models/Coupon');
const { roundMoney } = require('./pricing.service');

/**
 * A coupon's `expirationDate` is stored as whatever midnight the dashboard
 * datepicker sent, so comparing it directly against `now` kills the coupon
 * at 00:00 on the expiry day instead of at the end of it — a coupon meant
 * to work "through" that date stops working a full day early. Normalizing
 * to 23:59:59.999 server-local-time at the comparison site (not at write
 * time) needs no migration and keeps every existing expiry check in sync.
 */
function couponExpiresAt(coupon) {
  const expiresAt = new Date(coupon.expirationDate);
  expiresAt.setHours(23, 59, 59, 999);
  return expiresAt;
}

function calculateCouponDiscount(coupon, orderAmount) {
  const amount = Math.max(0, Number(orderAmount) || 0);
  if (!coupon) {
    return {
      discountAmount: 0,
      valid: false,
      code: 'COUPON_INVALID',
      message: 'Coupon not found',
    };
  }
  if (!coupon.isActive) {
    return {
      discountAmount: 0,
      valid: false,
      code: 'COUPON_INACTIVE',
      message: 'Coupon is inactive',
    };
  }
  if (couponExpiresAt(coupon) < new Date()) {
    return {
      discountAmount: 0,
      valid: false,
      code: 'COUPON_EXPIRED',
      message: 'Coupon has expired',
    };
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return {
      discountAmount: 0,
      valid: false,
      code: 'COUPON_LIMIT_REACHED',
      message: 'Coupon usage limit has been reached',
    };
  }
  if (amount < Number(coupon.minimumOrderAmount || 0)) {
    return {
      discountAmount: 0,
      valid: false,
      code: 'COUPON_MIN_ORDER',
      params: { amount: Number(coupon.minimumOrderAmount) },
      message: `Minimum order amount of $${coupon.minimumOrderAmount} required`,
    };
  }

  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (amount * Number(coupon.discountValue)) / 100;
  } else {
    discountAmount = Number(coupon.discountValue);
  }
  discountAmount = roundMoney(Math.min(Math.max(0, discountAmount), amount));

  return { discountAmount, valid: true };
}

// A Stripe Checkout session lives 30 min (services/payment.service.js); a pending
// order younger than this is an open checkout holding a coupon use.
const OPEN_CHECKOUT_WINDOW_MS = 31 * 60 * 1000;

/**
 * Usage limits that need order history (calculateCouponDiscount only sees
 * the coupon). Global: paid uses + other shoppers' open checkouts must stay
 * under usageLimit, so concurrent sessions can't all redeem the last use.
 * Per customer: only this customer's PAID orders count, so returning from
 * Stripe to retry isn't blocked by their own abandoned checkout.
 * @returns {Promise<{ valid: boolean, message?: string }>}
 */
async function checkCouponUsage(coupon, customer) {
  if (!coupon)
    return {
      valid: false,
      code: 'COUPON_INVALID',
      message: 'Coupon not found',
    };
  const { Order } = require('../models/Order');
  // Accepts a user id (signed-in callers) or { userId, email } (guests too)
  const { userId = null, email = '' } =
    customer && typeof customer === 'object' && !customer._bsontype
      ? customer
      : { userId: customer };
  const guestEmail = String(email || '')
    .trim()
    .toLowerCase();

  if (coupon.usageLimit) {
    const openFilter = {
      couponId: coupon._id,
      paymentStatus: 'pending',
      createdAt: { $gte: new Date(Date.now() - OPEN_CHECKOUT_WINDOW_MS) },
    };
    if (userId) openFilter.user = { $ne: userId };
    else if (guestEmail) openFilter.guestEmail = { $ne: guestEmail };
    const openCheckouts = await Order.countDocuments(openFilter);
    if (Number(coupon.usedCount || 0) + openCheckouts >= coupon.usageLimit) {
      return {
        valid: false,
        code: 'COUPON_LIMIT_REACHED',
        message: 'Coupon usage limit has been reached',
      };
    }
  }

  if (coupon.perCustomerLimit && (userId || guestEmail)) {
    // One person, however they check out: their account's orders plus
    // guest orders under their email (and, for a guest, the account that
    // owns that email). Guest checkout must not reset the limit.
    const { User } = require('../models/User');
    const emails = new Set(guestEmail ? [guestEmail] : []);
    const userIds = new Set(userId ? [String(userId)] : []);
    if (userId) {
      const account = await User.findById(userId).select('email').lean();
      if (account?.email) emails.add(account.email.toLowerCase());
    } else {
      const account = await User.findOne({ email: guestEmail })
        .select('_id')
        .lean();
      if (account) userIds.add(String(account._id));
    }
    const usedByCustomer = await Order.countDocuments({
      couponId: coupon._id,
      paymentStatus: 'paid',
      $or: [
        ...(userIds.size ? [{ user: { $in: [...userIds] } }] : []),
        ...(emails.size ? [{ guestEmail: { $in: [...emails] } }] : []),
      ],
    });
    if (usedByCustomer >= coupon.perCustomerLimit) {
      return {
        valid: false,
        code: 'COUPON_ALREADY_USED',
        message: 'You have already used this coupon',
      };
    }
  }

  return { valid: true };
}

async function loadValidCouponByCode(code) {
  if (!code || typeof code !== 'string') return null;
  return Coupon.findOne({ code: code.trim().toUpperCase() });
}

async function incrementCouponUsedCount(couponId, session) {
  if (!couponId) return null;
  return Coupon.findByIdAndUpdate(
    couponId,
    { $inc: { usedCount: 1 } },
    { new: true, ...(session ? { session } : {}) },
  );
}

module.exports = {
  calculateCouponDiscount,
  checkCouponUsage,
  loadValidCouponByCode,
  incrementCouponUsedCount,
};
