const Joi = require('joi');

const slideSchema = Joi.object({
  id: Joi.string().required(),
  eyebrow: Joi.string().allow('', null),
  title: Joi.string().required(),
  subtitle: Joi.string().allow('', null),
  ctaLabel: Joi.string().allow('', null),
  ctaHref: Joi.string().allow('', null),
  href: Joi.string().allow('', null),
  imageUrl: Joi.string().allow('', null),
  tone: Joi.string().valid('rose', 'stone', 'teal', 'indigo').default('stone'),
  active: Joi.boolean().default(true),
  sortOrder: Joi.number().default(0),
});

const trustItemSchema = Joi.object({
  icon: Joi.string().allow('', null),
  title: Joi.string().required(),
  description: Joi.string().required(),
});

const createStorefrontModuleSchema = Joi.object({
  key: Joi.string().required().max(50),
  type: Joi.string().required().valid(
    'hero_carousel',
    'trust_strip',
    'featured_brands',
    'bestsellers',
    'new_arrivals',
    'deals_rail',
    'lookbooks',
    'testimonials',
    'categories',
    'why_choose_us'
  ),
  title: Joi.string().allow('', null).max(200),
  active: Joi.boolean().default(true),
  sortOrder: Joi.number().default(0),
  config: Joi.object().default({}),
  slides: Joi.array().items(slideSchema).default([]),
  trustItems: Joi.array().items(trustItemSchema).default([]),
  limit: Joi.number().default(8),
  items: Joi.array().default([]),
});

const updateStorefrontModuleSchema = Joi.object({
  key: Joi.string().max(50),
  type: Joi.string().valid(
    'hero_carousel',
    'trust_strip',
    'featured_brands',
    'bestsellers',
    'new_arrivals',
    'deals_rail',
    'lookbooks',
    'testimonials',
    'categories',
    'why_choose_us'
  ),
  title: Joi.string().allow('', null).max(200),
  active: Joi.boolean(),
  sortOrder: Joi.number(),
  config: Joi.object(),
  slides: Joi.array().items(slideSchema),
  trustItems: Joi.array().items(trustItemSchema),
  limit: Joi.number(),
  items: Joi.array(),
}).min(1);

module.exports = {
  createStorefrontModuleSchema,
  updateStorefrontModuleSchema,
};
