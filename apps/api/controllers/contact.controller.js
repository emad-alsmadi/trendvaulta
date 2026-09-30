const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const {
  ContactMessage,
  CONTACT_STATUSES,
  validateContactMessage,
  validateUpdateContactMessage,
} = require('../models/ContactMessage');
const { sendContactNotificationEmail } = require('../utils/mail');
const { parsePagination } = require('../utils/pagination');
const { buildSort } = require('../utils/sort');
const { normalizeSearchTerm } = require('../utils/search');

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

/** Columns the inbox may sort on; both are indexed (models/ContactMessage.js). */
const CONTACT_SORT_FIELDS = ['createdAt', 'status'];

/**
 * Admin: list contact messages (paginated, newest first by default).
 *
 * Query: `page`, `limit`, `status` (new | read | closed), `q` (sender name,
 * email or subject), `sort` (createdAt | status), `order`.
 * `counts` is per status for the whole inbox, not only this page, so the
 * dashboard can badge unread messages from the same call.
 *
 * @route GET /api/contact/admin
 * @access Private (content:read)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON `{ data, meta, counts }`
 */
const getAdminContactMessages = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, {
    defaultLimit: 50,
  });
  const sort = buildSort(req.query.sort, req.query.order, CONTACT_SORT_FIELDS);

  const filter = {};
  if (CONTACT_STATUSES.includes(req.query.status)) {
    filter.status = req.query.status;
  }
  const term = normalizeSearchTerm(req.query.q);
  if (term) {
    const pattern = { $regex: term, $options: 'i' };
    filter.$or = [{ name: pattern }, { email: pattern }, { subject: pattern }];
  }

  const [data, total, byStatus] = await Promise.all([
    ContactMessage.find(filter)
      .populate('handledBy', 'username email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    ContactMessage.countDocuments(filter),
    ContactMessage.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);

  const counts = Object.fromEntries(CONTACT_STATUSES.map((s) => [s, 0]));
  for (const { _id, n } of byStatus) {
    if (_id in counts) counts[_id] = n;
  }

  res.status(200).json({
    data,
    meta: {
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
    },
    counts,
  });
});

/**
 * Admin: change a message's status and/or its internal staff note.
 * A status change records who made it and when.
 *
 * @route PATCH /api/contact/admin/:id
 * @access Private (content:write)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON `{ data }` (the updated message)
 */
const updateContactMessage = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Message not found' });
  }

  const { error, value } = validateUpdateContactMessage(req.body || {});
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const $set = {};
  if (value.staffNote !== undefined) $set.staffNote = value.staffNote;
  if (value.status !== undefined) {
    $set.status = value.status;
    $set.handledBy = req.user.id;
    $set.handledAt = new Date();
  }

  const data = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    { $set },
    { new: true, runValidators: true },
  )
    .populate('handledBy', 'username email')
    .lean();
  if (!data) {
    return res.status(404).json({ message: 'Message not found' });
  }

  res.status(200).json({ data });
});

module.exports = {
  createContactMessage,
  getAdminContactMessages,
  updateContactMessage,
  CONTACT_SUCCESS_MESSAGE,
};
