const asyncHandler = require('express-async-handler');
const { parsePagination } = require('../utils/pagination');
const { normalizeSearchTerm } = require('../utils/search');
const { buildSort } = require('../utils/sort');

/** Columns the admin bundle table may sort on. */
const BUNDLE_SORT_FIELDS = ['createdAt', 'bundlePrice', 'savings'];
const { Product } = require('../models/Product');
const Bundle = require('../models/Bundle');
const { NotFoundError, ValidationError } = require('../utils/errors');

const BUNDLE_COMPANION_LIMIT = 3;
const BUNDLE_DISCOUNT_RATE = 0.1;

/**
 * Get frequently-bought-together / complete-the-look companions for a product.
 * Uses Bundle model if available, falls back to category-based stub.
 *
 * @route GET /api/products/:id/bundles
 * @access Public
 */
const getProductBundles = asyncHandler(async (req, res) => {
  const primary = await Product.findById(req.params.id);

  if (!primary || primary.isActive === false) {
    return res.status(404).json({ message: 'Product not found' });
  }

  // Try to find a configured bundle for this product
  const bundle = await Bundle.findOne({
    primaryProduct: primary._id,
    active: true,
  })
    .populate({
      path: 'items.product',
      select:
        'title cover price basePrice category brand images stock averageRating reviewCount featured isActive',
      populate: {
        path: 'brand',
        select: 'name slug logo',
      },
    })
    .lean();

  if (bundle && bundle.items && bundle.items.length > 0) {
    // Use configured bundle
    const items = bundle.items
      .filter((item) => item.product && item.product.isActive !== false)
      .map((item) => ({
        ...item.product,
        quantity: item.quantity || 1,
      }));

    return res.status(200).json({
      message: 'ok',
      primaryProductId: String(primary._id),
      items,
      bundlePrice: bundle.bundlePrice,
      savings: bundle.savings,
    });
  }

  // Fallback: category-based stub
  const items = await Product.find({
    _id: { $ne: primary._id },
    category: primary.category,
    isActive: true,
  })
    .populate('brand', ['name', 'slug', 'logo', 'website', 'country'])
    .sort({ featured: -1, averageRating: -1, createdAt: -1 })
    .limit(BUNDLE_COMPANION_LIMIT);

  const total =
    Number(primary.price || 0) +
    items.reduce((sum, p) => sum + Number(p.price || 0), 0);
  const savings =
    items.length > 0 ? Math.round(total * BUNDLE_DISCOUNT_RATE * 100) / 100 : 0;
  const bundlePrice = Math.round((total - savings) * 100) / 100;

  res.status(200).json({
    message: 'ok',
    primaryProductId: String(primary._id),
    items,
    bundlePrice,
    savings,
  });
});

/**
 * Get all bundles (admin)
 * Admin endpoint with pagination.
 *
 * Supports `page`, `limit`, `q` (primary product title), `sort`/`order`.
 */
const getAllBundles = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;

  const { page: pageNum, limit: limitNum } = parsePagination(
    { page, limit },
    { defaultLimit: 50, maxLimit: 100 },
  );
  const skip = (pageNum - 1) * limitNum;
  const sort = buildSort(req.query.sort, req.query.order, BUNDLE_SORT_FIELDS);

  // A bundle has no name of its own — it is known by its primary product — so
  // search resolves matching product titles first, then filters on those ids.
  const query = {};
  const term = normalizeSearchTerm(req.query.q);
  if (term) {
    const products = await Product.find({ title: { $regex: term, $options: 'i' } })
      .select('_id')
      .limit(500)
      .lean();
    query.primaryProduct = { $in: products.map((p) => p._id) };
  }

  const [bundles, total] = await Promise.all([
    Bundle.find(query)
      .populate('primaryProduct', 'title price cover')
      .populate({
        path: 'items.product',
        select: 'title price cover',
      })
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Bundle.countDocuments(query),
  ]);

  res.status(200).json({
    message: 'ok',
    data: bundles,
    meta: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      limit: limitNum,
    },
  });
});

