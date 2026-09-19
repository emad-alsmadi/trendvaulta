const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');

/**
 * Get product recommendations based on context
 * Strategy: category co-occurrence (products from same category)
 * 
 * @route GET /api/recommendations
 * @access Public (optional JWT for personalized later)
 */
const getRecommendations = asyncHandler(async (req, res) => {
  const { context = 'home', limit = 8, productId, category } = req.query;

  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 8));
  let products = [];

  if (context === 'product' && productId) {
    // Get products from the same category as the given product
    const product = await Product.findById(productId).select('category').lean();
    if (product && product.category) {
      products = await Product.find({
        _id: { $ne: productId },
        category: product.category,
        active: true,
      })
        .select('id title price imageUrl category badges featured salesCount reviewCount')
        .sort({ salesCount: -1, reviewCount: -1, createdAt: -1 })
        .limit(limitNum)
        .lean();
    }
  } else if (context === 'category' && category) {
    // Get products from the specified category
    products = await Product.find({
      category,
      active: true,
    })
      .select('id title price imageUrl category badges featured salesCount reviewCount')
      .sort({ salesCount: -1, reviewCount: -1, createdAt: -1 })
      .limit(limitNum)
      .lean();
  } else {
    // Home context: get top products across all categories
    products = await Product.find({
      active: true,
    })
      .select('id title price imageUrl category badges featured salesCount reviewCount')
      .sort({ salesCount: -1, reviewCount: -1, createdAt: -1 })
      .limit(limitNum)
      .lean();
  }

  res.status(200).json({
    message: 'ok',
    results: products,
    strategy: 'similar_category',
    context,
  });
});

module.exports = {
  getRecommendations,
};
