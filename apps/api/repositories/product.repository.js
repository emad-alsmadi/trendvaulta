/**
 * Product repository — isolates all MongoDB data access for products.
 *
 * The controller and service layers never call Mongoose directly; they call
 * these methods instead. Query *construction* (match/sort/facet objects)
 * stays in the pure utils under utils/productQuery.js; this layer only
 * executes them against the database.
 */
const { Product } = require('../models/Product');
const { buildFacetPipeline } = require('../utils/productQuery');

/**
 * Find products with pagination, plus total count and optional facet rows.
 * @param {object} params
 * @param {object} params.match - Mongoose match filter
 * @param {object} params.sort - Mongoose sort object
 * @param {number} params.skip
 * @param {number} params.limit
 * @param {boolean} params.wantFacets
 * @param {object} params.facetMatch - match for the facet pipeline (excludes
 *   facet-specific filters so counts are disjunctive)
 * @returns {Promise<{ products: Array, total: number, facetRows: Array|null }>}
 */
async function findProducts({ match, sort, skip, limit, wantFacets, facetMatch }) {
  const [products, total, facetRows] = await Promise.all([
    Product.find(match)
      .populate('brand', ['name', 'slug', 'logo'])
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(match),
    wantFacets
      ? Product.aggregate(buildFacetPipeline(facetMatch))
      : Promise.resolve(null),
  ]);
  return { products, total, facetRows };
}

/**
 * Find a single product by id, with brand populated.
 * @param {string} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function findProductById(id) {
  return Product.findById(id).populate('brand', [
    'name', 'slug', 'logo', 'website', 'country',
  ]);
}

/**
 * Create a new product document.
 * @param {object} data
 * @returns {Promise<import('mongoose').Document>}
 */
async function createProduct(data) {
  return new Product(data).save();
}

/**
 * Update a product by filter (supports optimistic concurrency via updatedAt).
 * @param {object} filter
 * @param {object} updateData
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function updateProduct(filter, updateData) {
  return Product.findOneAndUpdate(filter, updateData, {
    new: true,
    runValidators: true,
  });
}

/**
 * Soft-deactivate a product (isActive = false).
 * @param {string} id
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function deactivateProduct(id) {
  return Product.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { new: true },
  );
}

/**
 * Check whether a product exists by id.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
async function productExists(id) {
  return Boolean(await Product.exists({ _id: id }));
}

/**
 * Count products matching a filter.
 * @param {object} match
 * @returns {Promise<number>}
 */
async function countProducts(match) {
  return Product.countDocuments(match);
}

module.exports = {
  findProducts,
  findProductById,
  createProduct,
  updateProduct,
  deactivateProduct,
  productExists,
  countProducts,
};
