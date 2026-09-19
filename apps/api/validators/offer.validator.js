const Joi = require('joi');

const createOfferSchema = Joi.object({
  title: Joi.string().required().max(200),
  description: Joi.string().allow('', null),
  type: Joi.string().required().valid('percentage', 'fixed', 'buy_x_get_y'),
  discountValue: Joi.number().min(0).required(),
  minPurchase: Joi.number().min(0).default(0),
  maxDiscount: Joi.number().min(0).allow(null),
  startDate: Joi.date().required(),
  endDate: Joi.date().greater(Joi.ref('startDate')).required(),
  active: Joi.boolean().default(true),
});

const updateOfferSchema = Joi.object({
  title: Joi.string().max(200),
  description: Joi.string().allow('', null),
  type: Joi.string().valid('percentage', 'fixed', 'buy_x_get_y'),
  discountValue: Joi.number().min(0),
  minPurchase: Joi.number().min(0),
  maxDiscount: Joi.number().min(0).allow(null),
  startDate: Joi.date(),
  endDate: Joi.date().greater(Joi.ref('startDate')),
  active: Joi.boolean(),
}).min(1);

module.exports = {
  createOfferSchema,
  updateOfferSchema,
};
