/**
 * Brand repository — isolates MongoDB data access for brands.
 */
const { Brand } = require('../models/Brand');

/**
 * Find brands with filtering, sorting and pagination.
 * @param {object} match - Mongoose match filter
 * @param {object} sort - Mongoose sort object
 * @param {number} skip
 * @param {number} limit
 * @returns {Promise<{ brands: Array, total: number }>}
 */
async function findBrands(match, sort, skip, limit) {
  const [brands, total] = await Promise.all([
    Brand.find(match)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Brand.countDocuments(match),
  ]);
  return { brands, total };
}

/**
 * Find a single brand by id or slug.
 * @param {string} idOrSlug
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function findBrandByIdOrSlug(idOrSlug) {
  const mongoose = require('mongoose');
  const isObjectId = mongoose.isValidObjectId(idOrSlug);
  return Brand.findOne(
    isObjectId ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug },
  );
}

/**
 * Create a brand.
 * @param {object} data
 * @returns {Promise<import('mongoose').Document>}
 */
async function createBrand(data) {
  return new Brand(data).save();
}

/**
 * Update a brand by id.
 * @param {string} id
 * @param {object} updateData
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function updateBrand(id, updateData) {
  return Brand.findByIdAndUpdate(id, updateData, { new: true });
}

/**
 * Soft-deactivate a brand.
 * @param {string} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function deactivateBrand(id) {
  return Brand.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { new: true },
  );
}

module.exports = {
  findBrands,
  findBrandByIdOrSlug,
  createBrand,
  updateBrand,
  deactivateBrand,
};
