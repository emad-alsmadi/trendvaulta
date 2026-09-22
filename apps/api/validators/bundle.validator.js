const Joi = require('joi');

const bundleItemSchema = Joi.object({
  product: Joi.string().required(),
  quantity: Joi.number().min(1).default(1),
});

const createBundleSchema = Joi.object({
  primaryProduct: Joi.string().required(),
  items: Joi.array().items(bundleItemSchema).min(2).required(),
  bundlePrice: Joi.number().min(0).required(),
  savings: Joi.number().min(0).default(0),
  active: Joi.boolean().default(true),
});

const updateBundleSchema = Joi.object({
  primaryProduct: Joi.string(),
  items: Joi.array().items(bundleItemSchema).min(2),
  bundlePrice: Joi.number().min(0),
  savings: Joi.number().min(0),
  active: Joi.boolean(),
}).min(1);

module.exports = {
  createBundleSchema,
  updateBundleSchema,
};
