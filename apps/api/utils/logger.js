/**
 * Professional Logger Utility
 *
 * Uses Pino for high-performance, structured logging.
 * Supports JSON logs for production and pretty-printed logs for development.
 *
 * Why Pino?
 * - Fastest Node.js logger (benchmarks show 10x+ faster than Winston)
 * - JSON-native format (perfect for log aggregation systems)
 * - Low overhead (asynchronous, non-blocking)
 * - Built-in serializers for common objects
 * - Child loggers for context propagation
 *
 * Usage:
 * const logger = require('../utils/logger');
 * logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
 * logger.error('Database connection failed', { error: err.message });
 */

const pino = require('pino');
const config = require('../config/logging.config');

// Redact sensitive fields from logs
const redactFields = config.redact.fields.map((field) => `req.${field}`);

// Base logger configuration
const baseOptions = {
  level: config.level,
  // Redact sensitive fields
  redact: {
    paths: redactFields,
    remove: true,
  },
  // Add custom serializers
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    error: pino.stdSerializers.err,
  },
  // Add base context to all logs
  base: config.baseContext,
  // Timestamp in ISO format
  timestamp: pino.stdTimeFunctions.isoTime,
};

// Development: Pretty-printed logs
let logger;
if (config.pretty) {
  const pinoPretty = require('pino-pretty');
  const prettyStream = pinoPretty({
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
    singleLine: false,
  });
  logger = pino(baseOptions, prettyStream);
} else {
  // Production: JSON logs
  logger = pino(baseOptions);
}

/**
 * Create a child logger with additional context
 * Useful for adding request-specific context
 */
function child(bindings) {
  return logger.child(bindings);
}

/**
 * Log levels
 */
const levels = {
  error: logger.error.bind(logger),
  warn: logger.warn.bind(logger),
  info: logger.info.bind(logger),
  debug: logger.debug.bind(logger),
};

module.exports = {
  ...levels,
  child,
  // Export the raw pino instance for advanced usage
  raw: logger,
};
