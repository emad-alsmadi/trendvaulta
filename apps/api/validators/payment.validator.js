const Joi = require('joi');

const createCheckoutSessionSchema = Joi.object({
  orderId: Joi.string().required(),
});

const verifyPaymentSchema = Joi.object({
  sessionId: Joi.string().required(),
});

module.exports = {
  createCheckoutSessionSchema,
  verifyPaymentSchema,
};
