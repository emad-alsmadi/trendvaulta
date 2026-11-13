const mongoose = require('mongoose');
const {
  validateContactMessage,
  validateUpdateContactMessage,
  CONTACT_STATUSES,
} = require('../validators/contactMessage.validator');

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

module.exports = {
  ContactMessage,
  CONTACT_STATUSES,
  validateContactMessage,
  validateUpdateContactMessage,
};
