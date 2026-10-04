const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
      enum: ['SHIPPING', 'RETURNS', 'PRIVACY', 'TERMS', 'STOREFRONT_TRUST'],
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    // Per-language copy; the storefront falls back to title/body above
    // when a translation (or one of its fields) is missing — same pattern
    // as StorefrontModule's hero slides (models/StorefrontModule.js).
    translations: {
      ar: {
        title: { type: String, trim: true, maxlength: 200 },
        body: { type: String, trim: true },
      },
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'content',
  },
);

// Ensure only one active content per type
ContentSchema.index({ type: 1, active: 1 }, { unique: true, partialFilterExpression: { active: true } });

const Content = mongoose.model('Content', ContentSchema);

module.exports = { Content };