/**
 * Get a single bundle by ID
 * Admin endpoint
 */
const getBundleById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const bundle = await Bundle.findById(id)
    .populate('primaryProduct', 'title price cover')
    .populate({
      path: 'items.product',
      select: 'title price cover',
    })
    .lean();

  if (!bundle) {
    return res.status(404).json({ message: 'Bundle not found' });
  }

  res.status(200).json({
    message: 'ok',
    data: bundle,
  });
});

/**
 * Create a new bundle
 * Admin endpoint
 */
const createBundle = asyncHandler(async (req, res) => {
  const { primaryProduct, items, bundlePrice, savings, active } = req.body;

  if (!primaryProduct || !items || !Array.isArray(items) || items.length < 2) {
    return res
      .status(400)
      .json({ message: 'primaryProduct and at least 2 items are required' });
  }

  if (bundlePrice === undefined || savings === undefined) {
    return res
      .status(400)
      .json({ message: 'bundlePrice and savings are required' });
  }

  // Validate primary product exists
  const primary = await Product.findById(primaryProduct);
  if (!primary) {
    return res.status(404).json({ message: 'Primary product not found' });
  }

  // Validate all items exist
  const productIds = items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });
  if (products.length !== productIds.length) {
    return res.status(400).json({ message: 'One or more products not found' });
  }

  const bundle = await Bundle.create({
    primaryProduct,
    items,
    bundlePrice,
    savings,
    active: active !== undefined ? active : true,
  });

  const populatedBundle = await Bundle.findById(bundle._id)
    .populate('primaryProduct', 'title price cover')
    .populate({
      path: 'items.product',
      select: 'title price cover',
    })
    .lean();

  res.status(201).json({
    message: 'Bundle created successfully',
    data: populatedBundle,
  });
});

/**
 * Update a bundle
 * Admin endpoint
 */
const updateBundle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { primaryProduct, items, bundlePrice, savings, active } = req.body;

  const bundle = await Bundle.findById(id);
  if (!bundle) {
    return res.status(404).json({ message: 'Bundle not found' });
  }

  if (primaryProduct !== undefined) {
    const primary = await Product.findById(primaryProduct);
    if (!primary) {
      return res.status(404).json({ message: 'Primary product not found' });
    }
    bundle.primaryProduct = primaryProduct;
  }

  if (items !== undefined) {
    if (!Array.isArray(items) || items.length < 2) {
      return res
        .status(400)
        .json({ message: 'Bundle must have at least 2 items' });
    }
    const productIds = items.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } });
    if (products.length !== productIds.length) {
      return res
        .status(400)
        .json({ message: 'One or more products not found' });
    }
    bundle.items = items;
  }

  if (bundlePrice !== undefined) bundle.bundlePrice = bundlePrice;
  if (savings !== undefined) bundle.savings = savings;
  if (active !== undefined) bundle.active = active;

  await bundle.save();

  const populatedBundle = await Bundle.findById(bundle._id)
    .populate('primaryProduct', 'title price cover')
    .populate({
      path: 'items.product',
      select: 'title price cover',
    })
    .lean();

  res.status(200).json({
    message: 'Bundle updated successfully',
    data: populatedBundle,
  });
});

/**
 * Delete/deactivate a bundle
 * Admin endpoint - soft delete (deactivate)
 */
const deleteBundle = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const bundle = await Bundle.findById(id);
  if (!bundle) {
    return res.status(404).json({ message: 'Bundle not found' });
  }

  // Soft delete - deactivate
  bundle.active = false;
  await bundle.save();

  res.status(200).json({
    message: 'Bundle deactivated successfully',
  });
});

module.exports = {
  getProductBundles,
  getAllBundles,
  getBundleById,
  createBundle,
  updateBundle,
  deleteBundle,
};
