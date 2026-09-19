const Joi = require('joi');
const { ValidationError } = require('../utils/errors');

/**
 * Validation middleware factory
 * Validates request body against Joi schema
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      throw new ValidationError('Validation failed', details);
    }

    // Replace request body with validated value
    req.body = value;
    next();
  };
};

module.exports = { validate };
