const asyncHandler = require('express-async-handler');
const { parsePagination } = require('../utils/pagination');
const { Offer } = require('../models/Offer');

/**
 * List merchandising offers / deals for the storefront.
 *
 * Supported query params:
 * - active: when "true", only active non-expired offers
 * - limit: max results (default 12, max 50)
 *
 * @route GET /api/offers
 * @access Public
 */
const getOffers = asyncHandler(async (req, res) => {
  const { active, limit = 12 } = req.query;

  const query = {};

  if (active === 'true') {
    query.active = true;
    query.$or = [{ endsAt: null }, { endsAt: { $gt: new Date() } }];
  } else if (active === 'false') {
    query.active = false;
  }

  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));

  const results = await Offer.find(query)
    .sort({ sortOrder: 1, createdAt: -1 })
    .limit(limitNum)
    .select('title subtitle badge href imageUrl endsAt active sortOrder')
    .lean();

  res.status(200).json({
    message: 'ok',
    results,
  });
});

/**
 * Get all offers with pagination (admin).
 *
 * @route GET /api/offers/admin
 * @access Private (offers:read)
 */
const getAllOffers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const { page: pageNum, limit: limitNum } = parsePagination(
    { page, limit },
    { defaultLimit: 10, maxLimit: 100 },
  );
  const skip = (pageNum - 1) * limitNum;

  const [offers, total] = await Promise.all([
    Offer.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Offer.countDocuments(),
  ]);

  const pages = Math.ceil(total / limitNum) || 1;

  res.status(200).json({
    data: offers,
    meta: {
      total,
      page: pageNum,
      pages,
      limit: limitNum,
    },
  });
});

/**
 * Get a single offer by id.
 *
 * @route GET /api/offers/:id
 * @access Private (offers:read)
 */
const getOfferById = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id);

  if (!offer) {
    return res.status(404).json({ message: 'Offer not found' });
  }

  res.status(200).json(offer);
});

function parseOfferBody(body, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) errors.push('title is required');
    else data.title = title;
  }

  if (!partial || body.href !== undefined) {
    const href = typeof body.href === 'string' ? body.href.trim() : '';
    if (!href) errors.push('href is required');
    else data.href = href;
  }

  if (body.subtitle !== undefined) {
    data.subtitle =
      typeof body.subtitle === 'string' ? body.subtitle.trim() : '';
  }

  if (body.badge !== undefined) {
    data.badge = typeof body.badge === 'string' ? body.badge.trim() : '';
  }

  if (body.imageUrl !== undefined) {
    data.imageUrl =
      typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
  }

  if (body.endsAt !== undefined) {
    if (body.endsAt === null || body.endsAt === '') {
      data.endsAt = null;
    } else {
      const d = new Date(body.endsAt);
      if (Number.isNaN(d.getTime())) errors.push('endsAt must be a valid date');
      else data.endsAt = d;
    }
  }

  if (body.active !== undefined) {
    data.active = Boolean(body.active);
  }

  if (body.sortOrder !== undefined) {
    const n = Number(body.sortOrder);
    if (Number.isNaN(n)) errors.push('sortOrder must be a number');
    else data.sortOrder = n;
  }

  return { data, errors };
}

/**
 * Create a new offer.
 *
 * @route POST /api/offers
 * @access Private (offers:write)
 */
const createOffer = asyncHandler(async (req, res) => {
  const { data, errors } = parseOfferBody(req.body, { partial: false });
  if (errors.length) {
    return res.status(400).json({ message: errors[0] });
  }

  const offer = new Offer({
    title: data.title,
    href: data.href,
    subtitle: data.subtitle ?? '',
    badge: data.badge ?? '',
    imageUrl: data.imageUrl ?? '',
    endsAt: data.endsAt !== undefined ? data.endsAt : null,
    active: data.active !== undefined ? data.active : true,
    sortOrder: data.sortOrder !== undefined ? data.sortOrder : 0,
  });

  const result = await offer.save();
  res.status(201).json(result);
});

/**
 * Update an offer by id.
 *
 * @route PUT /api/offers/:id
 * @access Private (offers:write)
 */
const updateOffer = asyncHandler(async (req, res) => {
  const { data, errors } = parseOfferBody(req.body, { partial: true });
  if (errors.length) {
    return res.status(400).json({ message: errors[0] });
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  const offer = await Offer.findByIdAndUpdate(req.params.id, data, {
    new: true,
  });

  if (!offer) {
    return res.status(404).json({ message: 'Offer not found' });
  }

  res.status(200).json(offer);
});

/**
 * Deactivate an offer by id.
 *
 * @route DELETE /api/offers/:id
 * @access Private (offers:delete)
 */
const deleteOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findByIdAndUpdate(
    req.params.id,
    { active: false },
    { new: true },
  );

  if (!offer) {
    return res.status(404).json({ message: 'Offer not found' });
  }

  res.status(200).json({ message: 'Offer has been deactivated' });
});

module.exports = {
  getOffers,
  getAllOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
};
