/**
 * Unified error handler middleware
 * Catches all errors and returns consistent error responses
 */

const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  logger.error('Request failed', {
    error: {
      message: err.message,
      name: err.name,
      code: err.code,
      statusCode: err.statusCode,
    },
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      userId: req.user?.id,
      requestId: req.id,
    },
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });

  // Default to 500 server error
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    message = 'Validation failed';
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    message = 'Duplicate key error';
    const field = Object.keys(err.keyPattern)[0];
    details = [{ field, message: `${field} already exists` }];
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid ID format';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token expired';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    path: req.path,
    userId: req.user?.id,
    requestId: req.id,
  });

  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    code: 'NOT_FOUND',
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
