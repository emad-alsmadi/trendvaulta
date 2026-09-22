const mongoose = require('mongoose');
const Joi = require('joi');

const ContactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 5,
      maxlength: 100,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['new', 'read', 'closed'],
      default: 'new',
    },
    ip: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true },
);

ContactMessageSchema.index({ createdAt: -1 });

const ContactMessage = mongoose.model('ContactMessage', ContactMessageSchema);

const validateContactMessage = (obj) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(80).required(),
    email: Joi.string().trim().min(5).max(100).required().email(),
    subject: Joi.string().trim().min(2).max(120).required(),
    message: Joi.string().trim().min(10).max(2000).required(),
    // Honeypot — must be empty when submitted by a human.
    website: Joi.string().trim().allow('').optional(),
  });
  return schema.validate(obj);
};

module.exports = {
  ContactMessage,
  validateContactMessage,
};
