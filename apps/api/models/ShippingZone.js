const mongoose = require('mongoose');
const logger = require('../utils/logger');
const {
  validateShippingZone,
  validateShippingMethod,
} = require('../validators/shippingZone.validator');

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

const MAX_PATTERN_LENGTH = 200;
const MAX_MATCH_INPUT_LENGTH = 100;

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

module.exports = {
  ShippingZone,
  ShippingMethodSchema,
  zoneMatchesAddress,
};
