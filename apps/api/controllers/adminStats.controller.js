const asyncHandler = require('express-async-handler');
const { User } = require('../models/User');
const { Product, LOW_STOCK_THRESHOLD } = require('../models/Product');
const { Brand } = require('../models/Brand');
const { Order } = require('../models/Order');

const PAID_LIKE_STATUSES = ['paid', 'shipped', 'delivered'];
const STATUS_KEYS = ['pending', 'paid', 'shipped', 'delivered', 'canceled'];

/**
 * Aggregate admin dashboard counts and paid-like revenue.
 *
 * @route GET /api/admin/stats
 * @access Private (orders:read)
 */
const getAdminStats = asyncHandler(async (req, res) => {
  const [users, products, brands, orders, revenueAgg, statusAgg] =
    await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Brand.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([
        {
          $match: {
            $or: [
              { paymentStatus: 'paid' },
              { status: { $in: PAID_LIKE_STATUSES } },
            ],
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalPrice' },
          },
        },
      ]),
      Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

  const paidRevenue = Number(revenueAgg[0]?.total || 0);

  const statusCounts = STATUS_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
  for (const row of statusAgg) {
    if (row?._id && Object.prototype.hasOwnProperty.call(statusCounts, row._id)) {
      statusCounts[row._id] = row.count;
    }
  }

  res.status(200).json({
    message: 'Admin stats fetched successfully',
    data: {
      users,
      products,
      brands,
      orders,
      paidRevenue,
      statusCounts,
    },
  });
});

/** Revenue is only counted for orders that actually took money. */
const PAID_LIKE_MATCH = {
  $or: [{ paymentStatus: 'paid' }, { status: { $in: PAID_LIKE_STATUSES } }],
};

/**
 * Time series and leaderboards for the dashboard charts.
 *
 * Series are zero-filled per day so a chart never draws a line across a gap,
 * and the window is capped at a year to bound the aggregation.
 *
 * @route GET /api/admin/analytics?days=30
 * @access Private (orders:read)
 */
const getAdminAnalytics = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
  const since = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
  since.setUTCHours(0, 0, 0, 0);

  const [seriesAgg, topProducts, topBrands] = await Promise.all([
    Order.aggregate([
      { $match: { ...PAID_LIKE_MATCH, createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' },
          },
          revenue: { $sum: '$totalPrice' },
          orders: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      { $match: { ...PAID_LIKE_MATCH, createdAt: { $gte: since } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          title: { $first: '$items.title' },
          units: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),
    Order.aggregate([
      { $match: { ...PAID_LIKE_MATCH, createdAt: { $gte: since } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
          pipeline: [{ $project: { brand: 1 } }],
        },
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'brands',
          localField: 'product.brand',
          foreignField: '_id',
          as: 'brand',
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      { $unwind: '$brand' },
      {
        $group: {
          _id: '$brand._id',
          name: { $first: '$brand.name' },
          units: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 8 },
    ]),
  ]);

  const byDay = new Map(seriesAgg.map((row) => [row._id, row]));
  const series = [];
  for (let i = 0; i < days; i += 1) {
    const day = new Date(since.getTime() + i * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const row = byDay.get(day);
    series.push({
      date: day,
      revenue: Number(row?.revenue || 0),
      orders: Number(row?.orders || 0),
    });
  }

  res.status(200).json({
    message: 'Admin analytics fetched successfully',
    data: {
      days,
      series,
      topProducts: topProducts.map((p) => ({
        productId: p._id,
        title: p.title,
        units: p.units,
        revenue: Number(p.revenue || 0),
      })),
      topBrands: topBrands.map((b) => ({
        brandId: b._id,
        name: b.name,
        units: b.units,
        revenue: Number(b.revenue || 0),
      })),
    },
  });
});

/**
 * Products at or below the low-stock threshold, lowest first, so an admin can
 * restock without paging through the catalogue. Out-of-stock rows are included
 * (they are the most urgent) and inactive products are excluded.
 *
 * @route GET /api/admin/low-stock?threshold=5&limit=50
 * @access Private (products:read)
 */
const getLowStockProducts = asyncHandler(async (req, res) => {
  const threshold = Math.min(
    1000,
    Math.max(0, parseInt(req.query.threshold, 10) || LOW_STOCK_THRESHOLD),
  );
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));

  const products = await Product.find({
    isActive: true,
    stock: { $lte: threshold },
  })
    .sort({ stock: 1, title: 1 })
    .limit(limit)
    .select('title slug cover price stock sku category subcategory brand')
    .populate('brand', 'name')
    .lean();

  res.status(200).json({
    message: 'Low stock products fetched successfully',
    data: products,
    threshold,
  });
});

module.exports = {
  getAdminStats,
  getAdminAnalytics,
  getLowStockProducts,
};
