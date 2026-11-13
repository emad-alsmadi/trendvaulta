const asyncHandler = require('express-async-handler');
const { validationBody } = require('../utils/errors');
const mongoose = require('mongoose');
const { Order } = require('../models/Order');
const { Product } = require('../models/Product');
const orderRepository = require('../repositories/order.repository');
const {
  validateCreateOrder,
  validateOrderTracking,
  validateOrderStatus,
} = require('../validators/order.validator');
const { serializeOrder, serializeOrders } = require('../utils/serializeOrder');
const {
  buildNormalizedOrderLines,
  computeOrderTotal,
  resolveFulfillment,
  resolveShippingPrice,
  resolveTaxPrice,
  loadValidCouponByCode,
  calculateCouponDiscount,
  checkCouponUsage,
  getStoreSettings,
} = require('../services/commerce.service');
const {
  INVOICEABLE_PAYMENT_STATUSES,
  INVOICE_CSP,
  ensureInvoiceNumber,
  renderInvoiceHtml,
  resolveInvoiceLocale,
} = require('../utils/invoice');
const {
  getUserPermissions,
  hasPermission,
} = require('../middlewares/rolePermissions');
const { isValidGuestToken } = require('../services/guestOrders.service');
const {
  canCustomerCancel,
  getAllowedNextStatuses,
} = require('../utils/orderTransitions');
const { buildSort } = require('../utils/sort');
const { canCustomerReturn } = require('../utils/returns');
const {
  findCustomerOrder,
  returnEligibility,
  buildAdminOrdersQuery,
  updateOrderTrackingInfo,
  transitionOrderStatus,
  cancelCustomerOrder,
} = require('../services/order.service');

/** Columns the admin order table may sort on; all are indexed (models/Order.js). */
const ORDER_SORT_FIELDS = [
  'createdAt',
  'totalPrice',
  'status',
  'paymentStatus',
];

const createOrder = asyncHandler(async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  const allowDirectDev =
    process.env.DEV_ALLOW_DIRECT_ORDERS === 'true' ||
    process.env.ALLOW_DIRECT_ORDERS === 'true';

  if (stripeKey && !allowDirectDev) {
    return res.status(400).json({
      code: 'DIRECT_ORDER_DISABLED',
      message:
        'Direct order creation is disabled when Stripe is configured. Use checkout to pay securely. For local development you may set DEV_ALLOW_DIRECT_ORDERS=true on the backend.',
    });
  }

  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res
      .status(401)
      .json({ code: 'UNAUTHORIZED', message: 'Token is not valid!' });
  }

  const { error, value } = validateCreateOrder(req.body);
  if (error) {
    return res.status(400).json(validationBody(error));
  }

  const { items, shippingAddress, couponCode } = value;
  // Priced AND stored from the same normalised values (pickup = 'none').
  const fulfillment = resolveFulfillment(value);

  const { normalizedItems, itemsPrice } = await buildNormalizedOrderLines(
    Product,
    items,
  );

  let discountAmount = 0;
  let couponId = null;
  let normalizedCouponCode = '';
  if (couponCode) {
    const coupon = await loadValidCouponByCode(couponCode);
    const result = calculateCouponDiscount(coupon, itemsPrice);
    if (!result.valid) {
      return res.status(400).json({
        code: result.code,
        ...(result.params && { params: result.params }),
        message: result.message,
      });
    }
    const usage = await checkCouponUsage(coupon, userId);
    if (!usage.valid) {
      return res.status(400).json({
        code: usage.code,
        ...(usage.params && { params: usage.params }),
        message: usage.message,
      });
    }
    discountAmount = result.discountAmount;
    couponId = coupon._id;
    normalizedCouponCode = coupon.code;
  }

  const shippingPrice = await resolveShippingPrice({
    ...fulfillment,
    itemsPrice,
    country: shippingAddress.country,
    zip: shippingAddress.zip,
    region: shippingAddress.city,
  });
  const taxPrice = await resolveTaxPrice(itemsPrice);
  const totalPrice = computeOrderTotal({
    itemsPrice,
    discountAmount,
    shippingPrice,
    taxPrice,
  });

  const order = await orderRepository.createOrder({
    user: userId,
    items: normalizedItems,
    shippingAddress: {
      ...shippingAddress,
      notes: shippingAddress.notes || '',
    },
    status: 'pending',
    delivery: fulfillment.delivery,
    shippingMethod: fulfillment.shippingMethod,
    itemsPrice,
    shippingPrice,
    taxPrice,
    discountAmount,
    couponCode: normalizedCouponCode,
    couponId,
    totalPrice,
    paymentStatus: 'unpaid',
  });

  res.status(201).json(serializeOrder(order));
});

