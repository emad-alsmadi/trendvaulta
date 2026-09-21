const asyncHandler = require('express-async-handler');
const { parsePagination } = require('../utils/pagination');
const Lookbook = require('../models/Lookbook');

/**
 * Get all active lookbooks for storefront
 * Public endpoint
 */
const getLookbooks = asyncHandler(async (req, res) => {
  const { active } = req.query;
  const query = {};
  if (active === 'true') query.active = true;
  else if (active === 'false') query.active = false;

  const lookbooks = await Lookbook.find(query)
    .sort({ sortOrder: 1, createdAt: -1 })
    .select(
      '-_id id eyebrow title body ctaLabel ctaHref imageUrl tone active sortOrder',
    )
    .lean();

  res.status(200).json({
    message: 'ok',
    results: lookbooks,
  });
});

/**
 * Get all lookbooks (admin)
 * Admin endpoint with pagination
 */
const getAllLookbooks = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;

  const { page: pageNum, limit: limitNum } = parsePagination(
    { page, limit },
    { defaultLimit: 50, maxLimit: 100 },
  );
  const skip = (pageNum - 1) * limitNum;

  const [lookbooks, total] = await Promise.all([
    Lookbook.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Lookbook.countDocuments(),
  ]);

  res.status(200).json({
    message: 'ok',
    data: lookbooks,
    meta: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  });
});

/**
 * Get a single lookbook by ID
 * Admin endpoint
 */
const getLookbookById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lookbook = await Lookbook.findById(id).lean();

  if (!lookbook) {
    return res.status(404).json({ message: 'Lookbook not found' });
  }

  res.status(200).json({
    message: 'ok',
    data: lookbook,
  });
});

/**
 * Create a new lookbook
 * Admin endpoint
 */
const createLookbook = asyncHandler(async (req, res) => {
  const {
    id,
    eyebrow,
    title,
    body,
    ctaLabel,
    ctaHref,
    imageUrl,
    tone,
    active,
    sortOrder,
  } = req.body;

  if (!id || !title || !body || !ctaHref || !imageUrl) {
    return res
      .status(400)
      .json({ message: 'id, title, body, ctaHref, and imageUrl are required' });
  }

  const lookbook = await Lookbook.create({
    id,
    eyebrow,
    title,
    body,
    ctaLabel,
    ctaHref,
    imageUrl,
    tone: tone || 'stone',
    active: active !== undefined ? active : true,
    sortOrder: sortOrder || 0,
  });

  res.status(201).json({
    message: 'Lookbook created successfully',
    data: lookbook,
  });
});

/**
 * Update a lookbook
 * Admin endpoint
 */
const updateLookbook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    eyebrow,
    title,
    body,
    ctaLabel,
    ctaHref,
    imageUrl,
    tone,
    active,
    sortOrder,
  } = req.body;

  const lookbook = await Lookbook.findById(id);
  if (!lookbook) {
    return res.status(404).json({ message: 'Lookbook not found' });
  }

  if (eyebrow !== undefined) lookbook.eyebrow = eyebrow;
  if (title !== undefined) lookbook.title = title;
  if (body !== undefined) lookbook.body = body;
  if (ctaLabel !== undefined) lookbook.ctaLabel = ctaLabel;
  if (ctaHref !== undefined) lookbook.ctaHref = ctaHref;
  if (imageUrl !== undefined) lookbook.imageUrl = imageUrl;
  if (tone !== undefined) lookbook.tone = tone;
  if (active !== undefined) lookbook.active = active;
  if (sortOrder !== undefined) lookbook.sortOrder = sortOrder;

  await lookbook.save();

  res.status(200).json({
    message: 'Lookbook updated successfully',
    data: lookbook,
  });
});

/**
 * Delete/deactivate a lookbook
 * Admin endpoint - soft delete (deactivate)
 */
const deleteLookbook = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lookbook = await Lookbook.findById(id);
  if (!lookbook) {
    return res.status(404).json({ message: 'Lookbook not found' });
  }

  // Soft delete - deactivate
  lookbook.active = false;
  await lookbook.save();

  res.status(200).json({
    message: 'Lookbook deactivated successfully',
  });
});

module.exports = {
  getLookbooks,
  getAllLookbooks,
  getLookbookById,
  createLookbook,
  updateLookbook,
  deleteLookbook,
};
