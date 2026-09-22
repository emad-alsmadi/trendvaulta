const Joi = require('joi');
const mongoose = require('mongoose');
const { normalizeTextSearchTerm, escapeRegex } = require('./search');

/**
 * Pure builders for `GET /api/products`: query validation, Mongo `$match`,
 * sort spec and the `$facet` pipeline behind `meta.facets`.
 * No DB access here so the module stays unit-testable.
 */

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const SORT_FIELD_RE = /^[a-zA-Z0-9_.]+$/;
const MAX_LIST_VALUES = 50;
const MAX_LIST_VALUE_LENGTH = 60;
const RATING_STEPS = [4, 3, 2, 1];

/** Named sort presets (new contract) — legacy `field,-field` strings still work. */
const SORT_PRESETS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  rating: { averageRating: -1, reviewCount: -1 },
  bestselling: { salesCount: -1, reviewCount: -1, createdAt: -1 },
  featured: { featured: -1, salesCount: -1, createdAt: -1 },
};

/** Only `stock > 0` on the product or on any variant counts as in stock. */
const IN_STOCK_CLAUSE = [{ stock: { $gt: 0 } }, { 'variants.stock': { $gt: 0 } }];
/** A product is on sale when a compare-at `basePrice` is above the sell price. */
const ON_SALE_EXPR = { $gt: ['$basePrice', '$price'] };

const listParam = Joi.alternatives().try(
  Joi.string().allow(''),
  Joi.array().items(Joi.string().allow('')),
);
const flagParam = Joi.alternatives().try(Joi.boolean(), Joi.string().allow(''));

const listQuerySchema = Joi.object({
  q: Joi.string().allow(''),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  minRating: Joi.number().min(0).max(5),
  category: Joi.string().allow(''),
  subcategory: Joi.string().allow(''),
  brand: listParam,
  size: listParam,
  color: listParam,
  inStock: flagParam,
  onSale: flagParam,
  featured: flagParam,
  facets: flagParam,
  includeInactive: flagParam,
  isActive: flagParam,
  sort: Joi.string().allow(''),
  page: Joi.any(),
  limit: Joi.any(),
}).unknown(true);

/**
 * Validate + coerce the list query. Empty strings are treated as "absent" so
 * `?minPrice=&maxPrice=` never 400s; malformed numbers do.
 * @param {object} query - `req.query`
 * @returns {{ value: object, error?: string }}
 */
function validateProductListQuery(query = {}) {
  const cleaned = {};
  Object.entries(query || {}).forEach(([key, val]) => {
    if (val === '' || val === undefined || val === null) return;
    cleaned[key] = val;
  });
  const { error, value } = listQuerySchema.validate(cleaned, {
    abortEarly: true,
    convert: true,
  });
  if (error) {
    const detail = error.details[0];
    const key = detail.path?.[0] || 'query';
    return { value: cleaned, error: `Invalid ${key}: ${detail.message}` };
  }
  return { value };
}

/** `'a,b'`, `['a','b']` or `['a,b']` → `['a', 'b']` (trimmed, unique, bounded). */
function toList(value) {
  if (value === undefined || value === null) return [];
  const raw = Array.isArray(value) ? value : [value];
  const out = [];
  raw.forEach((entry) => {
    String(entry)
      .split(',')
      .map((v) => v.trim().slice(0, MAX_LIST_VALUE_LENGTH))
      .filter(Boolean)
      .forEach((v) => {
        if (!out.includes(v)) out.push(v);
      });
  });
  return out.slice(0, MAX_LIST_VALUES);
}

function isTruthyFlag(value) {
  return value === true || value === 'true' || value === '1';
}

/**
 * Build the Mongo match for the product list.
 * @param {object} query - validated query (see validateProductListQuery)
 * @param {{ isStaff?: boolean, withFacetFilters?: boolean }} [options]
 *   `withFacetFilters: false` yields the base match used for facet counts
 *   (category / subcategory / q / active / price only).
 */
