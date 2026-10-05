const mongoose = require('mongoose');
const logger = require('../utils/logger');
const Joi = require('joi');

const ShippingMethodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    handle: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    priceUsd: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedDaysMin: {
      type: Number,
      min: 0,
      default: 1,
    },
    estimatedDaysMax: {
      type: Number,
      min: 0,
      default: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { _id: true },
);

const ShippingZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    countries: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => Array.isArray(v),
        message: 'Countries must be an array of ISO 3166-1 alpha-2 codes',
      },
    },
    regionPattern: {
      type: String,
      trim: true,
      default: '',
    },
    postalCodePattern: {
      type: String,
      trim: true,
      default: '',
    },
    methods: {
      type: [ShippingMethodSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

ShippingZoneSchema.index({ isActive: 1, sortOrder: 1 });
ShippingZoneSchema.index({ countries: 1 });

const ShippingZone = mongoose.model('ShippingZone', ShippingZoneSchema);

// DASH-609/API-203: handle feeds straight into commerce.js's fulfilment
// resolution, where the literal string 'none' is a reserved sentinel
// meaning "no delivery" (resolveFulfillment) — a method using it as its own
// handle would collide with that meaning. The pattern also rules out
// anything that wouldn't round-trip cleanly through a query string/URL.
const HANDLE_PATTERN = /^[a-z0-9-]+$/;

const shippingMethodSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  handle: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .lowercase()
    .pattern(HANDLE_PATTERN)
    .invalid('none')
    .required()
    .messages({
      'string.pattern.base': 'handle may only contain lowercase letters, numbers and hyphens',
      'any.invalid': '"none" is reserved (it means no delivery) and cannot be used as a method handle',
    }),
  description: Joi.string().trim().max(500).allow('').optional(),
  priceUsd: Joi.number().min(0).required(),
  estimatedDaysMin: Joi.number().integer().min(0).optional(),
  estimatedDaysMax: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().optional(),
});

const MAX_PATTERN_LENGTH = 200;
const MAX_MATCH_INPUT_LENGTH = 100;

// Patterns run against shopper input on every quote/checkout, so reject
// anything that doesn't compile (it would otherwise 500 every request).
const zonePatternSchema = Joi.string()
  .trim()
  .allow('')
  .max(MAX_PATTERN_LENGTH)
  .custom((value, helpers) => {
    if (!value) return value;
    try {
      new RegExp(value, 'i');
      return value;
    } catch {
      return helpers.message('{{#label}} must be a valid regular expression');
    }
  })
  .optional();

/**
 * Does an address fall inside a zone's region/postal patterns? A pattern
 * that doesn't compile (legacy data saved before validation) makes the zone
 * not match instead of throwing. Input is length-capped to limit regex cost.
 */
function zoneMatchesAddress(zone, { region, zip } = {}) {
  const checks = [
    [zone.regionPattern, region],
    [zone.postalCodePattern, zip],
  ];
  for (const [pattern, input] of checks) {
    if (!pattern || !input) continue;
    let regex;
    try {
      regex = new RegExp(pattern, 'i');
    } catch {
      logger.error(
        { zoneId: String(zone._id), pattern },
        'ShippingZone has an invalid pattern; zone skipped',
      );
      return false;
    }
    if (!regex.test(String(input).slice(0, MAX_MATCH_INPUT_LENGTH))) {
      return false;
    }
  }
  return true;
}

const validateShippingZone = (obj) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(200).required(),
    countries: Joi.array().items(Joi.string().length(2).uppercase()).optional(),
    regionPattern: zonePatternSchema,
    postalCodePattern: zonePatternSchema,
    // createShippingZone/updateShippingZone accept this whole array in one
    // request (unlike addShippingMethod/updateShippingMethod, which already
    // check uniqueness imperatively against the single method being added) —
    // without this, two methods with the same handle in one payload would
    // both save, and commerce.js's lookup would silently always pick the
    // first.
    methods: Joi.array()
      .items(shippingMethodSchema)
      .optional()
      .custom((methods, helpers) => {
        const handles = methods.map((m) => m.handle);
        if (new Set(handles).size !== handles.length) {
          return helpers.message('Method handles must be unique within a zone');
        }
        return methods;
      }),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().optional(),
  });
  return schema.validate(obj, { stripUnknown: true });
};

const validateShippingMethod = (obj) => {
  const schema = shippingMethodSchema;
  return schema.validate(obj, { stripUnknown: true });
};

module.exports = {
  ShippingZone,
  validateShippingZone,
  validateShippingMethod,
  zoneMatchesAddress,
  ShippingMethodSchema,
};