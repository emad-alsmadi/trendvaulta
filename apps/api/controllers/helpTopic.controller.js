const asyncHandler = require('express-async-handler');
const { HelpTopic } = require('../models/HelpTopic');

/**
 * List help topics for the storefront.
 *
 * Supported query params:
 * - active: when "true", only active topics
 *
 * @route GET /api/storefront/help
 * @access Public
 */
const getHelpTopics = asyncHandler(async (req, res) => {
  const { active } = req.query;

  const query = {};

  if (active === 'true') {
    query.active = true;
  } else if (active === 'false') {
    query.active = false;
  }

  const results = await HelpTopic.find(query)
    .sort({ sortOrder: 1, createdAt: -1 })
    .select('id title description href icon active sortOrder')
    .lean();

  res.status(200).json({
    message: 'ok',
    topics: results,
  });
});

/**
 * Get all help topics with pagination (admin).
 *
 * @route GET /api/help-topics/admin
 * @access Private (admin)
 */
const getAllHelpTopics = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const [topics, total] = await Promise.all([
    HelpTopic.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    HelpTopic.countDocuments(),
  ]);

  const pages = Math.ceil(total / limitNum) || 1;

  res.status(200).json({
    data: topics,
    meta: {
      total,
      page: pageNum,
      pages,
      limit: limitNum,
    },
  });
});

/**
 * Get a single help topic by id.
 *
 * @route GET /api/help-topics/:id
 * @access Private (admin)
 */
const getHelpTopicById = asyncHandler(async (req, res) => {
  const topic = await HelpTopic.findById(req.params.id);

  if (!topic) {
    return res.status(404).json({ message: 'Help topic not found' });
  }

  res.status(200).json(topic);
});

function parseHelpTopicBody(body, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || body.id !== undefined) {
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) errors.push('id is required');
    else data.id = id;
  }

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

  if (body.description !== undefined) {
    data.description =
      typeof body.description === 'string' ? body.description.trim() : '';
  }

  if (body.icon !== undefined) {
    data.icon = typeof body.icon === 'string' ? body.icon.trim() : '';
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
 * Create a new help topic.
 *
 * @route POST /api/help-topics
 * @access Private (admin)
 */
const createHelpTopic = asyncHandler(async (req, res) => {
  const { data, errors } = parseHelpTopicBody(req.body, { partial: false });
  if (errors.length) {
    return res.status(400).json({ message: errors[0] });
  }

  const topic = new HelpTopic({
    id: data.id,
    title: data.title,
    href: data.href,
    description: data.description ?? '',
    icon: data.icon ?? '',
    active: data.active !== undefined ? data.active : true,
    sortOrder: data.sortOrder !== undefined ? data.sortOrder : 0,
  });

  const result = await topic.save();
  res.status(201).json(result);
});

/**
 * Update a help topic by id.
 *
 * @route PUT /api/help-topics/:id
 * @access Private (admin)
 */
const updateHelpTopic = asyncHandler(async (req, res) => {
  const { data, errors } = parseHelpTopicBody(req.body, { partial: true });
  if (errors.length) {
    return res.status(400).json({ message: errors[0] });
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  const topic = await HelpTopic.findByIdAndUpdate(req.params.id, data, {
    new: true,
  });

  if (!topic) {
    return res.status(404).json({ message: 'Help topic not found' });
  }

  res.status(200).json(topic);
});

/**
 * Deactivate a help topic by id.
 *
 * @route DELETE /api/help-topics/:id
 * @access Private (admin)
 */
const deleteHelpTopic = asyncHandler(async (req, res) => {
  const topic = await HelpTopic.findByIdAndUpdate(
    req.params.id,
    { active: false },
    { new: true },
  );

  if (!topic) {
    return res.status(404).json({ message: 'Help topic not found' });
  }

  res.status(200).json({ message: 'Help topic has been deactivated' });
});

module.exports = {
  getHelpTopics,
  getAllHelpTopics,
  getHelpTopicById,
  createHelpTopic,
  updateHelpTopic,
  deleteHelpTopic,
};
