const mongoose = require('mongoose');

const HelpTopicSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 50,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    href: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    icon: {
      type: String,
      trim: true,
      maxlength: 50,
      default: '',
    },
    // Per-language copy; the storefront falls back to title/description
    // above when a translation (or one of its fields) is missing — same
    // pattern as StorefrontModule's hero slides (models/StorefrontModule.js).
    translations: {
      ar: {
        title: { type: String, trim: true, maxlength: 200 },
        description: { type: String, trim: true, maxlength: 500 },
      },
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
    collection: 'help_topics',
  },
);

const HelpTopic = mongoose.model('HelpTopic', HelpTopicSchema);

module.exports = { HelpTopic };
