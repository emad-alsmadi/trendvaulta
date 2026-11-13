const Joi = require('joi');

// Optional Arabic translation — all fields optional, any can be blank to
// fall back to the English title/subtitle/badge on the storefront.
const offerTranslationsSchema = Joi.object({
  ar: Joi.object({
    title: Joi.string().trim().max(200).allow('').default(''),
    subtitle: Joi.string().trim().max(500).allow('').default(''),
    badge: Joi.string().trim().max(50).allow('').default(''),
  }),
});

// The admin UI clears the date with an empty string or null; both mean
// "no end date". Valid date strings are cast to Date for the schema.
const endsAtSchema = Joi.date()
  .allow(null, '')
  .custom((value) => (value === '' ? null : value));

const offerFields = {
  title: Joi.string().trim().max(200),
  subtitle: Joi.string().trim().max(500).allow(''),
  badge: Joi.string().trim().max(50).allow(''),
  href: Joi.string().trim().max(500),
  imageUrl: Joi.string().trim().max(1000).allow(''),
  endsAt: endsAtSchema,
  active: Joi.boolean(),
  sortOrder: Joi.number(),
  translations: offerTranslationsSchema,
};

const createOfferSchema = Joi.object({
  title: offerFields.title.required(),
  href: offerFields.href.required(),
  subtitle: offerFields.subtitle.default(''),
  badge: offerFields.badge.default(''),
  imageUrl: offerFields.imageUrl.default(''),
  endsAt: offerFields.endsAt.default(null),
  active: offerFields.active.default(true),
  sortOrder: offerFields.sortOrder.default(0),
  translations: offerFields.translations,
});

const updateOfferSchema = Joi.object(offerFields).min(1);

module.exports = {
  createOfferSchema,
  updateOfferSchema,
};
