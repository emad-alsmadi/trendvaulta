const asyncHandler = require('express-async-handler');
const Joi = require('joi');
const { Order, validateCreateOrder } = require('../models/Order');
const { Product } = require('../models/Product');
const { serializeOrder, serializeOrders } = require('../utils/serializeOrder');
const {
  buildNormalizedOrderLines,
  resolveShippingPrice,
  resolveTaxPrice,
  loadValidCouponByCode,
  calculateCouponDiscount,
  decrementStockForPaidOrder,
  restoreStockOnce,
} = require('../utils/commerce');
const {
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCanceledEmail,
  sendOrderRefundedEmail,
} = require('../utils/mail');
const {
  getStripeOrThrow,
  refundPaymentIntent,
} = require('../services/stripe.service');
const {
  ORDER_STATUSES,
  canTransitionOrderStatus,
  getAllowedNextStatuses,
} = require('../utils/orderTransitions');

const createOrder = asyncHandler(async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  const allowDirectDev =
    process.env.DEV_ALLOW_DIRECT_ORDERS === 'true' ||
    process.env.ALLOW_DIRECT_ORDERS === 'true';

  if (stripeKey && !allowDirectDev) {
    return res.status(400).json({
      message:
        'Direct order creation is disabled when Stripe is configured. Use checkout to pay securely. For local development you may set DEV_ALLOW_DIRECT_ORDERS=true on the backend.',
    });
  }

  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Token is not valid!' });
  }

  const { error, value } = validateCreateOrder(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { items, shippingAddress, couponCode, delivery, shippingMethod } =
    value;

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
      return res.status(400).json({ message: result.message });
    }
    discountAmount = result.discountAmount;
    couponId = coupon._id;
    normalizedCouponCode = coupon.code;
  }

  const shippingPrice = await resolveShippingPrice({
    delivery,
    shippingMethod,
    itemsPrice,
    country: shippingAddress.country,
    zip: shippingAddress.zip,
    region: shippingAddress.city,
  });
  const taxPrice = await resolveTaxPrice(itemsPrice);
  const totalPrice = Math.max(
    0,
    itemsPrice - discountAmount + shippingPrice + taxPrice,
  );

  const order = await Order.create({
    user: userId,
    items: normalizedItems,
    shippingAddress: {
      ...shippingAddress,
      notes: shippingAddress.notes || '',
    },
    status: 'pending',
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
    return res.status(401).json({ message: 'Token is not valid!' });
  }

  const orders = await Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(serializeOrders(orders));
});

const getOrderById = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Token is not valid!' });
  }

  const isStaff =
    Array.isArray(req.user?.roles) &&
    req.user.roles.some((r) => r === 'admin' || r === 'moderator');

  const query = isStaff
    ? { _id: req.params.id }
    : { _id: req.params.id, user: userId };

  const order = await Order.findOne(query).lean();
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const serialized = serializeOrder(order);
  res.status(200).json({
    ...serialized,
    allowedNextStatuses: isStaff
      ? getAllowedNextStatuses(serialized.status)
      : undefined,
  });
});

