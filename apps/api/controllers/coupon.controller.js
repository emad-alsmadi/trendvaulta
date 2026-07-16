const asyncHandler = require('express-async-handler');
const {
  Coupon,
  validateCreateCoupon,
  validateUpdateCoupon,
  validateCouponCode,
} = require('../models/Coupon');

/**
 * Get all coupons with pagination.
 *
 * @route GET /api/coupons
 * @access Private (admin only)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON containing data and meta
 */
const getAllCoupons = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const [coupons, total] = await Promise.all([
    Coupon.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Coupon.countDocuments(),
  ]);

  const pages = Math.ceil(total / limitNum);

  res.status(200).json({
    data: coupons,
    meta: {
      total,
      page: pageNum,
      pages,
      limit: limitNum,
    },
  });
});

/**
 * Get a single coupon by id.
 *
 * @route GET /api/coupons/:id
 * @access Private (admin only)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON coupon document
 */
const getCouponById = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    return res.status(404).json({ message: 'Coupon not found' });
  }

  res.status(200).json(coupon);
});

/**
 * Get a coupon by code.
 *
 * @route GET /api/coupons/code/:code
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON coupon document
 */
const getCouponByCode = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });

  if (!coupon) {
    return res.status(404).json({ message: 'Coupon not found' });
  }

  res.status(200).json(coupon);
});

/**
 * Create a new coupon.
 *
 * @route POST /api/coupons
 * @access Private (admin only)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON created coupon document
 */
const createCoupon = asyncHandler(async (req, res) => {
  const error = validateCreateCoupon(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  // Check if coupon code already exists
  const existingCoupon = await Coupon.findOne({
    code: req.body.code.toUpperCase(),
  });
  if (existingCoupon) {
    return res.status(400).json({ message: 'Coupon code already exists' });
  }

  const coupon = new Coupon({
    code: req.body.code.toUpperCase(),
    discountType: req.body.discountType,
    discountValue: req.body.discountValue,
    expirationDate: req.body.expirationDate,
    usageLimit: req.body.usageLimit,
    minimumOrderAmount: req.body.minimumOrderAmount || 0,
    isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    description: req.body.description,
  });

  const result = await coupon.save();
  res.status(201).json(result);
});

/**
 * Update a coupon by id.
 *
 * @route PUT /api/coupons/:id
 * @access Private (admin only)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON updated coupon document
 */
const updateCoupon = asyncHandler(async (req, res) => {
  const error = validateUpdateCoupon(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  // If updating code, check if it already exists
  if (req.body.code) {
    const existingCoupon = await Coupon.findOne({
      code: req.body.code.toUpperCase(),
      _id: { $ne: req.params.id },
    });
    if (existingCoupon) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }
  }

  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    {
      ...(req.body.code && { code: req.body.code.toUpperCase() }),
      ...(req.body.discountType && { discountType: req.body.discountType }),
      ...(req.body.discountValue !== undefined && {
        discountValue: req.body.discountValue,
      }),
      ...(req.body.expirationDate && { expirationDate: req.body.expirationDate }),
      ...(req.body.usageLimit !== undefined && {
        usageLimit: req.body.usageLimit,
      }),
      ...(req.body.minimumOrderAmount !== undefined && {
        minimumOrderAmount: req.body.minimumOrderAmount,
      }),
      ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
      ...(req.body.description !== undefined && {
        description: req.body.description,
      }),
    },
    { new: true },
  );

  if (!coupon) {
    return res.status(404).json({ message: 'Coupon not found' });
  }

  res.status(200).json(coupon);
});

/**
 * Delete/deactivate a coupon by id.
 *
 * @route DELETE /api/coupons/:id
 * @access Private (admin only)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON confirmation message
 */
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true },
  );

  if (!coupon) {
    return res.status(404).json({ message: 'Coupon not found' });
  }

  res.status(200).json({ message: 'Coupon has been deactivated' });
});

/**
 * Validate a coupon code for a given order amount.
 *
 * @route POST /api/coupons/validate
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON validation result with discount details
 */
const validateCoupon = asyncHandler(async (req, res) => {
  const error = validateCouponCode(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { code, orderAmount } = req.body;

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });

  if (!coupon) {
    return res.status(404).json({
      valid: false,
      message: 'Invalid coupon code',
    });
  }

  // Check if coupon is active
  if (!coupon.isActive) {
    return res.status(400).json({
      valid: false,
      message: 'Coupon is inactive',
    });
  }

  // Check if coupon is expired
  if (new Date(coupon.expirationDate) < new Date()) {
    return res.status(400).json({
      valid: false,
      message: 'Coupon has expired',
    });
  }

  // Check if usage limit has been reached
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return res.status(400).json({
      valid: false,
      message: 'Coupon usage limit has been reached',
    });
  }

  // Check minimum order amount
  if (orderAmount < coupon.minimumOrderAmount) {
    return res.status(400).json({
      valid: false,
      message: `Minimum order amount of $${coupon.minimumOrderAmount} required`,
    });
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (orderAmount * coupon.discountValue) / 100;
  } else {
    discountAmount = coupon.discountValue;
  }

  // Ensure discount doesn't exceed order amount
  discountAmount = Math.min(discountAmount, orderAmount);

  res.status(200).json({
    valid: true,
    coupon: {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      expirationDate: coupon.expirationDate,
    },
  });
});

/**
 * Increment coupon usage count.
 *
 * @route POST /api/coupons/:id/use
 * @access Private
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON updated coupon document
 */
const incrementCouponUsage = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    { $inc: { usedCount: 1 } },
    { new: true },
  );

  if (!coupon) {
    return res.status(404).json({ message: 'Coupon not found' });
  }

  res.status(200).json(coupon);
});

module.exports = {
  getAllCoupons,
  getCouponById,
  getCouponByCode,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  incrementCouponUsage,
};
