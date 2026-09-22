const mongoose = require('mongoose');
const Joi = require('joi');

const SubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      minlength: 5,
      maxlength: 100,
    },
    source: {
      type: String,
      enum: ['footer', 'checkout', 'other'],
      default: 'footer',
    },
    status: {
      type: String,
      enum: ['subscribed', 'unsubscribed'],
      default: 'subscribed',
    },
  },
  { timestamps: true },
);

// `unique: true` on the email path already creates the unique index; a
// second explicit schema.index() on the same key only warns at boot.

const Subscriber = mongoose.model('Subscriber', SubscriberSchema);

const validateSubscribe = (obj) => {
  const schema = Joi.object({
    email: Joi.string().trim().min(5).max(100).required().email(),
    source: Joi.string().valid('footer', 'checkout', 'other').optional(),
  });
  return schema.validate(obj);
};

const validateUnsubscribe = (obj) => {
  const schema = Joi.object({
    email: Joi.string().trim().min(5).max(100).required().email(),
  });
  return schema.validate(obj);
};

module.exports = {
  Subscriber,
  validateSubscribe,
  validateUnsubscribe,
};