const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res
      .status(401)
      .json({ code: 'UNAUTHORIZED', message: 'Token is not valid!' });
  }

  const orders = await orderRepository.findCustomerOrders(userId);

  res.status(200).json(serializeOrders(orders));
});

const getOrderById = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res
      .status(401)
      .json({ code: 'UNAUTHORIZED', message: 'Token is not valid!' });
  }

  const isStaff =
    Array.isArray(req.user?.roles) &&
    req.user.roles.some((r) => r === 'admin' || r === 'moderator');

  const query = isStaff
    ? { _id: req.params.id }
    : { _id: req.params.id, user: userId };

  const order = await orderRepository.findOrder(query);
  if (!order) {
    return res
      .status(404)
      .json({ code: 'NOT_FOUND', message: 'Order not found' });
  }

  const serialized = serializeOrder(order);
  res.status(200).json({
    ...serialized,
    allowedNextStatuses: isStaff
      ? getAllowedNextStatuses(serialized.status)
      : undefined,
    // The storefront shows a Cancel button from this, so the rule lives in
    // one place (canCustomerCancel) rather than being re-derived client-side.
    canCancel: canCustomerCancel(order).ok,
    ...returnEligibility(order),
  });
});

/**
 * Admin/moderator: paginated order list.
 * @route GET /api/orders
 * @access Private (orders:read)
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const sort = buildSort(req.query.sort, req.query.order, ORDER_SORT_FIELDS);

  const { query } = await buildAdminOrdersQuery({
    status: req.query.status,
    paymentStatus: req.query.paymentStatus,
    q: req.query.q,
    returnStatus: req.query.returnStatus,
    user: req.query.user,
  });

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const { orders, total } = await orderRepository.findAdminOrders(
    query,
    sort,
    skip,
    limitNum,
  );

  const data = serializeOrders(orders).map((o) => ({
    ...o,
    allowedNextStatuses: getAllowedNextStatuses(o.status),
  }));

  res.status(200).json({
    data,
    meta: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      limit: limitNum,
    },
  });
});

/**
 * Admin: update tracking information for an order.
 * @route PATCH /api/orders/:id/tracking
 * @access Private (orders:write)
 */
const updateOrderTracking = asyncHandler(async (req, res) => {
  const { error, value } = validateOrderTracking(req.body || {});
  if (error) {
    return res.status(400).json(validationBody(error));
  }

  const result = await updateOrderTrackingInfo(req.params.id, value);
  if (!result.ok) {
    return res.status(result.status).json(result.body);
  }

  res.status(200).json({
    message: 'Tracking information updated',
    data: serializeOrder(result.order),
  });
});

/**
 * Admin: transition fulfillment status within the allowed state machine.
 * Does not mark orders paid (Stripe webhook / verify-payment only); the only
 * admin path to 'paid' is resolving a needs_attention order whose payment was
 * already captured.
 *
 * Canceling/refunding a paid order creates a full Stripe refund
 * (AUTO_REFUND_ON_CANCEL, default true) and releases inventory once.
 * @route PATCH /api/orders/:id/status
 * @access Private (orders:write)
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { error, value } = validateOrderStatus(req.body || {});
  if (error) {
    return res.status(400).json(validationBody(error));
  }

  const result = await transitionOrderStatus(req.params.id, value.status);
  if (!result.ok) {
    return res.status(result.status).json(result.body);
  }

  const serialized = serializeOrder(result.order);
  res.status(200).json({
    ...serialized,
    allowedNextStatuses: getAllowedNextStatuses(serialized.status),
    stockRestored:
      result.stockRestoredNow || Boolean(result.order.stockRestored),
    refunded: result.refundedNow || result.order.paymentStatus === 'refunded',
    message: result.message,
  });
});

/**
 * Guest order page: the order behind an emailed (or checkout) link.
 * Returns are not offered to guests: they need a confirmed email (D5),
 * which registering with the same address provides.
 * @route POST /api/orders/guest/lookup
 * @access Public, with { orderId, token }
 */
