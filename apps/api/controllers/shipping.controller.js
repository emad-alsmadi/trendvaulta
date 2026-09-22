const asyncHandler = require('express-async-handler');
const { ShippingZone, validateShippingZone, validateShippingMethod } = require('../models/ShippingZone');
const { invalidateStoreSettingsCache } = require('../utils/commerce');

const getShippingZones = asyncHandler(async (_req, res) => {
  const zones = await ShippingZone.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  res.status(200).json({ message: 'ok', data: zones });
});

const getAllShippingZonesAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, isActive } = req.query;
  const query = {};
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const [zones, total] = await Promise.all([
    ShippingZone.find(query).sort({ sortOrder: 1, name: 1 }).skip(skip).limit(limitNum).lean(),
    ShippingZone.countDocuments(query),
  ]);

  res.status(200).json({
    data: zones,
    meta: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      limit: limitNum,
    },
  });
});

const getShippingZoneById = asyncHandler(async (req, res) => {
  const zone = await ShippingZone.findById(req.params.id).lean();
  if (!zone) {
    return res.status(404).json({ message: 'Shipping zone not found' });
  }
  res.status(200).json({ message: 'ok', data: zone });
});

const createShippingZone = asyncHandler(async (req, res) => {
  const { error, value } = validateShippingZone(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const zone = await ShippingZone.create(value);
  res.status(201).json({ message: 'Shipping zone created', data: zone });
});

const updateShippingZone = asyncHandler(async (req, res) => {
  const { error, value } = validateShippingZone(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const zone = await ShippingZone.findByIdAndUpdate(
    req.params.id,
    { $set: value },
    { new: true, runValidators: true },
  ).lean();

  if (!zone) {
    return res.status(404).json({ message: 'Shipping zone not found' });
  }

  invalidateStoreSettingsCache();
  res.status(200).json({ message: 'Shipping zone updated', data: zone });
});

const deleteShippingZone = asyncHandler(async (req, res) => {
  const zone = await ShippingZone.findByIdAndDelete(req.params.id);
  if (!zone) {
    return res.status(404).json({ message: 'Shipping zone not found' });
  }

  invalidateStoreSettingsCache();
  res.status(200).json({ message: 'Shipping zone deleted' });
});

const addShippingMethod = asyncHandler(async (req, res) => {
  const { error, value } = validateShippingMethod(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const zone = await ShippingZone.findById(req.params.id);
  if (!zone) {
    return res.status(404).json({ message: 'Shipping zone not found' });
  }

  const handleExists = zone.methods.some((m) => m.handle === value.handle);
  if (handleExists) {
    return res.status(409).json({ message: 'Method handle already exists in this zone' });
  }

  zone.methods.push(value);
  await zone.save();

  invalidateStoreSettingsCache();
  res.status(201).json({ message: 'Shipping method added', data: zone.methods });
});

const updateShippingMethod = asyncHandler(async (req, res) => {
  const { error, value } = validateShippingMethod(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const zone = await ShippingZone.findById(req.params.id);
  if (!zone) {
    return res.status(404).json({ message: 'Shipping zone not found' });
  }

  const method = zone.methods.id(req.params.methodId);
  if (!method) {
    return res.status(404).json({ message: 'Shipping method not found' });
  }

  if (value.handle !== method.handle) {
    const handleExists = zone.methods.some((m) => m.handle === value.handle);
    if (handleExists) {
      return res.status(409).json({ message: 'Method handle already exists in this zone' });
    }
  }

  Object.assign(method, value);
  await zone.save();

  invalidateStoreSettingsCache();
  res.status(200).json({ message: 'Shipping method updated', data: zone.methods });
});

const deleteShippingMethod = asyncHandler(async (req, res) => {
  const zone = await ShippingZone.findById(req.params.id);
  if (!zone) {
    return res.status(404).json({ message: 'Shipping zone not found' });
  }

  const method = zone.methods.id(req.params.methodId);
  if (!method) {
    return res.status(404).json({ message: 'Shipping method not found' });
  }

  method.deleteOne();
  await zone.save();

  invalidateStoreSettingsCache();
  res.status(200).json({ message: 'Shipping method deleted', data: zone.methods });
});

const getShippingMethodsForAddress = asyncHandler(async (req, res) => {
  const { country, zip, region } = req.query;

  if (!country) {
    return res.status(400).json({ message: 'Country is required' });
  }

  const countryCode = String(country).toUpperCase();
  const zones = await ShippingZone.find({
    isActive: true,
    $or: [
      { countries: countryCode },
      { countries: { $size: 0 } },
    ],
  }).sort({ sortOrder: 1 }).lean();

  let matchedZone = null;
  for (const zone of zones) {
    if (zone.countries.length === 0 || zone.countries.includes(countryCode)) {
      if (zone.regionPattern) {
        const regex = new RegExp(zone.regionPattern, 'i');
        if (region && !regex.test(region)) continue;
      }
      if (zone.postalCodePattern) {
        const regex = new RegExp(zone.postalCodePattern, 'i');
        if (zip && !regex.test(zip)) continue;
      }
      matchedZone = zone;
      break;
    }
  }

  if (!matchedZone) {
    return res.status(200).json({ message: 'ok', data: [] });
  }

  const activeMethods = matchedZone.methods
    .filter((m) => m.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => ({
      _id: m._id,
      name: m.name,
      handle: m.handle,
      description: m.description,
      priceUsd: m.priceUsd,
      estimatedDaysMin: m.estimatedDaysMin,
      estimatedDaysMax: m.estimatedDaysMax,
      zoneId: matchedZone._id,
      zoneName: matchedZone.name,
    }));

  res.status(200).json({ message: 'ok', data: activeMethods });
});

module.exports = {
  getShippingZones,
  getAllShippingZonesAdmin,
  getShippingZoneById,
  createShippingZone,
  updateShippingZone,
  deleteShippingZone,
  addShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
  getShippingMethodsForAddress,
};