const asyncHandler = require('express-async-handler');
const StorefrontModule = require('../models/StorefrontModule');
const {
  NotFoundError,
  ConflictError,
  ValidationError,
} = require('../utils/errors');

/**
 * Get all active storefront modules for homepage
 * Public endpoint
 */
const getStorefrontModules = asyncHandler(async (req, res) => {
  const modules = await StorefrontModule.find({ active: true })
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

  res.status(200).json({
    message: 'ok',
    modules,
  });
});

/**
 * Get all modules (admin)
 * Admin endpoint with pagination
 */
const getAllStorefrontModules = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [modules, total] = await Promise.all([
    StorefrontModule.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    StorefrontModule.countDocuments(),
  ]);

  res.status(200).json({
    message: 'ok',
    data: modules,
    meta: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  });
});

/**
 * Get a single module by ID
 * Admin endpoint
 */
const getStorefrontModuleById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const module = await StorefrontModule.findById(id).lean();

  if (!module) {
    throw new NotFoundError('Module');
  }

  res.status(200).json({
    message: 'ok',
    data: module,
  });
});

/**
 * Create a new storefront module
 * Admin endpoint
 */
const createStorefrontModule = asyncHandler(async (req, res) => {
  const {
    key,
    type,
    title,
    active,
    sortOrder,
    config,
    slides,
    trustItems,
    limit,
    items,
  } = req.body;

  if (!key || !type) {
    throw new ValidationError('key and type are required');
  }

  // Check if key already exists
  const existing = await StorefrontModule.findOne({ key });
  if (existing) {
    throw new ConflictError('Module with this key already exists');
  }

  const module = await StorefrontModule.create({
    key,
    type,
    title,
    active: active !== undefined ? active : true,
    sortOrder: sortOrder || 0,
    config: config || {},
    slides: slides || [],
    trustItems: trustItems || [],
    limit: limit || 8,
    items: items || [],
  });

  res.status(201).json({
    message: 'Module created successfully',
    data: module,
  });
});

/**
 * Update a storefront module
 * Admin endpoint
 */
const updateStorefrontModule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    key,
    type,
    title,
    active,
    sortOrder,
    config,
    slides,
    trustItems,
    limit,
    items,
  } = req.body;

  const module = await StorefrontModule.findById(id);
  if (!module) {
    throw new NotFoundError('Module');
  }

  // If changing key, check uniqueness
  if (key && key !== module.key) {
    const existing = await StorefrontModule.findOne({ key });
    if (existing) {
      throw new ConflictError('Module with this key already exists');
    }
    module.key = key;
  }

  if (type !== undefined) module.type = type;
  if (title !== undefined) module.title = title;
  if (active !== undefined) module.active = active;
  if (sortOrder !== undefined) module.sortOrder = sortOrder;
  if (config !== undefined) module.config = config;
  if (slides !== undefined) module.slides = slides;
  if (trustItems !== undefined) module.trustItems = trustItems;
  if (limit !== undefined) module.limit = limit;
  if (items !== undefined) module.items = items;

  await module.save();

  res.status(200).json({
    message: 'Module updated successfully',
    data: module,
  });
});

/**
 * Delete/deactivate a storefront module
 * Admin endpoint - soft delete (deactivate)
 */
const deleteStorefrontModule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const module = await StorefrontModule.findById(id);
  if (!module) {
    throw new NotFoundError('Module');
  }

  // Soft delete - deactivate
  module.active = false;
  await module.save();

  res.status(200).json({
    message: 'Module deactivated successfully',
  });
});

module.exports = {
  getStorefrontModules,
  getAllStorefrontModules,
  getStorefrontModuleById,
  createStorefrontModule,
  updateStorefrontModule,
  deleteStorefrontModule,
};
