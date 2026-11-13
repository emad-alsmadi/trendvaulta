const Joi = require('joi');

const validateCreateCoupon = (obj) => {
  const schema = Joi.object({
    code: Joi.string().min(3).max(50).uppercase().required(),
    discountType: Joi.string().valid('percentage', 'fixed').required(),
    discountValue: Joi.number()
      .min(0)
      .when('discountType', { is: 'percentage', then: Joi.number().max(100) })
      .required(),
    expirationDate: Joi.date().required(),
    usageLimit: Joi.number().min(1).allow(null),
    perCustomerLimit: Joi.number().integer().min(1).allow(null),
    minimumOrderAmount: Joi.number().min(0).default(0),
    isActive: Joi.boolean().default(true),
    description: Joi.string().max(500).allow('', null),
  });
  const { error } = schema.validate(obj);
  return error;
};

const validateUpdateCoupon = (obj) => {
  const schema = Joi.object({
    code: Joi.string().min(3).max(50).uppercase(),
    discountType: Joi.string().valid('percentage', 'fixed'),
    discountValue: Joi.number().min(0),
    expirationDate: Joi.date(),
    usageLimit: Joi.number().min(1).allow(null),
    perCustomerLimit: Joi.number().integer().min(1).allow(null),
    minimumOrderAmount: Joi.number().min(0),
    isActive: Joi.boolean(),
    description: Joi.string().max(500).allow('', null),
  });
  const { error } = schema.validate(obj);
  return error;
};

const validateCouponCode = (obj) => {
  const schema = Joi.object({
    code: Joi.string().required(),
    orderAmount: Joi.number().min(0).required(),
  });
  const { error } = schema.validate(obj);
  return error;
};

module.exports = {
  validateCreateCoupon,
  validateUpdateCoupon,
  validateCouponCode,
};
