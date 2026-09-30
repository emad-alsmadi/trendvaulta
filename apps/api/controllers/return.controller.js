const asyncHandler = require('express-async-handler');
const { validationBody } = require('../utils/errors');
const logger = require('../utils/logger');
const Joi = require('joi');
const { Order } = require('../models/Order');
const { Product } = require('../models/Product');
const { User } = require('../models/User');
const { restoreStockForReturnedItems } = require('../utils/commerce');
const {
  getStripeOrThrow,
  refundPaymentIntent,
} = require('../services/stripe.service');
const { canTransitionOrderStatus } = require('../utils/orderTransitions');
const { canCustomerReturn, canTransitionReturn } = require('../utils/returns');
const { sendOrderRefundedEmail, sendReturnUpdateEmail } = require('../utils/mail');
const { EMAIL_NOT_VERIFIED, hasVerifiedEmail } = require('../utils/emailVerification');
const { orderEmailTarget } = require('../utils/guestOrders');

const returnItemSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  qty: Joi.number().integer().min(1).required(),
  reason: Joi.string().trim().max(500).allow('').optional(),
  // Titles come from the order itself, never from the client.
  title: Joi.any().strip(),
});

const validateReturnRequest = (obj) => {
  const schema = Joi.object({
    reason: Joi.string().trim().min(1).max(500).required(),
    items: Joi.array().items(returnItemSchema).min(1).required(),
  });
  return schema.validate(obj, { stripUnknown: true });
};

function isStaff(user) {
  return (
    Array.isArray(user?.roles) &&
    user.roles.some((r) => r === 'admin' || r === 'moderator')
  );
}

/** Round to cents; money compared in floats needs a fixed precision. */
function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

/**
 * @desc    Create a return request for a delivered order
 * @route   POST /api/orders/:id/return
 * @access  Private (order owner)
 */
const createReturnRequest = asyncHandler(async (req, res) => {
  const { error, value } = validateReturnRequest(req.body);
  if (error) {
    return res.status(400).json(validationBody(error));
  }

  // Owner-scoped: another customer's order is simply not found.
  const order = await Order.findOne({ _id: req.params.id, user: req.user?.id });
  if (!order) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found' });
  }

  const eligible = canCustomerReturn(order);
  if (!eligible.ok) {
    return res.status(400).json({ code: eligible.code, ...(eligible.params && { params: eligible.params }), message: eligible.message });
  }

  // Refund updates go to this address, so it must be confirmed (plan D5)
  if (!(await hasVerifiedEmail(User, req.user?.id))) {
    return res.status(403).json(EMAIL_NOT_VERIFIED);
  }

  // An order can hold the same product on several lines (variants), so
  // quantities are compared per product, summed on both sides.
  const ordered = new Map();
  for (const line of order.items) {
    const id = String(line.productId);
    const entry = ordered.get(id) || { qty: 0, title: line.title };
    entry.qty += Number(line.qty) || 0;
    ordered.set(id, entry);
  }
  const requested = new Map();
  for (const item of value.items) {
    const entry = requested.get(item.productId) || { qty: 0, reasons: [] };
    entry.qty += item.qty;
    if (item.reason) entry.reasons.push(item.reason);
    requested.set(item.productId, entry);
  }
  for (const [productId, { qty }] of requested) {
    const line = ordered.get(productId);
    if (!line) {
      return res.status(400).json({ code: 'RETURN_ITEMS_INVALID', message: 'Some items are not part of this order' });
    }
    if (qty > line.qty) {
      return res.status(400).json({
        code: 'RETURN_QTY_EXCEEDED',
        message: `You can return at most ${line.qty} of "${line.title}".`,
      });
    }
  }

  const returnRequest = {
    status: 'requested',
    reason: value.reason,
    items: [...requested].map(([productId, { qty, reasons }]) => ({
      productId,
      title: ordered.get(productId).title,
      qty,
      reason: reasons.join(' / '),
    })),
    requestedAt: new Date(),
  };

  // Claimed with a condition so a double submit opens one return, not two.
  const updated = await Order.findOneAndUpdate(
    {
      _id: order._id,
      $or: [
        { returnRequest: null },
        { returnRequest: { $exists: false } },
        { 'returnRequest.status': 'none' },
      ],
    },
    { $set: { returnRequest } },
    { new: true },
  );
  if (!updated) {
    return res.status(409).json({
      code: 'RETURN_EXISTS',
      message: 'A return has already been requested for this order.',
    });
  }

  // Acknowledge in the customer's language (P1-02). Best effort.
  const requestedTo = await orderEmailTarget(updated, User);
  await sendReturnUpdateEmail({ ...requestedTo, orderId: updated._id, status: 'requested' }).catch(() => {});

  res.status(201).json({
    message: 'Return request submitted',
    data: updated.returnRequest,
  });
});

