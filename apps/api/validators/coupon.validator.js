const Joi = require('joi');

const createCouponSchema = Joi.object({
  code: Joi.string().required().uppercase().max(50),
  discountType: Joi.string().required().valid('percentage', 'fixed'),
  discountValue: Joi.number().min(0).required(),
  minPurchase: Joi.number().min(0).default(0),
  maxDiscount: Joi.number().min(0).allow(null),
  usageLimit: Joi.number().min(0).allow(null),
  usedCount: Joi.number().min(0).default(0),
  validFrom: Joi.date().required(),
  validUntil: Joi.date().greater(Joi.ref('validFrom')).required(),
  active: Joi.boolean().default(true),
});

const updateCouponSchema = Joi.object({
  code: Joi.string().uppercase().max(50),
  discountType: Joi.string().valid('percentage', 'fixed'),
  discountValue: Joi.number().min(0),
  minPurchase: Joi.number().min(0),
  maxDiscount: Joi.number().min(0).allow(null),
  usageLimit: Joi.number().min(0).allow(null),
  usedCount: Joi.number().min(0),
  validFrom: Joi.date(),
  validUntil: Joi.date().greater(Joi.ref('validFrom')),
  active: Joi.boolean(),
}).min(1);

module.exports = {
  createCouponSchema,
  updateCouponSchema,
};
