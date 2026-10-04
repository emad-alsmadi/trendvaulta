const mongoose = require('mongoose');

const GiftOptionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    // Per-language label; the storefront falls back to the English label
    // above when missing — same pattern as StorefrontModule's hero slides
    // (models/StorefrontModule.js).
    translations: {
      ar: {
        label: { type: String, trim: true },
      },
    },
    q: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    minPrice: {
      type: Number,
      min: 0,
    },
    maxPrice: {
      type: Number,
      min: 0,
    },
  },
  { _id: false },
);

const GiftFinderConfigSchema = new mongoose.Schema(
  {
    occasions: {
      type: [GiftOptionSchema],
      default: [],
    },
    recipients: {
      type: [GiftOptionSchema],
      default: [],
    },
    budgets: {
      type: [GiftOptionSchema],
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'gift_finder_config',
  }
);

// Singleton: only one active config at a time
GiftFinderConfigSchema.index({ active: 1 });

module.exports = mongoose.model('GiftFinderConfig', GiftFinderConfigSchema);
