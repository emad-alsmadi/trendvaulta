const Joi = require('joi');

const giftOptionSchema = Joi.object({
  id: Joi.string().required(),
  label: Joi.string().required(),
  q: Joi.string().allow('', null),
  category: Joi.string().allow('', null),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
});

const createGiftFinderConfigSchema = Joi.object({
  occasions: Joi.array().items(giftOptionSchema).default([]),
  recipients: Joi.array().items(giftOptionSchema).default([]),
  budgets: Joi.array().items(giftOptionSchema).default([]),
  active: Joi.boolean().default(true),
});

const updateGiftFinderConfigSchema = Joi.object({
  occasions: Joi.array().items(giftOptionSchema),
  recipients: Joi.array().items(giftOptionSchema),
  budgets: Joi.array().items(giftOptionSchema),
  active: Joi.boolean(),
}).min(1);

module.exports = {
  createGiftFinderConfigSchema,
  updateGiftFinderConfigSchema,
};
