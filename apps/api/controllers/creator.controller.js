const asyncHandler = require('express-async-handler');
const {
  Creator,
  validateCreateCreator,
  validateUpdateCreator,
} = require('../models/Creator');

/**
 * Get all creators with pagination.
 *
 * Supported query params:
 * - page/limit: pagination
 *
 * @route GET /api/creators
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON containing data and meta
 */
const getAllCreators = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const [creators, total] = await Promise.all([
    Creator.find().sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Creator.countDocuments(),
  ]);

  const pages = Math.ceil(total / limitNum);

  res.status(200).json({
    data: creators,
    meta: {
      total,
      page: pageNum,
      pages,
      limit: limitNum,
    },
  });
});

/**
 * Get a single creator by id.
 *
 * @route GET /api/creators/:id
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON creator document
 */
const getCreatorById = asyncHandler(async (req, res) => {
  const creator = await Creator.findById(req.params.id);
  if (!creator) {
    return res.status(404).json({ message: 'Creator not found' });
  }
  res.status(200).json(creator);
});

/**
 * Create a new creator.
 *
 * @route POST /api/creators
 * @access Private (requires creators:write permission)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON created creator document
 */
const createCreator = asyncHandler(async (req, res) => {
  const error = validateCreateCreator(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const creator = new Creator({
    name: req.body.name,
    country: req.body.country || '',
    bio: req.body.bio || '',
    roles: req.body.roles || ['user'],
  });

  const result = await creator.save();
  res.status(201).json(result);
});

/**
 * Update a creator by id.
 *
 * @route PUT /api/creators/:id
 * @access Private (requires creators:write permission)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON updated creator document
 */
const updateCreator = asyncHandler(async (req, res) => {
  const error = validateUpdateCreator(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const creator = await Creator.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        name: req.body.name,
        country: req.body.country,
        bio: req.body.bio,
        roles: req.body.roles,
      },
    },
    { new: true },
  );

  if (!creator) {
    return res.status(404).json({ message: 'Creator not found' });
  }

  res.status(200).json(creator);
});

/**
 * Delete a creator by id.
 *
 * @route DELETE /api/creators/:id
 * @access Private (requires creators:delete permission)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON confirmation message
 */
const deleteCreator = asyncHandler(async (req, res) => {
  const creator = await Creator.findByIdAndDelete(req.params.id);

  if (!creator) {
    return res.status(404).json({ message: 'Creator not found' });
  }

  res.status(200).json({ message: 'creator has been deleted' });
});

module.exports = {
  getAllCreators,
  getCreatorById,
  createCreator,
  updateCreator,
  deleteCreator,
};
