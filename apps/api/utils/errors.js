/**
 * Custom error classes for better error handling
 */

class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

/**
 * Joi error → response details a client can translate: the rule (`type`, e.g.
 * `string.min`) and its `limit` travel with the English message. Only `limit`
 * is copied from Joi's context — the rest can echo user input (passwords).
 */
function joiDetails(error) {
  return error.details.map((detail) => ({
    field: detail.path.join('.'),
    message: detail.message,
    type: detail.type,
    ...(detail.context && detail.context.limit !== undefined && { limit: detail.context.limit }),
  }));
}

/**
 * Body for a controller that validates inline (400). `message` stays the
 * first Joi message so existing clients are unaffected; `code` + `details`
 * let the dashboard show it in the reader's language.
 */
function validationBody(error) {
  return {
    message: error.details[0].message,
    code: 'VALIDATION_ERROR',
    details: joiDetails(error),
  };
}

module.exports = {
  joiDetails,
  validationBody,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
};
