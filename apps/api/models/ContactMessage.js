const mongoose = require('mongoose');
const Joi = require('joi');

const CONTACT_STATUSES = ['new', 'read', 'closed'];

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
      enum: CONTACT_STATUSES,
      default: 'new',
    },
    ip: {
      type: String,
      trim: true,
      default: '',
    },
    // Internal only (dashboard inbox): never shown to the sender.
    staffNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    // Last staff member to change the status, and when.
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    handledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

ContactMessageSchema.index({ createdAt: -1 });
// Inbox filter chips (status) sorted newest first
ContactMessageSchema.index({ status: 1, createdAt: -1 });

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

/** Staff update from the dashboard inbox: status and/or internal note. */
const validateUpdateContactMessage = (obj) => {
  const schema = Joi.object({
    status: Joi.string().valid(...CONTACT_STATUSES),
    staffNote: Joi.string().trim().allow('').max(1000),
  })
    .or('status', 'staffNote')
    .messages({ 'object.missing': 'Provide a status or a staff note' });
  return schema.validate(obj);
};

module.exports = {
  ContactMessage,
  CONTACT_STATUSES,
  validateContactMessage,
  validateUpdateContactMessage,
};
