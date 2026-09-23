const asyncHandler = require('express-async-handler');
const Joi = require('joi');
const { Order } = require('../models/Order');

const returnItemSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  title: Joi.string().trim().min(1).max(200).required(),
  qty: Joi.number().integer().min(1).required(),
  reason: Joi.string().trim().max(500).allow('').optional(),
});

const validateReturnRequest = (obj) => {
  const schema = Joi.object({
    reason: Joi.string().trim().min(1).max(500).required(),
    items: Joi.array().items(returnItemSchema).min(1).required(),
  });
  return schema.validate(obj, { stripUnknown: true });
};

/**
 * @desc    Create a return request for an order
 * @route   POST /api/orders/:id/return
 * @access  Private (order owner)
 */
const createReturnRequest = asyncHandler(async (req, res) => {
  const { error, value } = validateReturnRequest(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Check ownership
  if (order.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized to return this order' });
  }

  // Check if order is eligible for return (delivered only)
  if (order.status !== 'delivered') {
    return res.status(400).json({
      message: 'Only delivered orders can be returned',
    });
  }

  // Check if return already exists
  if (order.returnRequest && order.returnRequest.status !== 'none') {
    return res.status(400).json({
      message: 'Return request already exists for this order',
    });
  }

  // Validate items against order items
  const orderItemIds = order.items.map((item) => item.productId.toString());
  const invalidItems = value.items.filter(
    (item) => !orderItemIds.includes(item.productId),
  );
  if (invalidItems.length > 0) {
    return res.status(400).json({
      message: 'Some items are not part of this order',
    });
  }

  // Create return request
  order.returnRequest = {
    status: 'requested',
    reason: value.reason,
    items: value.items,
    requestedAt: new Date(),
  };

  await order.save();

  res.status(201).json({
    message: 'Return request submitted',
    data: order.returnRequest,
  });
});

/**
 * @desc    Get return request details
 * @route   GET /api/orders/:id/return
 * @access  Private (order owner or admin)
 */
const getReturnRequest = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Check ownership or admin
  const isAdmin = req.user.roles?.includes('admin');
  if (order.user.toString() !== req.user._id.toString() && !isAdmin) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  if (!order.returnRequest || order.returnRequest.status === 'none') {
    return res.status(404).json({ message: 'No return request found' });
  }

  res.status(200).json({
    data: order.returnRequest,
  });
});

/**
 * @desc    Update return request status (admin only)
 * @route   PATCH /api/orders/:id/return
 * @access  Private (admin)
 */
const updateReturnRequest = asyncHandler(async (req, res) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid('approved', 'rejected', 'received', 'refunded')
      .required(),
    notes: Joi.string().trim().max(500).allow('').optional(),
    refundAmount: Joi.number().min(0).optional(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (!order.returnRequest || order.returnRequest.status === 'none') {
    return res.status(404).json({ message: 'No return request found' });
  }

  // Update status and timestamps
  order.returnRequest.status = value.status;
  order.returnRequest.notes = value.notes || '';

  if (value.status === 'approved') {
    order.returnRequest.approvedAt = new Date();
  } else if (value.status === 'received') {
    order.returnRequest.receivedAt = new Date();
  } else if (value.status === 'refunded') {
    order.returnRequest.refundAmount = value.refundAmount || 0;
  }

  await order.save();

  res.status(200).json({
    message: 'Return request updated',
    data: order.returnRequest,
  });
});

module.exports = {
  createReturnRequest,
  getReturnRequest,
  updateReturnRequest,
};