const getGuestOrder = asyncHandler(async (req, res) => {
  const { orderId, token } = req.body || {};
  const order = mongoose.isValidObjectId(orderId)
    ? await orderRepository.findOrderById(orderId)
    : null;
  if (!isValidGuestToken(order, token)) {
    return res
      .status(404)
      .json({ code: 'NOT_FOUND', message: 'Order not found' });
  }
  res.status(200).json({
    ...serializeOrder(order),
    canCancel: canCustomerCancel(order).ok,
    canReturn: false,
    returnNeedsAccount: canCustomerReturn(order).ok,
  });
});

/**
 * Customer: cancel their own order before it ships.
 * @route POST /api/orders/:id/cancel
 * @access Private (order owner)
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const guestToken = req.body?.guestToken;
  if (!req.user?.id && !guestToken) {
    return res
      .status(401)
      .json({ code: 'UNAUTHORIZED', message: 'Token is not valid!' });
  }

  const result = await cancelCustomerOrder(req.params.id, {
    userId: req.user?.id,
    guestToken,
  });
  if (!result.ok) {
    return res.status(result.status).json(result.body);
  }

  res.status(result.refundPending ? 202 : 200).json({
    ...serializeOrder(result.order),
    canCancel: false,
    refunded: result.refundedNow || result.order.paymentStatus === 'refunded',
    refundPending: result.refundPending,
    message: result.message,
  });
});

/**
 * Printable invoice for a paid (or refunded) order, as a self-contained HTML
 * document. The invoice number is assigned on first need if the paid path
 * didn't already (older orders).
 *
 * Query: `lang` = en | ar.
 * @route GET /api/orders/:id/invoice
 * @access Private (order owner, or staff with orders:read)
 */
const getOrderInvoice = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res
      .status(404)
      .json({ code: 'NOT_FOUND', message: 'Order not found' });
  }
  const guestToken = req.get('x-guest-token');
  if (!req.user?.id && !guestToken) {
    return res
      .status(401)
      .json({ code: 'UNAUTHORIZED', message: 'Token is not valid!' });
  }
  const isStaff = hasPermission(
    getUserPermissions(req.user?.roles),
    'orders:read',
  );
  // Someone else's order is "not found", so ids can't be probed
  const found = isStaff
    ? await orderRepository.findOrderById(req.params.id)
    : await findCustomerOrder(req.user?.id, req.params.id, guestToken);
  const order = found ? found.toObject() : null;
  if (!order) {
    return res
      .status(404)
      .json({ code: 'NOT_FOUND', message: 'Order not found' });
  }

  if (!INVOICEABLE_PAYMENT_STATUSES.includes(order.paymentStatus)) {
    return res.status(409).json({
      code: 'INVOICE_NOT_AVAILABLE',
      message: 'The invoice is available once the order has been paid.',
    });
  }

  const settings = await getStoreSettings();
  order.invoiceNumber = await ensureInvoiceNumber(Order, order._id, {
    prefix: settings?.invoice?.prefix,
  });

  const html = renderInvoiceHtml({
    order,
    settings,
    locale: resolveInvoiceLocale(req.query.lang),
    storefrontUrl:
      process.env.PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL || '',
  });

  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': INVOICE_CSP,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.status(200).send(html);
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getGuestOrder,
  getAllOrders,
  updateOrderStatus,
  updateOrderTracking,
  cancelOrder,
  getOrderInvoice,
};
