const asyncHandler = require('express-async-handler');
const { validationBody } = require('../utils/errors');
const {
  Subscriber,
  validateSubscribe,
  validateConfirm,
  validateUnsubscribe,
} = require('../models/Subscriber');
const { parsePagination } = require('../utils/pagination');
const {
  newsletterLinks,
  verifyConfirmToken,
  verifyUnsubscribeToken,
} = require('../utils/newsletterTokens');
const { sendNewsletterConfirmEmail } = require('../utils/mail');

const invalidLink = (res) =>
  res.status(400).json({
    message: 'This link is invalid or has expired',
    code: 'NEWSLETTER_LINK_INVALID',
  });

/**
 * Start a newsletter subscription (double opt-in).
 *
 * The address is stored as `pending` and a signed confirmation link is
 * mailed to it; it only becomes `subscribed` when that link is used, so
 * nobody can sign up a third party. Responds with the same generic body
 * whether the address was new, pending, subscribed or unsubscribed, and the
 * mail is sent in the background so timing doesn't tell them apart either.
 *
 * @route POST /api/newsletter
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON `{ message }`
 */
const subscribe = asyncHandler(async (req, res) => {
  const { error, value } = validateSubscribe({
    email: req.body?.email,
    ...(req.body?.source !== undefined ? { source: req.body.source } : {}),
  });

  if (error) {
    return res.status(400).json(validationBody(error));
  }

  const email = String(value.email).toLowerCase().trim();
  const source = value.source || 'footer';

  const existing = await Subscriber.findOne({ email }).select('status').lean();
  if (existing?.status !== 'subscribed') {
    try {
      await Subscriber.updateOne(
        { email },
        { $set: { status: 'pending' }, $setOnInsert: { source } },
        { upsert: true },
      );
    } catch (err) {
      // A concurrent signup for the same address won the insert.
      if (err?.code !== 11000) throw err;
    }
    void sendNewsletterConfirmEmail({ to: email, ...newsletterLinks(email) });
  }

  res.status(200).json({ message: 'Check your inbox to confirm' });
});

/**
 * Confirm a pending subscription from the emailed link.
 *
 * @route POST /api/newsletter/confirm
 * @access Public (signed link)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON `{ message }`
 */
const confirm = asyncHandler(async (req, res) => {
  const { error, value } = validateConfirm({
    email: req.body?.email,
    exp: req.body?.exp,
    token: req.body?.token,
  });
  if (error) return invalidLink(res);

  const email = String(value.email).toLowerCase().trim();
  if (!verifyConfirmToken(email, value.exp, value.token)) {
    return invalidLink(res);
  }

  // Only a pending address is confirmed: an old link must not undo a later
  // unsubscribe. Clicking twice is harmless.
  await Subscriber.updateOne(
    { email, status: 'pending' },
    { $set: { status: 'subscribed', confirmedAt: new Date() } },
  );

  res.status(200).json({ message: 'Subscription confirmed' });
});

/**
 * Unsubscribe via the signed per-address link included in every mail.
 *
 * Always 200 for a valid link, even for an address that was never
 * subscribed. Without a valid token nothing changes, so nobody can
 * unsubscribe someone else by knowing their address.
 *
 * @route POST /api/newsletter/unsubscribe
 * @access Public (signed link)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON `{ message }`
 */
const unsubscribe = asyncHandler(async (req, res) => {
  const { error, value } = validateUnsubscribe({
    email: req.body?.email,
    token: req.body?.token,
  });
  if (error) return invalidLink(res);

  const email = String(value.email).toLowerCase().trim();
  if (!verifyUnsubscribeToken(email, value.token)) {
    return invalidLink(res);
  }

  await Subscriber.updateOne({ email }, { $set: { status: 'unsubscribed' } });

  res.status(200).json({ message: 'Unsubscribed' });
});

/**
 * Admin: list newsletter subscribers (paginated).
 *
 * @route GET /api/newsletter/admin
 * @access Private (content:read)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON `{ data, meta }`
 */
const getAdminSubscribers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, {
    defaultLimit: 50,
  });

  const filter = {};
  if (['pending', 'subscribed', 'unsubscribed'].includes(req.query.status)) {
    filter.status = req.query.status;
  }

  const [data, total] = await Promise.all([
    Subscriber.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Subscriber.countDocuments(filter),
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
  subscribe,
  confirm,
  unsubscribe,
  getAdminSubscribers,
};
