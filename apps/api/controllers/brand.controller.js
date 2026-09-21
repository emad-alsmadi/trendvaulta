const asyncHandler = require('express-async-handler');
const {
  Brand,
  validateCreateBrand,
  validateUpdateBrand,
} = require('../models/Brand');
const mongoose = require('mongoose');
const { normalizeSearchTerm } = require('../utils/search');

/**
 * Get all brands with filtering, sorting and pagination.
 *
 * Supported query params:
 * - q: search term in name/description
 * - country: filter by country
 * - page/limit: pagination
 * - sort: comma-separated fields, prefix with '-' for desc
 * - featured: show only featured brands
 * - includeInactive: admin/moderator only — include inactive brands
 *   (optionally narrowed with isActive=true|false)
 *
 * @route GET /api/brands
 * @access Public (staff may pass includeInactive)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON containing data and meta
 */
const getAllBrands = asyncHandler(async (req, res) => {
  const {
    q,
    country,
    page = 1,
    limit = 20,
    sort = 'name',
    featured,
    includeInactive,
    isActive,
  } = req.query;

  const isStaff =
    Array.isArray(req.user?.roles) &&
    req.user.roles.some((r) => r === 'admin' || r === 'moderator');

  const query = {};
  if (isStaff && (includeInactive === 'true' || includeInactive === '1')) {
    if (isActive === 'true' || isActive === 'false') {
      query.isActive = isActive === 'true';
    }
  } else {
    query.isActive = true;
  }
  
  if (country) {
    query.country = country;
  }
  
  if (featured === 'true') {
    query.featured = true;
  }
  
  const searchTerm = normalizeSearchTerm(q);
  if (searchTerm) {
    query.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  const sortObj = {};
  sort.split(',').forEach((field) => {
    const direction = field.startsWith('-') ? -1 : 1;
    const fieldName = field.replace(/^-/, '');
    sortObj[fieldName] = direction;
  });

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  // Featured strip: keep name order unless client passes another sort
  if (Object.keys(sortObj).length === 0) {
    sortObj.name = 1;
  }

  const [brands, total] = await Promise.all([
    Brand.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Brand.countDocuments(query),
  ]);

  const pages = Math.ceil(total / limitNum);

  res.status(200).json({
    data: brands,
    meta: {
      total,
      page: pageNum,
      pages,
      limit: limitNum,
    },
  });
});

/**
 * Get a single brand by id or slug.
 *
 * @route GET /api/brands/:id
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON brand document
 */
const getBrandById = asyncHandler(async (req, res) => {
  const idOrSlug = String(req.params.id || '').trim();
  const brand = await Brand.findOne(
    mongoose.isValidObjectId(idOrSlug)
      ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] }
      : { slug: idOrSlug },
  );

  if (!brand) {
    return res.status(404).json({ message: 'Brand not found' });
  }

  res.status(200).json(brand);
});

/**
 * Create a new brand.
 *
 * @route POST /api/brands
 * @access Private (requires brands:write permission)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON created brand document
 */
const createBrand = asyncHandler(async (req, res) => {
  const error = validateCreateBrand(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const brand = new Brand({
    name: req.body.name,
    slug: req.body.slug,
    description: req.body.description,
    logo: req.body.logo,
    website: req.body.website,
    country: req.body.country,
    isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    featured: req.body.featured || false,
  });

  const result = await brand.save();
  res.status(201).json(result);
});

/**
 * Update a brand by id.
 *
 * @route PUT /api/brands/:id
 * @access Private (requires brands:write permission)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON updated brand document
 */
const updateBrand = asyncHandler(async (req, res) => {
  const error = validateUpdateBrand(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const updateData = {};
  const allowedFields = [
    'name', 'slug', 'description', 'logo', 'website',
    'country', 'isActive', 'featured'
  ];
  
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  const brand = await Brand.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true },
  );

  if (!brand) {
    return res.status(404).json({ message: 'Brand not found' });
  }

  res.status(200).json(brand);
});

/**
 * Delete a brand by id.
 *
 * @route DELETE /api/brands/:id
 * @access Private (requires brands:delete permission)
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON confirmation message
 */
const deleteBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findByIdAndDelete(req.params.id);

  if (!brand) {
    return res.status(404).json({ message: 'Brand not found' });
  }

  res.status(200).json({ message: 'Brand has been deleted' });
});

module.exports = {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
};
