const Joi = require('joi');

// Optional Arabic translation — both fields optional, either can be
// blank to fall back to the English title/description on the storefront.
const helpTopicTranslationsSchema = Joi.object({
  ar: Joi.object({
    title: Joi.string().trim().max(200).allow('').default(''),
    description: Joi.string().trim().max(500).allow('').default(''),
  }),
});

const createHelpTopicSchema = Joi.object({
  id: Joi.string().trim().max(50).required(),
  title: Joi.string().trim().max(200).required(),
  description: Joi.string().trim().max(500).allow('').default(''),
  href: Joi.string().trim().max(500).required(),
  icon: Joi.string().trim().max(50).allow('').default(''),
  translations: helpTopicTranslationsSchema,
  active: Joi.boolean().default(true),
  sortOrder: Joi.number().default(0),
});

const updateHelpTopicSchema = Joi.object({
  id: Joi.string().trim().max(50),
  title: Joi.string().trim().max(200),
  description: Joi.string().trim().max(500).allow(''),
  href: Joi.string().trim().max(500),
  icon: Joi.string().trim().max(50).allow(''),
  translations: helpTopicTranslationsSchema,
  active: Joi.boolean(),
  sortOrder: Joi.number(),
}).min(1);

module.exports = {
  createHelpTopicSchema,
  updateHelpTopicSchema,
};
