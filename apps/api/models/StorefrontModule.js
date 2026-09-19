const mongoose = require('mongoose');

const StorefrontModuleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    type: {
      type: String,
      required: true,
      enum: ['hero_carousel', 'trust_strip', 'featured_brands', 'bestsellers', 'new_arrivals', 'deals_rail', 'lookbooks', 'testimonials', 'categories', 'why_choose_us'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
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
    // Module-specific configuration
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // For hero_carousel: array of slides
    slides: [{
      id: { type: String, required: true },
      eyebrow: { type: String, trim: true },
      title: { type: String, required: true },
      subtitle: { type: String, trim: true },
      ctaLabel: { type: String, trim: true },
      ctaHref: { type: String, trim: true },
      href: { type: String, trim: true },
      imageUrl: { type: String, trim: true },
      tone: { type: String, enum: ['rose', 'stone', 'teal', 'indigo'], default: 'stone' },
      active: { type: Boolean, default: true },
      sortOrder: { type: Number, default: 0 },
    }],
    // For trust_strip: array of trust items
    trustItems: [{
      icon: { type: String, trim: true },
      title: { type: String, required: true },
      description: { type: String, required: true },
    }],
    // For categories/featured_brands: limit
    limit: { type: Number, default: 8 },
    // For lookbooks/testimonials: array of items
    items: [{
      type: mongoose.Schema.Types.Mixed,
    }],
  },
  { timestamps: true, collection: 'storefront_modules' }
);

// Ensure only one active module per key
StorefrontModuleSchema.index({ key: 1, active: 1 }, { unique: true, partialFilterExpression: { active: true } });

module.exports = mongoose.model('StorefrontModule', StorefrontModuleSchema);
