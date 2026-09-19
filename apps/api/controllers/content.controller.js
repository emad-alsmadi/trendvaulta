const asyncHandler = require('express-async-handler');
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
    return res.status(400).json({ message: 'type query parameter is required' });
  }

  const validTypes = ['SHIPPING', 'RETURNS', 'PRIVACY', 'TERMS', 'STOREFRONT_TRUST'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
  }

  const content = await Content.findOne({ type, active: true }).lean();

  if (!content) {
    return res.status(404).json({ message: 'Content not found' });
  }

  res.status(200).json({
    message: 'ok',
    data: content,
  });
});

/**
 * Get all content with pagination (admin).
 *
 * @route GET /api/content/admin
 * @access Private (admin)
 */
const getAllContent = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
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
    return res.status(404).json({ message: 'Content not found' });
  }

  res.status(200).json(content);
});

function parseContentBody(body, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || body.type !== undefined) {
    const type = typeof body.type === 'string' ? body.type.trim() : '';
    const validTypes = ['SHIPPING', 'RETURNS', 'PRIVACY', 'TERMS', 'STOREFRONT_TRUST'];
    if (!type) errors.push('type is required');
    else if (!validTypes.includes(type)) errors.push(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    else data.type = type;
  }

  if (!partial || body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) errors.push('title is required');
    else data.title = title;
  }

  if (!partial || body.body !== undefined) {
    const bodyText = typeof body.body === 'string' ? body.body.trim() : '';
    if (!bodyText) errors.push('body is required');
    else data.body = bodyText;
  }

  if (body.active !== undefined) {
    data.active = Boolean(body.active);
  }

  return { data, errors };
}

/**
 * Create new content.
 *
 * @route POST /api/content
 * @access Private (admin)
 */
const createContent = asyncHandler(async (req, res) => {
  const { data, errors } = parseContentBody(req.body, { partial: false });
  if (errors.length) {
    return res.status(400).json({ message: errors[0] });
  }

  // Deactivate any existing active content of the same type
  await Content.updateMany({ type: data.type, active: true }, { active: false });

  const content = new Content({
    type: data.type,
    title: data.title,
    body: data.body,
    active: data.active !== undefined ? data.active : true,
  });

  const result = await content.save();
  res.status(201).json(result);
});

/**
 * Update content by id.
 *
 * @route PUT /api/content/:id
 * @access Private (admin)
 */
const updateContent = asyncHandler(async (req, res) => {
  const { data, errors } = parseContentBody(req.body, { partial: true });
  if (errors.length) {
    return res.status(400).json({ message: errors[0] });
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  // If updating type to a new value, deactivate other active content of that type
  if (data.type) {
    await Content.updateMany(
      { type: data.type, active: true, _id: { $ne: req.params.id } },
      { active: false }
    );
  }

  const content = await Content.findByIdAndUpdate(req.params.id, data, {
    new: true,
  });

  if (!content) {
    return res.status(404).json({ message: 'Content not found' });
  }

  res.status(200).json(content);
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
    return res.status(404).json({ message: 'Content not found' });
  }

  res.status(200).json({ message: 'Content has been deactivated' });
});

module.exports = {
  getContent,
  getAllContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
};
