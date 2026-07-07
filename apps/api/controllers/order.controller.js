const asyncHandler = require('express-async-handler');
const { Order, validateCreateOrder } = require('../models/Order');
const { Template } = require('../models/Template');
const { serializeOrder, serializeOrders } = require('../utils/serializeOrder');

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

  const { items, shippingAddress } = value;
  const shippingPrice = Number(value.shippingPrice ?? 0);
  const taxPrice = Number(value.taxPrice ?? 0);

  // Validate that all template items exist
  const templateIds = items.map((i) => i.template);
  const templates = await Template.find({ _id: { $in: templateIds } });
  if (templates.length !== templateIds.length) {
    res.status(400);
    throw new Error('One or more templates not found');
  }

  const templatesById = new Map(templates.map((t) => [String(t._id), t]));

  const normalizedItems = items.map((i) => {
    const t = templatesById.get(String(i.template));
    if (!t) {
      return null;
    }

    return {
      template: t._id,
      title: t.title,
      price: Number(t.price),
      qty: Number(i.qty),
      cover: t.cover,
    };
  });

  const missing = normalizedItems.find((x) => !x);
  if (missing) {
    return res
      .status(404)
      .json({ message: 'One or more templates were not found' });
  }

  const finalItems = normalizedItems;
  const itemsPrice = finalItems.reduce((sum, it) => sum + it.price * it.qty, 0);
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  const order = await Order.create({
    user: userId,
    items: finalItems,
    shippingAddress: {
      ...shippingAddress,
      notes: shippingAddress.notes || '',
    },
    status: 'pending',
    itemsPrice,
    shippingPrice,
    taxPrice,
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

  const isAdmin = req.user?.roles?.includes('admin');

  const query = isAdmin
    ? { _id: req.params.id }
    : { _id: req.params.id, user: userId };

  const order = await Order.findOne(query).lean();
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  res.status(200).json(serializeOrder(order));
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
};
