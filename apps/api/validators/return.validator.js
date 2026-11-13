const Joi = require('joi');

const returnItemSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  qty: Joi.number().integer().min(1).required(),
  reason: Joi.string().trim().max(500).allow('').optional(),
  // Titles come from the order itself, never from the client.
  title: Joi.any().strip(),
});

const validateReturnRequest = (obj) => {
  const schema = Joi.object({
    reason: Joi.string().trim().min(1).max(500).required(),
    items: Joi.array().items(returnItemSchema).min(1).required(),
  });
  return schema.validate(obj, { stripUnknown: true });
};

const validateReturnStatus = (obj) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid('approved', 'rejected', 'received', 'refunded')
      .required(),
    notes: Joi.string().trim().max(500).allow('').optional(),
    instructions: Joi.string().trim().max(2000).allow('').optional(),
    refundAmount: Joi.number().precision(2).greater(0).optional(),
  });
  return schema.validate(obj);
};

module.exports = {
  validateReturnRequest,
  validateReturnStatus,
};