function buildProductMatch(query = {}, options = {}) {
  const { isStaff = false, withFacetFilters = true } = options;
  const match = {};
  const andClauses = [];

  if (isStaff && isTruthyFlag(query.includeInactive)) {
    if (query.isActive === true || query.isActive === 'true') match.isActive = true;
    if (query.isActive === false || query.isActive === 'false') match.isActive = false;
  } else {
    match.isActive = true;
  }

  const minPrice = Number(query.minPrice);
  const maxPrice = Number(query.maxPrice);
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    match.price = {};
    if (Number.isFinite(minPrice)) match.price.$gte = minPrice;
    if (Number.isFinite(maxPrice)) match.price.$lte = maxPrice;
  }

  if (query.category) match.category = String(query.category);
  if (query.subcategory) match.subcategory = String(query.subcategory);
  if (isTruthyFlag(query.featured)) match.featured = true;

  // $text must be a standalone top-level key: MongoDB allows at most one
  // per query and it cannot be nested inside $or/$and like the other
  // OR-groups below, so it does not go through `andClauses`.
  const searchTerm = normalizeTextSearchTerm(query.q);
  if (searchTerm) {
    match.$text = { $search: searchTerm };
  }

  if (withFacetFilters) {
    const brandIds = toList(query.brand).filter((id) => OBJECT_ID_RE.test(id));
    if (brandIds.length === 1) {
      match.brand = new mongoose.Types.ObjectId(brandIds[0]);
    } else if (brandIds.length > 1) {
      match.brand = { $in: brandIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }

    const sizes = toList(query.size);
    if (sizes.length) match['variants.size'] = { $in: sizes };

    const colors = toList(query.color);
    if (colors.length) {
      match['variants.color'] = {
        $in: colors.map((c) => new RegExp(`^${escapeRegex(c)}$`, 'i')),
      };
    }

    const minRating = Number(query.minRating);
    if (Number.isFinite(minRating) && minRating > 0) {
      match.averageRating = { $gte: minRating };
    }

    if (isTruthyFlag(query.inStock)) andClauses.push(IN_STOCK_CLAUSE);
    if (isTruthyFlag(query.onSale)) match.$expr = ON_SALE_EXPR;
  }

  // Only inStock ever pushes onto andClauses now that $text is a top-level
  // key, so this is a single OR-group, not a list to $and together.
  if (andClauses.length === 1) {
    match.$or = andClauses[0];
  }

  return match;
}

/**
 * Build the sort spec. Accepts a preset (`newest`, `price_asc`, `price_desc`,
 * `rating`, `bestselling`, `featured`) or the legacy comma list of fields
 * with a `-` prefix for desc (`-price`, `createdAt,-averageRating`).
 * @param {string} [sort]
 * @returns {Record<string, 1|-1>}
 */
function buildProductSort(sort = 'createdAt') {
  const raw = String(sort || 'createdAt').trim();
  if (SORT_PRESETS[raw]) return { ...SORT_PRESETS[raw] };

  const sortObj = {};
  raw
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean)
    .forEach((field) => {
      const direction = field.startsWith('-') ? -1 : 1;
      const fieldName = field.replace(/^-/, '');
      if (fieldName === 'bestselling') {
        sortObj.salesCount = -1;
        return;
      }
      if (SORT_FIELD_RE.test(fieldName)) sortObj[fieldName] = direction;
    });

  return Object.keys(sortObj).length ? sortObj : { createdAt: 1 };
}

/**
 * Aggregation pipeline computing disjunctive facet counts over `baseMatch`.
 * @param {object} baseMatch - output of buildProductMatch(..., { withFacetFilters: false })
 * @returns {object[]}
 */
