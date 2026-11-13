/**
 * Order repository — isolates MongoDB data access for orders.
 *
 * Complex fulfillment transitions, stock restore/restock, and Stripe refund
 * coordination live in order.service.js (domain logic, testable without
 * HTTP). This layer owns only the straightforward CRUD queries that the
 * controller currently calls directly.
 */
const { Order } = require('../models/Order');

/**
 * Create an order document.
 * @param {object} data
 * @returns {Promise<import('mongoose').Document>}
 */
async function createOrder(data) {
  return Order.create(data);
}

/**
 * Find a customer's orders, newest first, lean.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function findCustomerOrders(userId) {
  return Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Find a single order by a customer-scoped query (owner or staff).
 * @param {object} query
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function findOrder(query) {
  return Order.findOne(query).lean();
}

/**
 * Admin order list: paginated with user populated, sorted, lean.
 * @param {object} query
 * @param {object} sort
 * @param {number} skip
 * @param {number} limit
 * @returns {Promise<{ orders: Array, total: number }>}
 */
async function findAdminOrders(query, sort, skip, limit) {
  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate('user', 'username email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(query),
  ]);
  return { orders, total };
}

/**
 * Find an order by id (staff/guest paths).
 * @param {string} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function findOrderById(id) {
  return Order.findById(id);
}

/**
 * Update tracking fields / claim state transitions on an order by id.
 * @param {string} id
 * @param {object} update
 * @param {object} [options]
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function updateOrder(id, update, options = {}) {
  return Order.findOneAndUpdate(id, update, { new: true, ...options });
}

/**
 * Mark an order's stock as decremented (prevents double decrement).
 * @param {string} id
 * @returns {Promise<void>}
 */
async function markStockDecremented(id) {
  await Order.updateOne({ _id: id }, { $set: { stockDecremented: true } });
}

module.exports = {
  createOrder,
  findCustomerOrders,
  findOrder,
  findAdminOrders,
  findOrderById,
  updateOrder,
  markStockDecremented,
};
