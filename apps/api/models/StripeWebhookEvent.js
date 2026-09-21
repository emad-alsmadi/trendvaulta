const mongoose = require('mongoose');

const WEBHOOK_EVENT_TTL_SECONDS = 90 * 24 * 60 * 60;

const StripeWebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      trim: true,
      default: '',
    },
    orderId: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['processing', 'processed', 'failed'],
      default: 'processing',
    },
  },
  { timestamps: true },
);

StripeWebhookEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: WEBHOOK_EVENT_TTL_SECONDS },
);

module.exports = mongoose.model('StripeWebhookEvent', StripeWebhookEventSchema);
