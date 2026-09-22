/**
 * Rate Limiting Middleware
 *
 * This module provides in-memory rate limiting functionality with support for:
 * - Tiered rate limiting (public, authenticated, admin)
 * - Endpoint-specific limits
 * - Sliding window algorithm
 * - Per-user rate limiting (user ID + IP)
 * - Monitoring and logging
 *
 * Suitable for single-instance deployments.
 */

const config = require('../config/rateLimit.config');
const logger = require('../utils/logger');

/**
 * Client identifier: IP (+ user id when authenticated).
 * req.ip is resolved by Express from `trust proxy` (see app.js); reading
 * X-Forwarded-For directly would let any client pick its own bucket.
 */
function getClientKey(req) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const userId = req.user?.id || 'anonymous';
  return `${ip}:${userId}`;
}

/**
 * In-memory sliding-window rate limiter
 */
function rateLimit(options = {}) {
  const windowMs = Number(options.windowMs) || 15 * 60 * 1000;
  const max = Number(options.max) || 100;
  const keyPrefix = options.keyPrefix || 'rl';
  const keyGenerator = options.keyGenerator || getClientKey;
  const message =
    options.message || 'Too many requests. Please try again later.';

  /** @type {Map<string, { count: number, resetAt: number }>} */
  const buckets = new Map();

  // Opportunistic cleanup
  const cleanupEvery = 200;
  let hits = 0;

  return function rateLimitMiddleware(req, res, next) {
    // Check if IP is whitelisted
    const ip = req.ip || req.socket?.remoteAddress;
    if (config.whitelistedIPs.includes(ip)) {
      return next();
    }

    const now = Date.now();
    const key = `${keyPrefix}:${keyGenerator(req)}`;
    let bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    hits += 1;

    if (hits % cleanupEvery === 0) {
      for (const [k, v] of buckets) {
        if (now >= v.resetAt) buckets.delete(k);
      }
    }

    const remaining = Math.max(0, max - bucket.count);
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader(
      'X-RateLimit-Reset',
      String(Math.ceil(bucket.resetAt / 1000)),
    );
    res.setHeader('Retry-After', String(retryAfter));

    if (bucket.count > max) {
      // Log violation
      if (config.monitoring.logViolations) {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userId: req.user?.id,
          endpoint: keyPrefix,
          count: bucket.count,
          limit: max,
          requestId: req.id,
          method: req.method,
          url: req.url,
        });
      }

      return res.status(429).json({
        message,
        code: 'RATE_LIMITED',
        retryAfter,
      });
    }

    return next();
  };
}

/** Presets for sensitive commerce/auth surfaces */
const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 5,
  keyPrefix: 'auth',
  message: 'Too many authentication attempts. Please try again later.',
});

const passwordRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PASSWORD_MAX) || 5,
  keyPrefix: 'password',
  message: 'Too many password reset attempts. Please try again later.',
});

const checkoutRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_CHECKOUT_MAX) || 10,
  keyPrefix: 'checkout',
  message: 'Too many checkout attempts. Please try again later.',
});

const couponValidateRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_COUPON_MAX) || 20,
  keyPrefix: 'coupon',
  message: 'Too many coupon validation attempts. Please try again later.',
});

// Success-page polling: separate bucket so verifying a payment never eats
// into the shopper's checkout-session quota.
const verifyPaymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_VERIFY_MAX) || 120,
  keyPrefix: 'verify',
  message: 'Too many payment verification attempts. Please try again later.',
});

// Public cart/checkout quotes (no auth): totals + stock/price drift warnings.
const quoteRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_QUOTE_MAX) || 120,
  keyPrefix: 'quote',
  message: 'Too many quote requests. Please try again later.',
});

// Higher ceiling than authRateLimit: with a 15-minute access token, every
// active user legitimately calls this every ~14 minutes, and many users can
// share one IP behind NAT/a corporate proxy.
const refreshRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_REFRESH_MAX) || 20,
  keyPrefix: 'refresh',
  message: 'Too many session refresh attempts. Please sign in again.',
});

module.exports = {
  rateLimit,
  getClientKey,
  authRateLimit,
  passwordRateLimit,
  checkoutRateLimit,
  verifyPaymentRateLimit,
  quoteRateLimit,
  couponValidateRateLimit,
  refreshRateLimit,
};
