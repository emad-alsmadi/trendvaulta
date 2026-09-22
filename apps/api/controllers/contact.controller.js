const asyncHandler = require('express-async-handler');
const {
  ContactMessage,
  validateContactMessage,
} = require('../models/ContactMessage');
const { sendContactNotificationEmail } = require('../utils/mail');
const { parsePagination } = require('../utils/pagination');

/** Body shown to the sender on success — identical for real and trapped posts. */
const CONTACT_SUCCESS_MESSAGE = 'Thanks, we will get back to you shortly.';

/**
 * Accept a contact-form submission.
 *
 * @route POST /api/contact
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON `{ message }`
 */
const createContactMessage = asyncHandler(async (req, res) => {
  // Honeypot: the `website` field is hidden from humans, so anything in it
  // means a bot. Answer exactly as we would on success — a distinguishable
  // rejection just teaches the bot to leave the field alone — but persist
  // nothing and send no mail. Checked before validation so a bot filling
  // junk in the real fields still gets the same bland 201.
  const honeypot = req.body?.website;
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return res.status(201).json({ message: CONTACT_SUCCESS_MESSAGE });
  }

  const { error, value } = validateContactMessage({
    name: req.body?.name,
    email: req.body?.email,
    subject: req.body?.subject,
    message: req.body?.message,
    ...(req.body?.website !== undefined ? { website: req.body.website } : {}),
  });

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const doc = await ContactMessage.create({
    name: value.name,
    email: String(value.email).toLowerCase().trim(),
    subject: value.subject,
    message: value.message,
    ip: req.ip || '',
  });

  // Best effort: the message is already persisted, so a dead SMTP server
  // must never turn a saved enquiry into an error for the sender.
  try {
    await sendContactNotificationEmail({
      name: doc.name,
      email: doc.email,
      subject: doc.subject,
      message: doc.message,
    });
  } catch {
    // sendContactNotificationEmail already logs; swallow so the request
    // still succeeds.
  }

  res.status(201).json({ message: CONTACT_SUCCESS_MESSAGE });
});

/**
 * Admin: list contact messages (paginated, newest first).
 *
 * @route GET /api/contact/admin
 * @access Private (content:read)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON `{ data, meta }`
 */
const getAdminContactMessages = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, {
    defaultLimit: 50,
  });

  const filter = {};
  if (['new', 'read', 'closed'].includes(req.query.status)) {
    filter.status = req.query.status;
  }

  const [data, total] = await Promise.all([
    ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ContactMessage.countDocuments(filter),
  ]);

  res.status(200).json({
    data,
    meta: {
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
    },
  });
});

module.exports = {
  createContactMessage,
  getAdminContactMessages,
  CONTACT_SUCCESS_MESSAGE,
};
