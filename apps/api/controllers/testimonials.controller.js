const asyncHandler = require('express-async-handler');
const Testimonial = require('../models/Testimonial');
const { NotFoundError, ValidationError } = require('../utils/errors');

/**
 * Get all active testimonials for storefront
 * Public endpoint
 */
const getTestimonials = asyncHandler(async (req, res) => {
  const { active } = req.query;
  const query = {};
  if (active === 'true') query.active = true;
  else if (active === 'false') query.active = false;

  const testimonials = await Testimonial.find(query)
    .sort({ sortOrder: 1, createdAt: -1 })
    .select('-_id id name role quote rating active sortOrder')
    .lean();

  res.status(200).json({
    message: 'ok',
    results: testimonials,
  });
});

/**
 * Get all testimonials (admin)
 * Admin endpoint with pagination
 */
const getAllTestimonials = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [testimonials, total] = await Promise.all([
    Testimonial.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Testimonial.countDocuments(),
  ]);

  res.status(200).json({
    message: 'ok',
    data: testimonials,
    meta: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  });
});

/**
 * Get a single testimonial by ID
 * Admin endpoint
 */
const getTestimonialById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const testimonial = await Testimonial.findById(id).lean();

  if (!testimonial) {
    return res.status(404).json({ message: 'Testimonial not found' });
  }

  res.status(200).json({
    message: 'ok',
    data: testimonial,
  });
});

/**
 * Create a new testimonial
 * Admin endpoint
 */
const createTestimonial = asyncHandler(async (req, res) => {
  const { id, name, role, quote, rating, active, sortOrder } = req.body;

  if (!id || !name || !quote) {
    return res
      .status(400)
      .json({ message: 'id, name, and quote are required' });
  }

  const testimonial = await Testimonial.create({
    id,
    name,
    role,
    quote,
    rating: rating || 5,
    active: active !== undefined ? active : true,
    sortOrder: sortOrder || 0,
  });

  res.status(201).json({
    message: 'Testimonial created successfully',
    data: testimonial,
  });
});

/**
 * Update a testimonial
 * Admin endpoint
 */
const updateTestimonial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, role, quote, rating, active, sortOrder } = req.body;

  const testimonial = await Testimonial.findById(id);
  if (!testimonial) {
    return res.status(404).json({ message: 'Testimonial not found' });
  }

  if (name !== undefined) testimonial.name = name;
  if (role !== undefined) testimonial.role = role;
  if (quote !== undefined) testimonial.quote = quote;
  if (rating !== undefined) testimonial.rating = rating;
  if (active !== undefined) testimonial.active = active;
  if (sortOrder !== undefined) testimonial.sortOrder = sortOrder;

  await testimonial.save();

  res.status(200).json({
    message: 'Testimonial updated successfully',
    data: testimonial,
  });
});

/**
 * Delete/deactivate a testimonial
 * Admin endpoint - soft delete (deactivate)
 */
const deleteTestimonial = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const testimonial = await Testimonial.findById(id);
  if (!testimonial) {
    return res.status(404).json({ message: 'Testimonial not found' });
  }

  // Soft delete - deactivate
  testimonial.active = false;
  await testimonial.save();

  res.status(200).json({
    message: 'Testimonial deactivated successfully',
  });
});

module.exports = {
  getTestimonials,
  getAllTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
};
