const asyncHandler = require('express-async-handler');
const { Wishlist } = require('../models/Wishlist');
const { Product } = require('../models/Product');

/**
 * Add a product to the authenticated user's wishlist.
 *
 * @route POST /api/wishlist/:productId
 * @access Private
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON confirmation message
 */
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  // Verify product exists
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Product not found' });
  }

  // Check if already in wishlist (duplicate prevention)
  const existingWishlist = await Wishlist.findOne({
    user: userId,
    product: productId,
  });

  if (existingWishlist) {
    return res.status(400).json({ code: 'WISHLIST_DUPLICATE', message: 'Product already in wishlist' });
  }

  // Create wishlist item
  const wishlist = new Wishlist({
    user: userId,
    product: productId,
  });

  await wishlist.save();

  res.status(201).json({ message: 'Product added to wishlist' });
});

/**
 * Remove a product from the authenticated user's wishlist.
 *
 * @route DELETE /api/wishlist/:productId
 * @access Private
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON confirmation message
 */
const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  // Find and delete wishlist item
  const wishlist = await Wishlist.findOneAndDelete({
    user: userId,
    product: productId,
  });

  if (!wishlist) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Wishlist item not found' });
  }

  res.status(200).json({ message: 'Product removed from wishlist' });
});

/**
 * Get the authenticated user's wishlist.
 *
 * @route GET /api/wishlist/my
 * @access Private
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON array of wishlist items with populated product data
 */
const getMyWishlist = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const wishlist = await Wishlist.find({ user: userId })
    .populate({
      path: 'product',
      // Deleted products are deactivated (not removed): keep them out of the
      // list rather than linking shoppers to a page they can't buy from.
      match: { isActive: { $ne: false } },
      // The card shows "by <brand>" — populate the name, not just the id.
      populate: { path: 'brand', select: 'name slug' },
    })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(wishlist.filter((item) => item.product));
});

/**
 * Check if a product is in the authenticated user's wishlist.
 *
 * @route GET /api/wishlist/check/:productId
 * @access Private
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON with isWishlisted boolean
 */
const checkWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  const wishlist = await Wishlist.findOne({
    user: userId,
    product: productId,
  });

  res.status(200).json({ isWishlisted: !!wishlist });
});

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getMyWishlist,
  checkWishlist,
};
