const asyncHandler = require('express-async-handler');
const GiftFinderConfig = require('../models/GiftFinderConfig');

/**
 * V1 stub — static gift-finder facet config (no CMS yet).
 * Mirrors website DEMO_GIFT_FINDER so FE can swap to this endpoint.
 *
 * Optional fields (category, minPrice) are included for PLP query building;
 * core shape matches backlog #11: id, label, q / maxPrice.
 */
const DEFAULT_GIFT_FINDER = {
  occasions: [
    { id: 'birthday', label: 'Birthday', q: 'gift' },
    { id: 'thank-you', label: 'Thank you', q: 'gift' },
    { id: 'self-care', label: 'Self-care', category: 'beauty', q: 'skincare' },
    { id: 'housewarming', label: 'Housewarming', category: 'home', q: 'home' },
    { id: 'just-because', label: 'Just because', q: 'gift' },
  ],
  recipients: [
    { id: 'for-her', label: 'For her', q: 'beauty' },
    { id: 'for-him', label: 'For him', q: 'grooming' },
    { id: 'for-home', label: 'For home', category: 'home' },
    { id: 'for-anyone', label: 'For anyone', q: 'gift' },
  ],
  budgets: [
    { id: 'under-25', label: 'Under $25', maxPrice: 25 },
    { id: '25-50', label: '$25–$50', minPrice: 25, maxPrice: 50 },
    { id: '50-plus', label: '$50+', minPrice: 50 },
    { id: 'any', label: 'Any budget' },
  ],
};

/**
 * Get gift finder config for storefront
 * Uses GiftFinderConfig model if available, falls back to static DEFAULT_GIFT_FINDER
 *
 * @route GET /api/storefront/gift-finder
 * @access Public
 */
const getGiftFinderConfig = asyncHandler(async (_req, res) => {
  const config = await GiftFinderConfig.findOne({ active: true }).lean();

  if (config) {
    return res.status(200).json({
      message: 'ok',
      occasions: config.occasions,
      recipients: config.recipients,
      budgets: config.budgets,
    });
  }

  // Fallback to static config
  res.status(200).json({
    message: 'ok',
    occasions: DEFAULT_GIFT_FINDER.occasions,
    recipients: DEFAULT_GIFT_FINDER.recipients,
    budgets: DEFAULT_GIFT_FINDER.budgets,
  });
});

/**
 * Get all gift finder configs (admin)
 * Admin endpoint
 */
const getAllGiftFinderConfigs = asyncHandler(async (req, res) => {
  const configs = await GiftFinderConfig.find().sort({ createdAt: -1 }).lean();

  res.status(200).json({
    message: 'ok',
    data: configs,
  });
});

/**
 * Get a single gift finder config by ID
 * Admin endpoint
 */
const getGiftFinderConfigById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const config = await GiftFinderConfig.findById(id).lean();

  if (!config) {
    return res.status(404).json({ message: 'Gift finder config not found' });
  }

  res.status(200).json({
    message: 'ok',
    data: config,
  });
});

/**
 * Create a new gift finder config
 * Admin endpoint
 */
const createGiftFinderConfig = asyncHandler(async (req, res) => {
  const { occasions, recipients, budgets, active } = req.body;

  // Deactivate all existing configs if this one is active
  if (active) {
    await GiftFinderConfig.updateMany({}, { active: false });
  }

  const config = await GiftFinderConfig.create({
    occasions: occasions || [],
    recipients: recipients || [],
    budgets: budgets || [],
    active: active !== undefined ? active : true,
  });

  res.status(201).json({
    message: 'Gift finder config created successfully',
    data: config,
  });
});

/**
 * Update a gift finder config
 * Admin endpoint
 */
const updateGiftFinderConfig = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { occasions, recipients, budgets, active } = req.body;

  const config = await GiftFinderConfig.findById(id);
  if (!config) {
    return res.status(404).json({ message: 'Gift finder config not found' });
  }

  if (occasions !== undefined) config.occasions = occasions;
  if (recipients !== undefined) config.recipients = recipients;
  if (budgets !== undefined) config.budgets = budgets;

  if (active !== undefined && active !== config.active) {
    if (active) {
      // Deactivate all other configs
      await GiftFinderConfig.updateMany(
        { _id: { $ne: id } },
        { active: false },
      );
    }
    config.active = active;
  }

  await config.save();

  res.status(200).json({
    message: 'Gift finder config updated successfully',
    data: config,
  });
});

/**
 * Delete a gift finder config
 * Admin endpoint
 */
const deleteGiftFinderConfig = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const config = await GiftFinderConfig.findById(id);
  if (!config) {
    return res.status(404).json({ message: 'Gift finder config not found' });
  }

  await GiftFinderConfig.findByIdAndDelete(id);

  res.status(200).json({
    message: 'Gift finder config deleted successfully',
  });
});

module.exports = {
  getGiftFinderConfig,
  getAllGiftFinderConfigs,
  getGiftFinderConfigById,
  createGiftFinderConfig,
  updateGiftFinderConfig,
  deleteGiftFinderConfig,
  DEFAULT_GIFT_FINDER,
};
