const Joi = require('joi');

const createLookbookSchema = Joi.object({
  id: Joi.string().required().max(50),
  eyebrow: Joi.string().allow('', null).max(100),
  title: Joi.string().required().max(200),
  body: Joi.string().required(),
  ctaLabel: Joi.string().allow('', null).max(100),
  ctaHref: Joi.string().required().max(500),
  imageUrl: Joi.string().required().max(500),
  tone: Joi.string().valid('rose', 'stone', 'teal').default('stone'),
  active: Joi.boolean().default(true),
  sortOrder: Joi.number().default(0),
});

const updateLookbookSchema = Joi.object({
  eyebrow: Joi.string().allow('', null).max(100),
  title: Joi.string().max(200),
  body: Joi.string(),
  ctaLabel: Joi.string().allow('', null).max(100),
  ctaHref: Joi.string().max(500),
  imageUrl: Joi.string().max(500),
  tone: Joi.string().valid('rose', 'stone', 'teal'),
  active: Joi.boolean(),
  sortOrder: Joi.number(),
}).min(1);

module.exports = {
  createLookbookSchema,
  updateLookbookSchema,
};