/**
 * @desc    Get return request details
 * @route   GET /api/orders/:id/return
 * @access  Private (order owner or staff)
 */
const getReturnRequest = asyncHandler(async (req, res) => {
  const query = isStaff(req.user)
    ? { _id: req.params.id }
    : { _id: req.params.id, user: req.user?.id };
  const order = await Order.findOne(query).lean();
  if (!order) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found' });
  }

  if (!order.returnRequest || order.returnRequest.status === 'none') {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'No return request found' });
  }

  res.status(200).json({ data: order.returnRequest });
});

/**
 * @desc    Move a return to its next step (staff)
 *
 * approved  — requires `instructions` (what to send, where, how)
 * rejected  — `notes` should tell the customer why
 * received  — the parcel arrived
 * refunded  — issues a Stripe refund of `refundAmount`, capped at what has
 *             not already been refunded on the order
 *
 * @route   PATCH /api/orders/:id/return
 * @access  Private (orders:write)
 */
const updateReturnRequest = asyncHandler(async (req, res) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid('approved', 'rejected', 'received', 'refunded')
      .required(),
    notes: Joi.string().trim().max(500).allow('').optional(),
    instructions: Joi.string().trim().max(2000).allow('').optional(),
    refundAmount: Joi.number().precision(2).greater(0).optional(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json(validationBody(error));
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found' });
  }
  const current = order.returnRequest?.status;
  if (!current || current === 'none') {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'No return request found' });
  }

  const transition = canTransitionReturn(current, value.status);
  if (!transition.ok) {
    return res.status(400).json({ code: transition.code, ...(transition.params && { params: transition.params }), message: transition.message });
  }

  if (value.status === 'refunded') {
    return refundReturn(req, res, order, value);
  }

  const now = new Date();
  const $set = { 'returnRequest.status': value.status };
  if (value.notes !== undefined) $set['returnRequest.notes'] = value.notes;
  if (value.status === 'approved') {
    if (!value.instructions) {
      return res.status(400).json({
        code: 'RETURN_INSTRUCTIONS_REQUIRED',
        message: 'Add return instructions so the customer knows where to send the items.',
      });
    }
    $set['returnRequest.instructions'] = value.instructions;
    $set['returnRequest.approvedAt'] = now;
  } else if (value.status === 'received') {
    $set['returnRequest.receivedAt'] = now;
  } else if (value.status === 'rejected') {
    $set['returnRequest.rejectedAt'] = now;
  }

  // Conditional on the step we validated against: a concurrent change by
  // another staff member makes this a 409, not a silent overwrite.
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, 'returnRequest.status': current },
    { $set },
    { new: true },
  );
  if (!updated) {
    return res.status(409).json({
      code: 'STALE_UPDATE',
      message: 'This return was just updated by someone else. Refresh and try again.',
    });
  }

  // The parcel is back: put the returned lines (only those) into stock.
  // Runs once — the 'received' step above is claimed conditionally. A
  // failure is logged, not surfaced: the return itself is still received.
  if (value.status === 'received' && updated.stockDecremented) {
    try {
      await restoreStockForReturnedItems(
        Product,
        updated,
        updated.returnRequest?.items,
      );
    } catch (stockErr) {
      logger.error(
        { err: stockErr },
        `Return received for order ${order._id} but restocking failed`,
      );
    }
  }

  // Tell the customer about the new step: instructions when approved, the
  // reason when rejected (P1-02). Best effort.
  const stepTo = await orderEmailTarget(updated, User);
  await sendReturnUpdateEmail({
    ...stepTo,
    orderId: updated._id,
    status: value.status,
    note: value.status === 'approved' ? value.instructions : value.notes,
  }).catch(() => {});

  res.status(200).json({
    message: `Return ${value.status}`,
    data: updated.returnRequest,
  });
});