/**
 * Admin/moderator: paginated order list.
 * @route GET /api/orders
 * @access Private (orders:read)
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, paymentStatus, q } = req.query;

  const query = {};
  if (status && ORDER_STATUSES.includes(String(status))) {
    query.status = String(status);
  }
  if (
    paymentStatus &&
    ['unpaid', 'pending', 'paid', 'failed', 'refunded'].includes(
      String(paymentStatus),
    )
  ) {
    query.paymentStatus = String(paymentStatus);
  }
  if (q && String(q).trim()) {
    const term = String(q).trim();
    if (/^[a-f\d]{24}$/i.test(term)) {
      query._id = term;
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Order.countDocuments(query),
  ]);

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
  const schema = Joi.object({
    trackingNumber: Joi.string().trim().allow('').optional(),
    trackingCarrier: Joi.string().trim().allow('').optional(),
    trackingUrl: Joi.string().trim().allow('').optional(),
    trackingEvent: Joi.object({
      status: Joi.string()
        .valid(
          'picked_up',
          'in_transit',
          'out_for_delivery',
          'delivered',
          'exception',
        )
        .required(),
      description: Joi.string().trim().allow('').optional(),
      location: Joi.string().trim().allow('').optional(),
    }).optional(),
  });
  const { error, value } = schema.validate(req.body || {});
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Update basic tracking fields
  if (value.trackingNumber !== undefined)
    order.trackingNumber = value.trackingNumber;
  if (value.trackingCarrier !== undefined)
    order.trackingCarrier = value.trackingCarrier;
  if (value.trackingUrl !== undefined) order.trackingUrl = value.trackingUrl;

  // Add tracking event if provided
  if (value.trackingEvent) {
    order.trackingEvents.push({
      status: value.trackingEvent.status,
      description: value.trackingEvent.description || '',
      location: value.trackingEvent.location || '',
      timestamp: new Date(),
    });
  }

  await order.save();

  const serialized = serializeOrder(order);
  res.status(200).json({
    message: 'Tracking information updated',
    data: serialized,
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
  const schema = Joi.object({
    status: Joi.string()
      .valid(...ORDER_STATUSES)
      .required(),
  });
  const { error, value } = schema.validate(req.body || {});
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const transition = canTransitionOrderStatus(order.status, value.status);
  if (!transition.ok) {
    return res.status(400).json({ message: transition.message });
  }

  const paymentCaptured =
    order.paymentStatus === 'paid' || order.paymentStatus === 'refunded';

  if (value.status === 'paid' && order.paymentStatus !== 'paid') {
    return res.status(400).json({
      message:
        'This order has not been paid. Payment status is set by Stripe only.',
    });
  }

  if (value.status === 'refunded' && !paymentCaptured) {
    return res.status(400).json({
      message: 'This order has no captured payment to refund',
    });
  }

  // Guard: pending+paid is an inconsistent state — do not cancel via this path
  if (value.status === 'canceled' && order.status === 'pending') {
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        message: 'Cannot cancel a paid order from pending state',
      });
    }
  }

  // Leaving needs_attention clears the reason unless a new one is set below
  if (order.status === 'needs_attention') {
    order.attentionReason = '';
  }

  // Resolving needs_attention → paid: inventory must actually be available now
  if (value.status === 'paid' && !order.stockDecremented) {
    try {
      await decrementStockForPaidOrder(Product, order);
      order.stockDecremented = true;
    } catch (stockErr) {
      if (stockErr?.statusCode !== 409) throw stockErr;
      return res.status(409).json({
        message: `${stockErr.message}. Restock the product or refund the order.`,
      });
    }
  }

  const releasesOrder =
    value.status === 'canceled' || value.status === 'refunded';
  const autoRefund = process.env.AUTO_REFUND_ON_CANCEL !== 'false';
  let refundedNow = false;

  if (releasesOrder && order.paymentStatus === 'paid') {
    if (!order.paymentIntentId || !autoRefund) {
      order.attentionReason = 'manual_refund_required';
    } else {
      try {
        const stripe = getStripeOrThrow();
        const refund = await refundPaymentIntent(stripe, order.paymentIntentId);
        order.paymentStatus = 'refunded';
        order.refundId = refund?.id || '';
        order.refundedAt = new Date();
        order.refundAmount = Number(refund?.amount || 0) / 100;
        refundedNow = true;
        // Persist the refund trail before any further step can fail
        await order.save();
      } catch (refundErr) {
        console.error(
          `Stripe refund failed for order ${order._id}:`,
          refundErr?.message || refundErr,
        );
        order.status = 'needs_attention';
        order.attentionReason = 'refund_failed';
        await order.save();
        return res.status(502).json({
          message:
            'The Stripe refund could not be created. The order was flagged for manual review; please retry or refund it from the Stripe dashboard.',
          attentionReason: 'refund_failed',
        });
      }
    }
  }

  let stockRestoredNow = false;
  if (releasesOrder) {
    stockRestoredNow = await restoreStockOnce(Order, Product, order);
    if (stockRestoredNow) order.stockRestored = true;
  }

  order.status = value.status;
  await order.save();

  // Send email notifications based on status change
  const user = await order.populate('user');
  const userEmail = user?.email;
  if (userEmail) {
    if (value.status === 'shipped' && order.trackingNumber) {
      await sendOrderShippedEmail({
        to: userEmail,
        orderId: order._id,
        trackingNumber: order.trackingNumber,
        trackingCarrier: order.trackingCarrier,
      }).catch(() => {});
    } else if (value.status === 'delivered') {
      await sendOrderDeliveredEmail({
        to: userEmail,
        orderId: order._id,
      }).catch(() => {});
    } else if (value.status === 'canceled') {
      await sendOrderCanceledEmail({
        to: userEmail,
        orderId: order._id,
      }).catch(() => {});
    } else if (value.status === 'refunded' && order.refundAmount > 0) {
      await sendOrderRefundedEmail({
        to: userEmail,
        orderId: order._id,
        refundAmount: order.refundAmount,
      }).catch(() => {});
    }
  }

  const serialized = serializeOrder(order);
  let message = `Order status updated to ${value.status}`;
  if (refundedNow && stockRestoredNow) {
    message = 'Order refunded via Stripe and inventory restored';
  } else if (refundedNow) {
    message = 'Order refunded via Stripe';
  } else if (stockRestoredNow) {
    message = 'Order canceled and inventory restored';
  } else if (order.attentionReason === 'manual_refund_required') {
    message = `Order ${value.status}; the payment must be refunded manually in Stripe`;
  }

  res.status(200).json({
    ...serialized,
    allowedNextStatuses: getAllowedNextStatuses(serialized.status),
    stockRestored: stockRestoredNow || Boolean(order.stockRestored),
    refunded: refundedNow || order.paymentStatus === 'refunded',
    message,
  });
});

/**
 * Customer: cancel their own order (before shipped)
 * @route POST /api/orders/:id/cancel
 * @access Private (order owner)
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Check ownership
  if (order.user.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json({ message: 'Not authorized to cancel this order' });
  }

  // Check if order can be canceled (only pending or paid, not shipped/delivered)
  if (order.status === 'shipped' || order.status === 'delivered') {
    return res.status(400).json({
      message: 'Cannot cancel an order that has been shipped or delivered',
    });
  }

  if (order.status === 'canceled' || order.status === 'refunded') {
    return res.status(400).json({
      message: 'Order is already canceled or refunded',
    });
  }

  // Check transition
  const transition = canTransitionOrderStatus(order.status, 'canceled');
  if (!transition.ok) {
    return res.status(400).json({ message: transition.message });
  }

  // If paid, initiate refund
  let refundedNow = false;
  if (order.paymentStatus === 'paid') {
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      if (order.paymentIntentId) {
        const refund = await stripe.refunds.create({
          payment_intent: order.paymentIntentId,
        });
        order.refundId = refund.id;
        order.refundAmount = refund.amount / 100;
        order.refundedAt = new Date();
        order.paymentStatus = 'refunded';
        refundedNow = true;
      }
    } catch (refundErr) {
      console.error(
        `Stripe refund failed for order ${order._id}:`,
        refundErr?.message || refundErr,
      );
      order.status = 'needs_attention';
      order.attentionReason = 'refund_failed';
      await order.save();
      return res.status(502).json({
        message:
          'The Stripe refund could not be created. The order was flagged for manual review; please retry or refund it from the Stripe dashboard.',
      });
    }
  }

  // Restore stock
  const stockRestoredNow = await restoreStockOnce(Order, Product, order);
  if (stockRestoredNow) order.stockRestored = true;

  order.status = 'canceled';
  await order.save();

  // Send cancellation email
  const user = await order.populate('user');
  const userEmail = user?.email;
  if (userEmail) {
    await sendOrderCanceledEmail({
      to: userEmail,
      orderId: order._id,
    }).catch(() => {});
  }

  const serialized = serializeOrder(order);
  res.status(200).json({
    ...serialized,
    stockRestored: stockRestoredNow || Boolean(order.stockRestored),
    refunded: refundedNow || order.paymentStatus === 'refunded',
    message: refundedNow
      ? 'Order canceled and refunded'
      : 'Order canceled and inventory restored',
  });
});

/**
 * Generate invoice for an order
 * @route GET /api/orders/:id/invoice
 * @access Private (order owner or admin)
 */
const getOrderInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user');
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Check ownership or admin
  const isAdmin = req.user.roles?.includes('admin');
  if (order.user._id.toString() !== req.user._id.toString() && !isAdmin) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  // Generate HTML invoice
  const frontend = process.env.FRONTEND_URL || 'http://localhost:3001';
  const invoiceHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - Order ${order._id.slice(-8).toUpperCase()}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
    .invoice-number { text-align: right; }
    .section { margin-bottom: 30px; }
    .section h3 { border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; }
    .total { font-weight: bold; font-size: 18px; }
    .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">TrendVaulta</div>
    <div class="invoice-number">
      <h2>INVOICE</h2>
      <p>Order #${order._id.slice(-8).toUpperCase()}</p>
      <p>Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
    </div>
  </div>

  <div class="section">
    <h3>Bill To</h3>
    <p><strong>${order.shippingAddress.name}</strong></p>
    <p>${order.shippingAddress.address}</p>
    <p>${order.shippingAddress.city}, ${order.shippingAddress.zip}</p>
    <p>${order.shippingAddress.phone}</p>
  </div>

  <div class="section">
    <h3>Order Items</h3>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.items
          .map(
            (item) => `
          <tr>
            <td>${item.title}</td>
            <td>${item.qty}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>$${(item.price * item.qty).toFixed(2)}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h3>Order Summary</h3>
    <table>
      <tr>
        <td>Subtotal</td>
        <td>$${order.itemsPrice.toFixed(2)}</td>
      </tr>
      ${
        order.discountAmount > 0
          ? `
      <tr>
        <td>Discount</td>
        <td>-$${order.discountAmount.toFixed(2)}</td>
      </tr>
      `
          : ''
      }
      <tr>
        <td>Shipping</td>
        <td>$${order.shippingPrice.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Tax</td>
        <td>$${order.taxPrice.toFixed(2)}</td>
      </tr>
      <tr class="total">
        <td>Total</td>
        <td>$${order.totalPrice.toFixed(2)}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <p>Thank you for your order!</p>
    <p>${frontend}</p>
  </div>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(invoiceHtml);
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  updateOrderTracking,
  cancelOrder,
  getOrderInvoice,
};
