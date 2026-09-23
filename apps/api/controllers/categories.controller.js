const asyncHandler = require('express-async-handler');
const { Product } = require('../models/Product');
const { Category, ensureDefaultCategories } = require('../models/Category');

/**
 * Known Product.category enum values with storefront labels.
 * Used as stub when distinct aggregation is empty / unavailable.
 */
const KNOWN_CATEGORIES = [
  {
    id: 'makeup',
    label: 'Makeup',
    href: '/products?category=makeup',
    imageUrl: '/images/1.webp',
  },
  {
    id: 'perfumes',
    label: 'Perfumes',
    href: '/products?category=perfumes',
    imageUrl: '/images/2.webp',
  },
  {
    id: 'clothing',
    label: 'Clothing',
    href: '/products?category=clothing',
    imageUrl: '/images/3.webp',
  },
  {
    id: 'skincare',
    label: 'Skincare',
    href: '/products?category=skincare',
    imageUrl: '/images/4.webp',
  },
  {
    id: 'accessories',
    label: 'Accessories',
    href: '/products?category=accessories',
    imageUrl: '/images/1.webp',
  },
  {
    id: 'home',
    label: 'Home',
    href: '/products?category=home',
    imageUrl: '/images/2.webp',
  },
];

const KNOWN_BY_ID = new Map(KNOWN_CATEGORIES.map((c) => [c.id, c]));

function toCategoryResult(id) {
  const known = KNOWN_BY_ID.get(id);
  if (known) return known;
  return {
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    href: `/products?category=${encodeURIComponent(id)}`,
  };
}

/**
 * Public storefront category shortcuts for homepage tiles.
 *
 * Reads the admin-managed Category collection: hidden categories are left
 * out, order follows sortOrder, and each tile carries its visible
 * subcategories. Categories with no active products are skipped (as before),
 * unless that would leave nothing to show. Any failure falls back to the
 * static list so the homepage never loses its tiles.
 *
 * Response shape is additive over the old one — `id`, `label`, `href` are
 * unchanged; `imageUrl`, `description`, `subcategories` are new.
 *
 * @route GET /api/storefront/categories
 * @access Public
 */
const getStorefrontCategories = asyncHandler(async (_req, res) => {
  let results = KNOWN_CATEGORIES;

  try {
    await ensureDefaultCategories();
    const [categories, withProducts] = await Promise.all([
      Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
      Product.distinct('category', { isActive: true }),
    ]);

    const childrenOf = new Map();
    for (const c of categories) {
      if (!c.parent) continue;
      if (!childrenOf.has(c.parent)) childrenOf.set(c.parent, []);
      childrenOf.get(c.parent).push({ slug: c.slug, name: c.name });
    }

    const top = categories.filter((c) => !c.parent);
    const stocked = top.filter((c) => withProducts.includes(c.slug));
    const shown = stocked.length > 0 ? stocked : top;

    if (shown.length > 0) {
      results = shown.map((c) => ({
        id: c.slug,
        label: c.name,
        href: `/products?category=${encodeURIComponent(c.slug)}`,
        imageUrl: c.imageUrl || toCategoryResult(c.slug).imageUrl,
        description: c.description,
        subcategories: childrenOf.get(c.slug) || [],
      }));
    }
  } catch {
    // keep the static list
  }

  res.status(200).json({
    message: 'ok',
    results,
  });
});

/**
 * Admin: every category, top-level and sub, flat and in display order, each
 * with the number of products filed under it (so the UI can explain why a
 * subcategory cannot be deleted). Not paginated: a small, curated set that
 * is arranged by sortOrder, like the other storefront content lists.
 *
 * @route GET /api/categories/admin
 * @access Private (products:read)
 */
const getAdminCategories = asyncHandler(async (_req, res) => {
  await ensureDefaultCategories();
  const [categories, counts] = await Promise.all([
    Category.find().sort({ parent: 1, sortOrder: 1, name: 1 }).lean(),
    Product.aggregate([
      {
        $group: {
          _id: { category: '$category', subcategory: '$subcategory' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const byCategory = new Map();
  const bySub = new Map();
  for (const { _id, count } of counts) {
    byCategory.set(_id.category, (byCategory.get(_id.category) || 0) + count);
    bySub.set(`${_id.category}|${_id.subcategory}`, count);
  }

  res.status(200).json({
    message: 'ok',
    data: categories.map((c) => ({
      ...c,
      productCount: c.parent
        ? bySub.get(`${c.parent}|${c.slug}`) || 0
        : byCategory.get(c.slug) || 0,
    })),
  });
});

/**
 * Admin: create a subcategory (body validated by createCategorySchema).
 * A slug already used under the same parent is a duplicate key → 409.
 *
 * @route POST /api/categories
 * @access Private (products:write)
 */
const createCategory = asyncHandler(async (req, res) => {
  await ensureDefaultCategories();
  const category = await Category.create(req.body);
  res.status(201).json({ message: 'Category created', data: category });
});

/**
 * Admin: update presentation fields (name, description, image, order,
 * visibility). Slug and parent are immutable — see category.validator.js.
 *
 * @route PUT /api/categories/:id
 * @access Private (products:write)
 */
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true },
  );
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }
  res.status(200).json({ message: 'Category updated', data: category });
});

/**
 * Admin: delete a subcategory that no product uses. Top-level categories
 * cannot be deleted (hide them instead), and a subcategory still in use is
 * refused rather than leaving products filed under a value that no longer
 * exists.
 *
 * @route DELETE /api/categories/:id
 * @access Private (products:delete)
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }
  if (!category.parent) {
    return res.status(400).json({
      message: 'Top-level categories cannot be deleted. Hide it instead.',
    });
  }
  const inUse = await Product.countDocuments({
    category: category.parent,
    subcategory: category.slug,
  });
  if (inUse > 0) {
    return res.status(409).json({
      message: `${inUse} product${inUse === 1 ? ' uses' : 's use'} this subcategory. Move them first, or hide it instead.`,
    });
  }
  await category.deleteOne();
  res.status(200).json({ message: 'Category deleted' });
});

module.exports = {
  getStorefrontCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  KNOWN_CATEGORIES,
};
