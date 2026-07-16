const asyncHandler = require('express-async-handler');
const {
  Template,
  validateCreateTemplate,
  validateUpdateTemplate,
} = require('../models/Template');

/**
 * Get all templates with filtering, sorting and pagination.
 *
 * Supported query params:
 * - q: search term in title/description
 * - minPrice/maxPrice: price range
 * - creator: creator id
 * - page/limit: pagination
 * - sort: comma-separated fields, prefix with '-' for desc
 *
 * @route GET /api/templates
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON containing data and meta
 */
const getAllTemplates = asyncHandler(async (req, res) => {
  const {
    q,
    minPrice,
    maxPrice,
    creator,
    page = 1,
    limit = 3,
    sort = 'createdAt',
  } = req.query;

  const query = {};
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }
  if (creator) {
    query.creator = creator;
  }
  if (q) {
    query.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ];
  }

  const sortObj = {};
  sort.split(',').forEach((field) => {
    const direction = field.startsWith('-') ? -1 : 1;
    const fieldName = field.replace(/^-/, '');
    sortObj[fieldName] = direction;
  });

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const [templates, total] = await Promise.all([
    Template.find(query)
      .populate('creator', ['name', 'country', 'bio'])
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Template.countDocuments(query),
  ]);

  const pages = Math.ceil(total / limitNum);

  res.status(200).json({
    data: templates,
    meta: {
      total,
      page: pageNum,
      pages,
      limit: limitNum,
    },
  });
});

/**
 * Get a single template by id.
 *
 * @route GET /api/templates/:id
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON template document
 */
const getTemplateById = asyncHandler(async (req, res) => {
  const template = await Template.findById(req.params.id).populate('creator', [
    'name',
    'country',
    'bio',
  ]);

  if (!template) {
    return res.status(404).json({ message: 'Template not found' });
  }

  res.status(200).json(template);
});

/**
 * Create a new template.
 *
 * @route POST /api/templates
 * @access Private (requires templates:write permission)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON created template document
 */
const createTemplate = asyncHandler(async (req, res) => {
  const error = validateCreateTemplate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const template = new Template({
    title: req.body.title,
    creator: req.body.creator || '',
    description: req.body.description || '',
    price: req.body.price || 0,
    cover: req.body.cover || '',
  });

  const result = await template.save();
  res.status(201).json(result);
});

/**
 * Update a template by id.
 *
 * @route PUT /api/templates/:id
 * @access Private (requires templates:write permission)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON updated template document
 */
const updateTemplate = asyncHandler(async (req, res) => {
  const error = validateUpdateTemplate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const template = await Template.findByIdAndUpdate(
    req.params.id,
    {
      title: req.body.title,
      creator: req.body.creator,
      description: req.body.description,
      price: req.body.price,
      cover: req.body.cover,
    },
    { new: true },
  );

  if (!template) {
    return res.status(404).json({ message: 'Template not found' });
  }

  res.status(200).json(template);
});

/**
 * Delete a template by id.
 *
 * @route DELETE /api/templates/:id
 * @access Private (requires templates:delete permission)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON confirmation message
 */
const deleteTemplate = asyncHandler(async (req, res) => {
  const template = await Template.findByIdAndDelete(req.params.id);

  if (!template) {
    return res.status(404).json({ message: 'Template not found' });
  }

  res.status(200).json({ message: 'template has been deleted' });
});

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
