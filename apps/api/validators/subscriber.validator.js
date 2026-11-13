const Joi = require('joi');

const validateSubscribe = (obj) => {
  const schema = Joi.object({
    email: Joi.string().trim().min(5).max(100).required().email(),
    source: Joi.string().valid('footer', 'checkout', 'other').optional(),
  });
  return schema.validate(obj);
};

const validateConfirm = (obj) => {
  const schema = Joi.object({
    email: Joi.string().trim().min(5).max(100).required().email(),
    exp: Joi.number().integer().required(),
    token: Joi.string().trim().max(200).required(),
  });
  return schema.validate(obj);
};

const validateUnsubscribe = (obj) => {
  const schema = Joi.object({
    email: Joi.string().trim().min(5).max(100).required().email(),
    token: Joi.string().trim().max(200).required(),
  });
  return schema.validate(obj);
};

module.exports = {
  validateSubscribe,
  validateConfirm,
  validateUnsubscribe,
};
