/**
 * Rate Limiting Configuration
 *
 * This file defines rate limit tiers and endpoint-specific limits
 * for the TrendVaulta API.
 *
 * Tiers:
 * - public: Unauthenticated users (IP-based)
 * - authenticated: Logged-in users (user ID + IP-based)
 * - admin: Admin users (higher limits)
 *
 * Environment variables override these defaults:
 * - RATE_LIMIT_WHITELIST_IPS: Comma-separated list of whitelisted IPs
 */

module.exports = {
  // Whitelisted IPs (bypass rate limiting)
  // Useful for admin IPs, monitoring services, etc.
  whitelistedIPs: process.env.RATE_LIMIT_WHITELIST_IPS
    ? process.env.RATE_LIMIT_WHITELIST_IPS.split(',').map((ip) => ip.trim())
    : [],

  // Tier-based limits
  tiers: {
    public: {
      windowMs: 60 * 1000, // 1 minute
      max: 50, // 50 requests per minute
      message: 'Too many requests from this IP. Please try again later.',
    },
    authenticated: {
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute
      message: 'Too many requests. Please try again later.',
    },
    admin: {
      windowMs: 60 * 1000, // 1 minute
      max: 200, // 200 requests per minute
      message: 'Too many admin requests. Please try again later.',
    },
  },

  // Endpoint-specific limits (override tier limits)
  endpoints: {
    // Auth endpoints - strict limits to prevent brute force
    auth: {
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 requests per minute
      message:
        'Too many authentication attempts. Please wait before trying again.',
    },
    register: {
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 requests per minute
      message:
        'Too many registration attempts. Please wait before trying again.',
    },
    password: {
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 requests per minute
      message:
        'Too many password reset attempts. Please wait before trying again.',
    },
    refresh: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // 20 requests per 15 minutes
      message: 'Too many session refresh attempts. Please sign in again.',
    },

    // Payment/checkout - moderate limits to prevent abuse
    checkout: {
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 requests per minute
      message: 'Too many checkout attempts. Please try again later.',
    },
    payment: {
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 requests per minute
      message: 'Too many payment attempts. Please try again later.',
    },

    // Coupon validation - prevent coupon brute forcing
    coupon: {
      windowMs: 60 * 1000, // 1 minute
      max: 20, // 20 requests per minute
      message: 'Too many coupon validation attempts. Please try again later.',
    },

    // General API - use tier limits
    general: null, // Use tier defaults

    // Admin operations - higher limits
    admin: null, // Use admin tier defaults
  },

  // Monitoring and logging
  monitoring: {
    logViolations: true,
    logLevel: 'warn', // warn, error, info
    includeUserContext: true, // Include user ID, IP, endpoint in logs
    alertThreshold: 10, // Alert after 10 violations from same IP in 5 minutes
  },
};
