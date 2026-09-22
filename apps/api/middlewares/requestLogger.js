/**
 * Request Logging Middleware
 *
 * Uses pino-http for automatic HTTP request/response logging.
 * Logs all incoming requests with relevant context.
 *
 * Features:
 * - Automatic request ID generation for tracing
 * - Request/response logging with timing
 * - User context (when authenticated)
 * - Sensitive data redaction
 * - Response time tracking
 */

const pinoHttp = require('pino-http');
const logger = require('../utils/logger');
const config = require('../config/logging.config');

/**
 * Custom serializers to include only relevant information
 */
const serializers = {
  req: (req) => ({
    method: req.method,
    url: req.url,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization'] ? '[REDACTED]' : undefined,
    },
    remoteAddress: req.ip,
    userId: req.user?.id,
    requestId: req.id,
  }),
  res: (res) => ({
    statusCode: res.statusCode,
  }),
};

/**
 * Create request logging middleware
 */
const requestLogger = pinoHttp({
  logger: logger.raw,
  // Use custom serializers
  serializers,
  // Add request ID for tracing
  genReqId: (req) => {
    req.id = req.headers['x-request-id'] || generateRequestId();
    return req.id;
  },
  // Custom log message. pino-http v10 calls these hooks as
  // (req, res, ...) — NOT (res, ...) — passing the wrong argument order
  // here throws on every response (res.req was undefined) and mislabels
  // every request's log level.
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Custom success message
  customSuccessMessage: (req, res, responseTime) => {
    return `${req.method} ${req.url} completed in ${responseTime}ms`;
  },
  // Custom error message
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed: ${err?.message || 'error'}`;
  },
  // Include response time
  customProps: (req, res) => ({
    responseTime: res.responseTime,
  }),
});

/**
 * Generate a unique request ID
 */
function generateRequestId() {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = requestLogger;
