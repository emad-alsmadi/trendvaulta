const asyncHandler = require('express-async-handler');
const {
  Product,
  validateCreateProduct,
  validateUpdateProduct,
  resolveProductBadges,
} = require('../models/Product');
const { parsePagination } = require('../utils/pagination');

/**
 * Get all products with filtering, sorting and pagination.
 *
 * Supported query params:
 * - q: search term in title/description
 * - minPrice/maxPrice: price range
 * - category: product category
 * - subcategory: product subcategory
 * - brand: brand id
 * - page/limit: pagination
 * - sort: comma-separated fields, prefix with '-' for desc;
 *   use `bestselling` for salesCount desc (then reviewCount, createdAt)
 * - featured: show only featured products (`true`)
 * - includeInactive: admin/moderator only — include inactive products
 * - isActive: admin/moderator only — filter by active flag (true|false)
 *
 * Product payloads include `badges`: curated + computed
 * (`bestseller` from featured/salesCount, `lowStock`, `new`).
 *
 * @route GET /api/products
 * @access Public (staff filters require Bearer token)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON containing data and meta
 */
const getAllProducts = asyncHandler(async (req, res) => {
  const {
    q,
    minPrice,
    maxPrice,
    category,
    subcategory,
    brand,
    page = 1,
    limit = 12,
    sort = 'createdAt',
    featured,
    includeInactive,
    isActive,
  } = req.query;

  const isStaff =
    Array.isArray(req.user?.roles) &&
    req.user.roles.some((r) => r === 'admin' || r === 'moderator');

  const query = {};
  if (isStaff && (includeInactive === 'true' || includeInactive === '1')) {
    if (isActive === 'true' || isActive === 'false') {
      query.isActive = isActive === 'true';
    }
  } else {
    query.isActive = true;
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }
  
  if (category) {
    query.category = category;
  }
  
  if (subcategory) {
    query.subcategory = subcategory;
  }
  
  if (brand) {
    query.brand = brand;
  }
  
  if (featured === 'true') {
    query.featured = true;
  }
  
  if (q) {
    query.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ];
  }

  const sortObj = {};
  const sortFields = String(sort).split(',').map((f) => f.trim()).filter(Boolean);
  if (sortFields.length === 1 && sortFields[0] === 'bestselling') {
    sortObj.salesCount = -1;
    sortObj.reviewCount = -1;
    sortObj.createdAt = -1;
  } else {
    sortFields.forEach((field) => {
      const direction = field.startsWith('-') ? -1 : 1;
      const fieldName = field.replace(/^-/, '');
      if (fieldName === 'bestselling') {
        sortObj.salesCount = -1;
        return;
      }
      sortObj[fieldName] = direction;
    });
  }

  const {
    page: pageNum,
    limit: limitNum,
    skip,
  } = parsePagination({ page, limit }, { defaultLimit: 12, maxLimit: 100 });

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('brand', ['name', 'slug', 'logo'])
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments(query),
  ]);

  const pages = Math.ceil(total / limitNum);
  const data = products.map((product) => ({
    ...product,
    badges: resolveProductBadges(product),
  }));

  res.status(200).json({
    data,
    meta: {
      total,
      page: pageNum,
      pages,
      limit: limitNum,
    },
  });
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
