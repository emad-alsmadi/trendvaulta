const asyncHandler = require('express-async-handler');
const { parsePagination } = require('../utils/pagination');
const { Content } = require('../models/Content');

/**
 * Get content by type (public).
 *
 * Supported query params:
 * - type: content type (SHIPPING, RETURNS, PRIVACY, TERMS, STOREFRONT_TRUST)
 *
 * @route GET /api/content
 * @access Public
 */
const getContent = asyncHandler(async (req, res) => {
  const { type } = req.query;

  if (!type) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'type query parameter is required',
    });
  }

  const validTypes = [
    'SHIPPING',
    'RETURNS',
    'PRIVACY',
    'TERMS',
    'STOREFRONT_TRUST',
  ];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
    });
  }

  const content = await Content.findOne({ type, active: true }).lean();

  if (!content) {
    return res
      .status(404)
      .json({ code: 'NOT_FOUND', message: 'Content not found' });
  }

  res.status(200).json({ data: content });
});

/**
 * Get all content with pagination (admin).
 *
 * @route GET /api/content/admin
 * @access Private (admin)
 */
const getAllContent = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const { page: pageNum, limit: limitNum } = parsePagination(
    { page, limit },
    { defaultLimit: 10, maxLimit: 100 },
  );
  const skip = (pageNum - 1) * limitNum;

  const [content, total] = await Promise.all([
    Content.find()
      .sort({ type: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Content.countDocuments(),
  ]);

  const pages = Math.ceil(total / limitNum) || 1;

  res.status(200).json({
    data: content,
    meta: {
      total,
      page: pageNum,
      pages,
      limit: limitNum,
    },
  });
});

/**
 * Get a single content by id.
 *
 * @route GET /api/content/:id
 * @access Private (admin)
 */
const getContentById = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id);

  if (!content) {
    return res
      .status(404)
      .json({ code: 'NOT_FOUND', message: 'Content not found' });
  }

  res.status(200).json({ data: content });
});

/**
 * Create new content.
 * Body is Joi-validated at the route (validators/content.validator.js).
 *
 * @route POST /api/content
 * @access Private (admin)
 */
const createContent = asyncHandler(async (req, res) => {
  const content = new Content(req.body);
  // Fail on bad input (e.g. title > 200) before touching the live page.
  await content.validate();

  // Only an active doc replaces the live one; a draft must not unpublish it.
  // The {type, active} partial unique index means the old doc has to be
  // switched off first, so switch it back on if the save still fails.
  let replacedIds = [];
  if (content.active) {
    const live = await Content.find({ type: content.type, active: true })
      .select('_id')
      .lean();
    replacedIds = live.map((doc) => doc._id);
    if (replacedIds.length) {
      await Content.updateMany(
        { _id: { $in: replacedIds } },
        { active: false },
      );
    }
  }

  try {
    const result = await content.save();
    res.status(201).json({ data: result });
  } catch (err) {
    if (replacedIds.length) {
      await Content.updateMany(
        { _id: { $in: replacedIds } },
        { active: true },
      ).catch(() => {});
    }
    throw err;
  }
});

/**
 * Update content by id.
 *
 * @route PUT /api/content/:id
 * @access Private (admin)
 */
const updateContent = asyncHandler(async (req, res) => {
  // If updating type to a new value, deactivate other active content of that type
  if (req.body.type) {
    await Content.updateMany(
      { type: req.body.type, active: true, _id: { $ne: req.params.id } },
      { active: false },
    );
  }

  const content = await Content.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!content) {
    return res
      .status(404)
      .json({ code: 'NOT_FOUND', message: 'Content not found' });
  }

  res.status(200).json({ data: content });
});

/**
 * Deactivate content by id.
 *
 * @route DELETE /api/content/:id
 * @access Private (admin)
 */
const deleteContent = asyncHandler(async (req, res) => {
  const content = await Content.findByIdAndUpdate(
    req.params.id,
    { active: false },
    { new: true },
  );

  if (!content) {
    return res
      .status(404)
      .json({ code: 'NOT_FOUND', message: 'Content not found' });
  }

  res
    .status(200)
    .json({ message: 'Content has been deactivated', data: content });
});

module.exports = {
  getContent,
  getAllContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
};
