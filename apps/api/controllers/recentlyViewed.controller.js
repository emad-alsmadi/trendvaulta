const asyncHandler = require('express-async-handler');
const {
  RecentlyViewed,
  MAX_RECENTLY_VIEWED,
} = require('../models/RecentlyViewed');
const { Product } = require('../models/Product');

const PRODUCT_POPULATE = {
  path: 'items.product',
  select:
    'title cover price basePrice category brand images stock averageRating reviewCount featured isActive',
  populate: {
    path: 'brand',
    select: 'name slug logo',
  },
};

/**
 * Map a recently-viewed doc to Product[] (newest first), dropping missing refs.
 *
 * @param {import('mongoose').Document | null | undefined} doc
 * @returns {object[]}
 */
function toProductResults(doc) {
  if (!doc?.items?.length) return [];
  return doc.items
    .map((item) => item.product)
    .filter((product) => product && typeof product === 'object');
}

/**
 * Load and populate the authenticated user's recently viewed list.
 *
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function loadResults(userId) {
  const doc = await RecentlyViewed.findOne({ user: userId })
    .populate(PRODUCT_POPULATE)
    .lean();
  return toProductResults(doc);
}

/**
 * Track a product view for the authenticated user (newest first, max 12).
 *
 * @route POST /api/me/recently-viewed
 * @access Private
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON `{ results: Product[] }`
 */
const trackRecentlyViewed = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const productId = req.body?.productId;

  if (!productId || typeof productId !== 'string') {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'productId is required' });
  }

  const product = await Product.findById(productId).select('_id').lean();
  if (!product) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Product not found' });
  }

  let doc = await RecentlyViewed.findOne({ user: userId });
  if (!doc) {
    doc = new RecentlyViewed({ user: userId, items: [] });
  }

  const productKey = String(productId);
  const nextItems = (doc.items || []).filter(
    (item) => String(item.product) !== productKey,
  );
  nextItems.unshift({ product: productId, viewedAt: new Date() });
  doc.items = nextItems.slice(0, MAX_RECENTLY_VIEWED);

  await doc.save();

  const results = await loadResults(userId);
  res.status(200).json({ message: 'Recently viewed updated', results });
});

/**
 * Get the authenticated user's recently viewed products (max 12, newest first).
 *
 * @route GET /api/me/recently-viewed
 * @access Private
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON `{ results: Product[] }`
 */
const getRecentlyViewed = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const results = await loadResults(userId);
  res.status(200).json({ results });
});

module.exports = {
  trackRecentlyViewed,
  getRecentlyViewed,
};
