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
    .select(
      'title subtitle badge href imageUrl translations endsAt active sortOrder',
    )
    .lean();

  res.status(200).json({ data: results });
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
    return res
      .status(404)
      .json({ code: 'NOT_FOUND', message: 'Offer not found' });
  }

  res.status(200).json({ data: offer });
});

/**
 * Create a new offer.
 * Body is Joi-validated at the route (validators/offer.validator.js).
 *
 * @route POST /api/offers
 * @access Private (offers:write)
 */
const createOffer = asyncHandler(async (req, res) => {
  const offer = new Offer(req.body);

  const result = await offer.save();
  res.status(201).json({ data: result });
});

/**
 * Update an offer by id.
 *
 * @route PUT /api/offers/:id
 * @access Private (offers:write)
 */
const updateOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!offer) {
    return res
      .status(404)
      .json({ code: 'NOT_FOUND', message: 'Offer not found' });
  }

  res.status(200).json({ data: offer });
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
    return res
      .status(404)
      .json({ code: 'NOT_FOUND', message: 'Offer not found' });
  }

  res.status(200).json({ message: 'Offer has been deactivated', data: offer });
});

module.exports = {
  getOffers,
  getAllOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
};
