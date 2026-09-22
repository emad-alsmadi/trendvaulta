const asyncHandler = require('express-async-handler');
const {
  Product,
  validateCreateProduct,
  validateUpdateProduct,
  resolveProductBadges,
} = require('../models/Product');
const { parsePagination } = require('../utils/pagination');
const {
  validateProductListQuery,
  isTruthyFlag,
  buildProductMatch,
  buildProductSort,
  buildFacetPipeline,
  normalizeFacets,
} = require('../utils/productQuery');

/**
 * Get all products with filtering, sorting, facets and pagination.
 *
 * Supported query params (all optional, combinable):
 * - q: search term in title/description
 * - minPrice/maxPrice: price range
 * - category / subcategory
 * - brand: brand id — single, comma-separated or repeated (`?brand=a&brand=b`)
 * - size / color: variant facets — comma-separated or repeated
 *   (color matches `variants.color` case-insensitively)
 * - minRating: 0–5 → averageRating >= value
 * - inStock: `true` → stock > 0 on the product or any variant
 * - onSale: `true` → basePrice > price
 * - page/limit: pagination
 * - sort: preset `newest` | `price_asc` | `price_desc` | `rating` |
 *   `bestselling` | `featured`, or legacy comma-separated fields with a
 *   `-` prefix for desc (`-price`, `createdAt`)
 * - featured: show only featured products (`true`)
 * - facets: `true` → adds `meta.facets` (disjunctive counts over the base
 *   match: category/subcategory/q/active/price, without brand/size/color/
 *   rating/stock/sale filters)
 * - includeInactive: admin/moderator only — include inactive products
 * - isActive: admin/moderator only — filter by active flag (true|false)
 *
 * Product payloads include `badges`: curated + computed
 * (`bestseller` from featured/salesCount, `lowStock`, `new`).
 *
 * Malformed numeric params return 400; unknown facet values are ignored.
 *
 * @route GET /api/products
 * @access Public (staff filters require Bearer token)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON containing data and meta (+ meta.facets)
 */
const getAllProducts = asyncHandler(async (req, res) => {
  const { value: query, error } = validateProductListQuery(req.query);
  if (error) {
    return res.status(400).json({ message: error });
  }

  const isStaff =
    Array.isArray(req.user?.roles) &&
    req.user.roles.some((r) => r === 'admin' || r === 'moderator');

  const match = buildProductMatch(query, { isStaff });
  const sortObj = buildProductSort(query.sort);
  const wantFacets = isTruthyFlag(query.facets);

  const {
    page: pageNum,
    limit: limitNum,
    skip,
  } = parsePagination(
    { page: query.page, limit: query.limit },
    { defaultLimit: 12, maxLimit: 100 },
  );

  const [products, total, facetRows] = await Promise.all([
    Product.find(match)
      .populate('brand', ['name', 'slug', 'logo'])
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments(match),
    wantFacets
      ? Product.aggregate(
          buildFacetPipeline(
            buildProductMatch(query, { isStaff, withFacetFilters: false }),
          ),
        )
      : Promise.resolve(null),
  ]);

  const pages = Math.ceil(total / limitNum);
  const data = products.map((product) => ({
    ...product,
    badges: resolveProductBadges(product),
  }));

  const meta = {
    total,
    page: pageNum,
    pages,
    limit: limitNum,
  };
  if (wantFacets) {
    meta.facets = normalizeFacets(facetRows?.[0]);
  }

  res.status(200).json({ data, meta });
});

/**
 * Get a single product by id.
 *
 * @route GET /api/products/:id
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON product document
 */
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('brand', [
    'name',
    'slug',
    'logo',
    'website',
    'country',
  ]);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const isStaff =
    Array.isArray(req.user?.roles) &&
    req.user.roles.some((r) => r === 'admin' || r === 'moderator');
  if (product.isActive === false && !isStaff) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const payload = product.toObject();
  payload.badges = resolveProductBadges(payload);
  res.status(200).json(payload);
});

/**
 * Create a new product.
 *
 * @route POST /api/products
 * @access Private (requires products:write permission)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON created product document
 */
const createProduct = asyncHandler(async (req, res) => {
  const error = validateCreateProduct(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const product = new Product({
    title: req.body.title,
    brand: req.body.brand,
    description: req.body.description,
    price: req.body.price,
    cover: req.body.cover,
    images: req.body.images || [],
    category: req.body.category,
    subcategory: req.body.subcategory,
    variants: req.body.variants || [],
    material: req.body.material,
    weight: req.body.weight,
    dimensions: req.body.dimensions,
    shippingInfo: req.body.shippingInfo,
    stock: req.body.stock || 0,
    sku: req.body.sku,
    isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    featured: req.body.featured || false,
    salesCount: req.body.salesCount || 0,
    badges: req.body.badges || [],
  });

  const result = await product.save();
  const lean = result.toObject ? result.toObject() : result;
  res.status(201).json({
    ...lean,
    badges: resolveProductBadges(lean),
  });
});

/**
 * Update a product by id.
 *
 * @route PUT /api/products/:id
 * @access Private (requires products:write permission)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON updated product document
 */
const updateProduct = asyncHandler(async (req, res) => {
  const error = validateUpdateProduct(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const updateData = {};
  const allowedFields = [
    'title', 'brand', 'description', 'price', 'cover', 'images',
    'category', 'subcategory', 'variants', 'material', 'weight',
    'dimensions', 'shippingInfo', 'stock', 'sku', 'averageRating',
    'reviewCount', 'isActive', 'featured', 'salesCount', 'badges',
  ];
  
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true },
  );

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const lean = product.toObject ? product.toObject() : product;
  res.status(200).json({
    ...lean,
    badges: resolveProductBadges(lean),
  });
});

/**
 * Delete a product by id.
 *
 * @route DELETE /api/products/:id
 * @access Private (requires products:delete permission)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON confirmation message
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.status(200).json({ message: 'Product has been deleted' });
});

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
