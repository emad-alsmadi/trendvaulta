const asyncHandler = require('express-async-handler');
const {
  StoreSettings,
  SINGLETON_ID,
  validateUpdateStoreSettings,
} = require('../models/StoreSettings');
const { invalidateStoreSettingsCache } = require('../utils/commerce');

/**
 * Fetch the singleton store settings document, creating it with defaults
 * on first read if it does not exist yet.
 * @route GET /api/admin/settings
 * @access Private (content:read)
 */
const getSettings = asyncHandler(async (_req, res) => {
  let settings = await StoreSettings.findById(SINGLETON_ID);
  if (!settings) {
    settings = await StoreSettings.create({ _id: SINGLETON_ID });
  }
  res.status(200).json({ message: 'ok', data: settings });
});

/**
 * Update the singleton store settings document (upsert).
 * @route PUT /api/admin/settings
 * @access Private (content:write)
 */
const updateSettings = asyncHandler(async (req, res) => {
  const { error, value } = validateUpdateStoreSettings(req.body || {});
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const update = { ...value, updatedBy: req.user?.id ?? req.user?._id ?? null };
  if (value.shipping) {
    // Merge nested shipping fields so a partial update doesn't zero the rest
    for (const key of Object.keys(value.shipping)) {
      update[`shipping.${key}`] = value.shipping[key];
    }
    delete update.shipping;
  }

  const settings = await StoreSettings.findByIdAndUpdate(
    SINGLETON_ID,
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );

  invalidateStoreSettingsCache();

  res.status(200).json({ message: 'Store settings updated', data: settings });
});

module.exports = {
  getSettings,
  updateSettings,
};
