/**
 * Logging Configuration
 *
 * This file defines logging configuration for the TrendVaulta API.
 * Uses Pino for high-performance, structured logging.
 *
 * Environment variables:
 * - LOG_LEVEL: Set minimum log level (error, warn, info, debug)
 * - LOG_PRETTY: Enable pretty-printed logs (true/false)
 * - LOG_FILE: Write logs to file (true/false)
 */

module.exports = {
  // Log level hierarchy: error < warn < info < debug
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Pretty-printed logs for development
  pretty: process.env.LOG_PRETTY === 'true' || process.env.NODE_ENV !== 'production',

  // File logging for production
  file: {
    enabled: process.env.LOG_FILE === 'true' || process.env.NODE_ENV === 'production',
    dir: process.env.LOG_DIR || './logs',
    // Separate files by level
    errorFile: 'error.log',
    combinedFile: 'combined.log',
    // Rotate logs daily
    rotate: true,
    // Keep logs for 30 days
    maxAge: '30d',
  },

  // Request logging configuration
  request: {
    enabled: true,
    // Include request body in logs (be careful with sensitive data)
    includeBody: false,
    // Include response body in logs (be careful with large responses)
    includeResponseBody: false,
    // Custom serializers for request/response
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
        },
        remoteAddress: req.ip,
        userId: req.user?.id,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  },

  // Sensitive data to redact from logs
  redact: {
    fields: [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
      'creditCard',
      'cvv',
      'ssn',
      'authorization',
      'cookie',
    ],
    // Replacement string for redacted values
    replacement: '[REDACTED]',
  },

  // Custom metadata to include in all logs
  baseContext: {
    service: 'trendvaulta-api',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  },

  // Performance settings
  performance: {
    // Enable async logging (non-blocking)
    async: true,
    // Buffer size for async logging
    bufferSize: 4096,
  },
};
