# Rate Limiting Documentation

## Overview

TrendVaulta API implements a professional rate limiting system with support for:

- **Tiered rate limiting** (public, authenticated, admin)
- **Endpoint-specific limits** (auth, checkout, general API)
- **Sliding window algorithm** for accurate rate limiting
- **In-memory storage** (suitable for single-instance deployments)
- **Per-user rate limiting** (user ID + IP-based)
- **Configurable limits** via environment variables
- **Monitoring and logging** of rate limit violations
- **IP whitelisting** for trusted sources

## Architecture

### Storage

- **In-Memory Storage** (Single Instance)
  - Uses JavaScript Map for storage
  - Suitable for single-instance deployments
  - No external dependencies
  - Rate limits reset on server restart

### Rate Limiting Tiers

| Tier          | Window   | Max Requests | Use Case                         |
| ------------- | -------- | ------------ | -------------------------------- |
| Public        | 1 minute | 50           | Unauthenticated users (IP-based) |
| Authenticated | 1 minute | 100          | Logged-in users (user ID + IP)   |
| Admin         | 1 minute | 200          | Admin users (higher limits)      |

### Endpoint-Specific Limits

| Endpoint               | Window     | Max Requests | Purpose                      |
| ---------------------- | ---------- | ------------ | ---------------------------- |
| Auth (login, register) | 1 minute   | 5            | Prevent brute force attacks  |
| Password reset         | 1 minute   | 5            | Prevent abuse                |
| Token refresh          | 15 minutes | 20           | Prevent token abuse          |
| Checkout/Payment       | 1 minute   | 10           | Prevent payment abuse        |
| Coupon validation      | 1 minute   | 20           | Prevent coupon brute forcing |

## Configuration

### Environment Variables

```bash
# Whitelisted IPs (bypass rate limiting)
RATE_LIMIT_WHITELIST_IPS=127.0.0.1,192.168.1.100

# Override Default Limits (Optional)
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_PASSWORD_MAX=5
RATE_LIMIT_CHECKOUT_MAX=10
RATE_LIMIT_COUPON_MAX=20
RATE_LIMIT_REFRESH_MAX=20
```

### Configuration File

Rate limits are configured in `config/rateLimit.config.js`:

```javascript
module.exports = {
  whitelistedIPs: [...],
  tiers: { public, authenticated, admin },
  endpoints: { auth, register, password, refresh, checkout, payment, coupon },
  monitoring: { logViolations, alertThreshold },
};
```

## Usage

### Using Preset Rate Limiters

The API provides preset rate limiters for common use cases:

```javascript
const {
  authRateLimit,
  passwordRateLimit,
  checkoutRateLimit,
  couponValidateRateLimit,
  refreshRateLimit,
} = require('../middlewares/rateLimit');

// Auth endpoints
router.post('/auth/login', authRateLimit, loginUser);
router.post('/auth/register', authRateLimit, registerUser);

// Password reset
router.post(
  '/password/forgot-password',
  passwordRateLimit,
  sendForgotPasswordLink,
);

// Checkout
router.post('/payments/checkout', checkoutRateLimit, createCheckoutSession);

// Coupon validation
router.post('/coupons/validate', couponValidateRateLimit, validateCoupon);

// Token refresh
router.post('/auth/refresh', refreshRateLimit, refreshAccessToken);
```

### Creating Custom Rate Limiters

Create custom rate limiters using the factory function:

```javascript
const { rateLimit } = require('../middlewares/rateLimit');

// Custom limiter for a specific endpoint
const customLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  keyPrefix: 'custom',
  message: 'Custom rate limit message',
});

router.post('/api/custom', customLimiter, customHandler);
```

## Response Headers

All rate-limited endpoints include the following headers:

| Header                  | Description                              |
| ----------------------- | ---------------------------------------- |
| `X-RateLimit-Limit`     | Maximum requests per window              |
| `X-RateLimit-Remaining` | Remaining requests in current window     |
| `X-RateLimit-Reset`     | Unix timestamp when window resets        |
| `Retry-After`           | Seconds to wait before retrying (on 429) |

## Error Response

When rate limit is exceeded, the API returns:

```json
{
  "message": "Too many authentication attempts. Please try again later.",
  "code": "RATE_LIMITED",
  "retryAfter": 45
}
```

## Monitoring and Logging

### Log Levels

Rate limit violations are logged at the `warn` level:

```javascript
logger.warn('Rate limit exceeded', {
  ip: req.ip,
  userId: req.user?.id,
  keyPrefix: 'auth',
  count: 6,
  limit: 5,
});
```

### Alerting

Configure alert threshold in `config/rateLimit.config.js`:

```javascript
monitoring: {
  alertThreshold: 10, // Alert after 10 violations from same IP in 5 minutes
}
```

## Testing

### Testing Rate Limits

Use curl to test rate limiting:

```bash
# Test auth endpoint (should hit limit after 5 requests)
for i in {1..10}; do
  curl -X POST https://trendvaulta.onrender.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  echo ""
done
```

## Best Practices

1. **Monitor Violations:** Set up alerts for rate limit violations to detect abuse patterns.

2. **Whitelist Trusted IPs:** Add monitoring services and admin IPs to the whitelist.

3. **Adjust Limits:** Tune rate limits based on your traffic patterns and business needs.

4. **Test Thoroughly:** Test rate limiting before deploying to production.

5. **Document Limits:** Communicate rate limits to API consumers in your documentation.

## Troubleshooting

### Rate Limits Not Working

- Check middleware order (rate limiter should come before route handler)
- Verify the limiter is imported correctly
- Check if IP is whitelisted

### Rate Limits Too Strict

- Adjust limits in `config/rateLimit.config.js`
- Override with environment variables
- Consider adding IP to whitelist for trusted sources

### Rate Limits Reset on Restart

- This is expected behavior for in-memory storage
- Rate limits reset when the server restarts
- For persistent rate limits, consider implementing database-backed storage

## Security Considerations

1. **IP Spoofing:** Rate limiting by IP can be bypassed via proxy rotation. Consider additional security measures for sensitive endpoints.

2. **Shared IPs:** Users behind NAT/proxies share the same IP, which may affect rate limiting accuracy.

3. **Whitelist Management:** Regularly review and update whitelisted IPs to prevent unauthorized access.

## Future Enhancements

- [ ] Implement CAPTCHA for repeated violations
- [ ] Add geographic rate limiting
- [ ] Implement adaptive rate limiting based on traffic patterns
- [ ] Add rate limit analytics dashboard
- [ ] Support for database-backed persistent rate limits

## Support

For issues or questions about rate limiting, contact the development team or create an issue in the repository.
