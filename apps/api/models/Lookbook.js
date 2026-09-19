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
