const Joi = require('joi');

const CONTENT_TYPES = ['SHIPPING', 'RETURNS', 'PRIVACY', 'TERMS', 'STOREFRONT_TRUST'];

// Optional Arabic translation — both fields optional, either can be
// blank to fall back to the English title/body on the storefront.
const contentTranslationsSchema = Joi.object({
  ar: Joi.object({
    title: Joi.string().trim().max(200).allow('').default(''),
    body: Joi.string().trim().allow('').default(''),
  }),
});

const contentFields = {
  type: Joi.string().trim().valid(...CONTENT_TYPES),
  title: Joi.string().trim().max(200),
  body: Joi.string().trim(),
  active: Joi.boolean(),
  translations: contentTranslationsSchema,
};

const createContentSchema = Joi.object({
  type: contentFields.type.required(),
  title: contentFields.title.required(),
  body: contentFields.body.required(),
  active: contentFields.active.default(true),
  translations: contentFields.translations,
});

const updateContentSchema = Joi.object(contentFields).min(1);

module.exports = {
  createContentSchema,
  updateContentSchema,
};