/**
 * Refund step of a return. Claims `refunded` first so the money can only
 * move once, then calls Stripe; a Stripe failure puts the return back to
 * `received` so staff can retry.
 */
async function refundReturn(req, res, order, value) {
  if (order.paymentStatus !== 'paid') {
    return res.status(400).json({
      code: 'NO_PAYMENT_TO_REFUND',
      message: 'This order has no captured payment left to refund.',
    });
  }
  if (!order.paymentIntentId) {
    return res.status(400).json({
      code: 'NO_STRIPE_PAYMENT',
      message: 'This order has no Stripe payment on record. Refund it manually in Stripe.',
    });
  }

  // Cap at what Stripe captured; totalPrice is the fallback for orders paid
  // before amountPaid was recorded.
  const capturedAmount =
    order.amountPaid != null ? order.amountPaid : order.totalPrice;
  const refundableCents = toCents(capturedAmount) - toCents(order.refundAmount || 0);
  const amountCents = toCents(value.refundAmount);
  if (!amountCents) {
    return res.status(400).json({ code: 'REFUND_AMOUNT_REQUIRED', message: 'Enter the amount to refund.' });
  }
  if (amountCents > refundableCents) {
    return res.status(400).json({
      code: 'REFUND_AMOUNT_TOO_HIGH',
      message: `At most ${(refundableCents / 100).toFixed(2)} can still be refunded on this order.`,
    });
  }

  const now = new Date();
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, 'returnRequest.status': 'received' },
    {
      $set: {
        'returnRequest.status': 'refunded',
        'returnRequest.refundAmount': amountCents / 100,
        'returnRequest.refundedAt': now,
        ...(value.notes !== undefined ? { 'returnRequest.notes': value.notes } : {}),
      },
    },
    { new: true },
  );
  if (!claimed) {
    return res.status(409).json({
      code: 'STALE_UPDATE',
      message: 'This return was just updated by someone else. Refresh and try again.',
    });
  }

  let refund;
  try {
    refund = await refundPaymentIntent(getStripeOrThrow(), order.paymentIntentId, {
      amountCents,
      // One return per order; the amount is in the key so a corrected
      // retry is a new request rather than a replay of a failed one.
      idempotencyKey: `return:${order._id}:${amountCents}`,
    });
  } catch (refundErr) {
    logger.error(
      { err: refundErr },
      `Return refund failed for order ${order._id}`,
    );
    await Order.updateOne(
      { _id: order._id, 'returnRequest.status': 'refunded' },
      {
        $set: { 'returnRequest.status': 'received', 'returnRequest.refundAmount': 0 },
        $unset: { 'returnRequest.refundedAt': 1 },
      },
    );
    return res.status(502).json({
      message: 'Stripe could not issue the refund. The return is still marked received — try again, or refund it from the Stripe dashboard.',
    });
  }

  // The charge.refunded webhook re-syncs these from Stripe's own totals;
  // setting them here means the dashboard is right even before it arrives.
  const fullyRefunded = amountCents >= refundableCents;
  const $set = {
    'returnRequest.refundId': refund?.id || '',
    refundId: refund?.id || '',
    refundedAt: now,
    refundAmount: (toCents(order.refundAmount || 0) + amountCents) / 100,
  };
  if (fullyRefunded) {
    $set.paymentStatus = 'refunded';
    if (canTransitionOrderStatus(order.status, 'refunded').ok) {
      $set.status = 'refunded';
    }
  }
  const updated = await Order.findByIdAndUpdate(order._id, { $set }, { new: true });

  const { to, orderUrl } = await orderEmailTarget(order, User);
  if (to) {
    await sendOrderRefundedEmail({
      to,
      orderUrl,
      orderId: order._id,
      refundAmount: amountCents / 100,
    }).catch(() => {});
  }

  res.status(200).json({
    message: `Refunded ${(amountCents / 100).toFixed(2)} via Stripe`,
    data: updated.returnRequest,
  });
}

module.exports = {
  createReturnRequest,
  getReturnRequest,
  updateReturnRequest,
};
