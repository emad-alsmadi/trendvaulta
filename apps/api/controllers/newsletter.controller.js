const asyncHandler = require('express-async-handler');
const {
  Subscriber,
  validateSubscribe,
  validateUnsubscribe,
} = require('../models/Subscriber');
const { parsePagination } = require('../utils/pagination');

/**
 * Subscribe an email to the newsletter.
 *
 * Responds 200 with the same generic body whether the address was new,
 * already subscribed, or resurrected from `unsubscribed`. Varying the
 * response would turn this public endpoint into a subscriber-list oracle.
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
    return res.status(400).json({ message: error.details[0].message });
  }

  const email = String(value.email).toLowerCase().trim();
  const source = value.source || 'footer';

  // Upsert: creates on first signup, and re-subscribes a previously
  // unsubscribed address without duplicating the row.
  await Subscriber.findOneAndUpdate(
    { email },
    {
      $set: { status: 'subscribed' },
      $setOnInsert: { email, source },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.status(200).json({ message: 'Subscribed' });
});

/**
 * Unsubscribe an email from the newsletter.
 *
 * Always 200 with a generic message, even for an address that was never
 * subscribed — same non-enumeration reasoning as `subscribe`.
 *
 * @route POST /api/newsletter/unsubscribe
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON `{ message }`
 */
const unsubscribe = asyncHandler(async (req, res) => {
  const { error, value } = validateUnsubscribe({ email: req.body?.email });

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const email = String(value.email).toLowerCase().trim();

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
  if (req.query.status === 'subscribed' || req.query.status === 'unsubscribed') {
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
  unsubscribe,
  getAdminSubscribers,
};
