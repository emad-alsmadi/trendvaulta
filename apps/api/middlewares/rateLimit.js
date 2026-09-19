/**
 * Simple in-memory sliding-window rate limiter (no Redis).
 * Suitable for single-instance API; replace with shared store for multi-instance.
 */

function getClientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

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
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader(
      'X-RateLimit-Reset',
      String(Math.ceil(bucket.resetAt / 1000)),
    );

    if (bucket.count > max) {
      return res.status(429).json({
        message,
        code: 'RATE_LIMITED',
      });
    }

    return next();
  };
}

/** Presets for sensitive commerce/auth surfaces */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 30,
  keyPrefix: 'auth',
  message: 'Too many authentication attempts. Please try again later.',
});

const passwordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PASSWORD_MAX) || 10,
  keyPrefix: 'password',
  message: 'Too many password reset attempts. Please try again later.',
});

const checkoutRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_CHECKOUT_MAX) || 40,
  keyPrefix: 'checkout',
  message: 'Too many checkout attempts. Please try again later.',
});

const couponValidateRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_COUPON_MAX) || 60,
  keyPrefix: 'coupon',
  message: 'Too many coupon validation attempts. Please try again later.',
});

// Higher ceiling than authRateLimit: with a 15-minute access token, every
// active user legitimately calls this every ~14 minutes, and many users can
// share one IP behind NAT/a corporate proxy.
const refreshRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_REFRESH_MAX) || 120,
  keyPrefix: 'refresh',
  message: 'Too many session refresh attempts. Please sign in again.',
});

module.exports = {
  rateLimit,
  getClientKey,
  authRateLimit,
  passwordRateLimit,
  checkoutRateLimit,
  couponValidateRateLimit,
  refreshRateLimit,
};
