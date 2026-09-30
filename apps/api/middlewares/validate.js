const Joi = require('joi');
const { ValidationError, joiDetails } = require('../utils/errors');

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
      throw new ValidationError('Validation failed', joiDetails(error));
    }

    // Replace request body with validated value
    req.body = value;
    next();
  };
};

module.exports = { validate };
