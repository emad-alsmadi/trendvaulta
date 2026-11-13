const asyncHandler = require('express-async-handler');
const { parsePagination } = require('../utils/pagination');
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
    .select('id title description href icon translations active sortOrder')
    .lean();

  res.status(200).json({ data: results });
});

/**
 * Get all help topics with pagination (admin).
 *
 * @route GET /api/help-topics/admin
 * @access Private (admin)
 */
const getAllHelpTopics = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const { page: pageNum, limit: limitNum } = parsePagination(
    { page, limit },
    { defaultLimit: 10, maxLimit: 100 },
  );
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
    return res
      .status(404)
      .json({ code: 'NOT_FOUND', message: 'Help topic not found' });
  }

  res.status(200).json({ data: topic });
});

/**
 * Create a new help topic.
 * Body is Joi-validated at the route (validators/helpTopic.validator.js).
 *
 * @route POST /api/help-topics
 * @access Private (admin)
 */
const createHelpTopic = asyncHandler(async (req, res) => {
  const topic = new HelpTopic(req.body);

  const result = await topic.save();
  res.status(201).json({ data: result });
});

/**
 * Update a help topic by id.
 *
 * @route PUT /api/help-topics/:id
 * @access Private (admin)
 */
const updateHelpTopic = asyncHandler(async (req, res) => {
  const topic = await HelpTopic.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!topic) {
    return res
      .status(404)
      .json({ code: 'NOT_FOUND', message: 'Help topic not found' });
  }

  res.status(200).json({ data: topic });
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
    return res
      .status(404)
      .json({ code: 'NOT_FOUND', message: 'Help topic not found' });
  }

  res
    .status(200)
    .json({ message: 'Help topic has been deactivated', data: topic });
});

module.exports = {
  getHelpTopics,
  getAllHelpTopics,
  getHelpTopicById,
  createHelpTopic,
  updateHelpTopic,
  deleteHelpTopic,
};
