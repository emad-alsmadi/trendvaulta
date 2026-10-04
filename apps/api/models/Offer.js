const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    badge: {
      type: String,
      trim: true,
      maxlength: 50,
      default: '',
    },
    // Per-language copy; the storefront falls back to title/subtitle/badge
    // above when a translation (or one of its fields) is missing — same
    // pattern as StorefrontModule's hero slides (models/StorefrontModule.js).
    translations: {
      ar: {
        title: { type: String, trim: true, maxlength: 200 },
        subtitle: { type: String, trim: true, maxlength: 500 },
        badge: { type: String, trim: true, maxlength: 50 },
      },
    },
    href: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    endsAt: {
      type: Date,
      default: null,
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
  {
    timestamps: true,
    collection: 'offers',
  },
);

const Offer = mongoose.model('Offer', OfferSchema);

module.exports = { Offer };