function buildFacetPipeline(baseMatch = {}) {
  const countBy = (field) => [
    { $match: { [field]: { $nin: [null, ''] } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $project: { _id: 0, value: '$_id', count: 1 } },
    { $sort: { value: 1 } },
  ];

  return [
    { $match: baseMatch },
    {
      $facet: {
        brands: [
          { $match: { brand: { $ne: null } } },
          { $group: { _id: '$brand', count: { $sum: 1 } } },
          {
            $lookup: {
              from: 'brands',
              localField: '_id',
              foreignField: '_id',
              as: 'brand',
            },
          },
          { $unwind: '$brand' },
          {
            $project: {
              _id: 1,
              name: '$brand.name',
              slug: '$brand.slug',
              count: 1,
            },
          },
          { $sort: { count: -1, name: 1 } },
        ],
        sizes: [
          { $unwind: '$variants' },
          { $match: { 'variants.size': { $nin: [null, ''] } } },
          { $group: { _id: { product: '$_id', value: '$variants.size' } } },
          { $group: { _id: '$_id.value', count: { $sum: 1 } } },
          { $project: { _id: 0, value: '$_id', count: 1 } },
          { $sort: { value: 1 } },
        ],
        colors: [
          { $unwind: '$variants' },
          { $match: { 'variants.color': { $nin: [null, ''] } } },
          {
            $group: {
              _id: { product: '$_id', key: { $toLower: '$variants.color' } },
              value: { $first: '$variants.color' },
              colorCode: { $first: '$variants.colorCode' },
            },
          },
          {
            $group: {
              _id: '$_id.key',
              value: { $first: '$value' },
              colorCode: { $first: '$colorCode' },
              count: { $sum: 1 },
            },
          },
          { $project: { _id: 0, value: 1, colorCode: 1, count: 1 } },
          { $sort: { value: 1 } },
        ],
        categories: countBy('category'),
        subcategories: countBy('subcategory'),
        priceRange: [
          { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
          { $project: { _id: 0, min: 1, max: 1 } },
        ],
        ratings: [
          {
            $group: {
              _id: null,
              ...Object.fromEntries(
                RATING_STEPS.map((step) => [
                  `r${step}`,
                  { $sum: { $cond: [{ $gte: ['$averageRating', step] }, 1, 0] } },
                ]),
              ),
            },
          },
        ],
        inStock: [{ $match: { $or: IN_STOCK_CLAUSE } }, { $count: 'count' }],
        onSale: [{ $match: { $expr: ON_SALE_EXPR } }, { $count: 'count' }],
      },
    },
  ];
}

/**
 * Shape the raw `$facet` output into the public `meta.facets` contract.
 * @param {object} [raw] - first document from the facet aggregation
 */
function normalizeFacets(raw = {}) {
  const ratingsDoc = raw.ratings?.[0] || {};
  const priceDoc = raw.priceRange?.[0] || {};
  return {
    brands: (raw.brands || []).map((b) => ({
      _id: String(b._id),
      name: b.name,
      slug: b.slug,
      count: b.count || 0,
    })),
    sizes: raw.sizes || [],
    colors: (raw.colors || []).map((c) => ({
      value: c.value,
      colorCode: c.colorCode || null,
      count: c.count || 0,
    })),
    categories: raw.categories || [],
    subcategories: raw.subcategories || [],
    priceRange: {
      min: typeof priceDoc.min === 'number' ? priceDoc.min : 0,
      max: typeof priceDoc.max === 'number' ? priceDoc.max : 0,
    },
    ratings: RATING_STEPS.map((step) => ({
      value: step,
      count: ratingsDoc[`r${step}`] || 0,
    })),
    inStock: raw.inStock?.[0]?.count || 0,
    onSale: raw.onSale?.[0]?.count || 0,
  };
}

module.exports = {
  SORT_PRESETS,
  validateProductListQuery,
  toList,
  isTruthyFlag,
  buildProductMatch,
  buildProductSort,
  buildFacetPipeline,
  normalizeFacets,
};
