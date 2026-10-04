const mongoose = require('mongoose');

const LookbookSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 50,
    },
    eyebrow: {
      type: String,
      trim: true,
      maxlength: 100,
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
    ctaLabel: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    ctaHref: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    // Per-language copy; the storefront falls back to the English fields
    // above when a translation (or one of its fields) is missing — same
    // pattern as StorefrontModule's hero slides (models/StorefrontModule.js).
    translations: {
      ar: {
        eyebrow: { type: String, trim: true, maxlength: 100 },
        title: { type: String, trim: true, maxlength: 200 },
        body: { type: String, trim: true },
        ctaLabel: { type: String, trim: true, maxlength: 100 },
      },
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    tone: {
      type: String,
      enum: ['rose', 'stone', 'teal'],
      default: 'stone',
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  { timestamps: true, collection: 'lookbooks' }
);

module.exports = mongoose.model('Lookbook', LookbookSchema);
