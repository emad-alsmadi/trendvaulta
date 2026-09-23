const mongoose = require('mongoose');
const { Product } = require('./Product');

/**
 * Top-level categories are the Product.category enum — read from the schema
 * so there is no second list to drift. Admins manage their presentation
 * (name, image, order, visibility) and the subcategories under them, but
 * cannot add or remove top-level slugs: products, storefront URLs and the
 * product validators are all keyed on this fixed set.
 */
const TOP_LEVEL_SLUGS = Product.schema.path('category').enumValues;

/** Same shape the storefront accepts in /[category]/[subcategory] URLs. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CategorySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 64,
      match: SLUG_PATTERN,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    // Slug of the top-level category, or null for a top-level one. A slug
    // rather than an ObjectId because products store category/subcategory
    // as slugs too, so the two join without a lookup.
    parent: {
      type: String,
      default: null,
      enum: [...TOP_LEVEL_SLUGS, null],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, collection: 'categories' },
);

// Unique per parent, not globally: "accessories" is both a top-level
// category and a clothing subcategory.
CategorySchema.index({ parent: 1, slug: 1 }, { unique: true });
CategorySchema.index({ parent: 1, sortOrder: 1 });

const Category = mongoose.model('Category', CategorySchema);

/** 'setting-spray' → 'Setting Spray' */
function slugToName(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * First-run content, mirroring what the storefront hard-codes today
 * (apps/website/src/lib/categories.ts), so creating the collection changes
 * nothing visible until an admin edits it.
 */
const DEFAULT_CATEGORIES = [
  {
    slug: 'makeup',
    name: 'Makeup',
    imageUrl: '/images/1.webp',
    description:
      'Foundations, lipsticks, eyeshadows and everyday essentials from world-renowned beauty brands.',
    children: ['foundation', 'lipstick', 'eyeshadow', 'mascara', 'blush', 'concealer', 'primer', 'setting-spray'],
  },
  {
    slug: 'perfumes',
    name: 'Perfumes',
    imageUrl: '/images/2.webp',
    description:
      'Signature fragrances, body mists and gift sets — find a scent that feels like you.',
    children: ['eau-de-parfum', 'eau-de-toilette', 'body-mist', 'gift-sets', 'cologne', 'roll-on'],
  },
  {
    slug: 'clothing',
    name: 'Clothing',
    imageUrl: '/images/3.webp',
    description:
      'Dresses, tops, jackets and activewear — wardrobe staples and seasonal edits.',
    children: ['dresses', 'tops', 'pants', 'jackets', 'accessories', 'sweaters', 'skirts', 'activewear'],
  },
  {
    slug: 'skincare',
    name: 'Skincare',
    imageUrl: '/images/4.webp',
    description:
      'Cleansers, serums, moisturizers and SPF for every skin type and ritual.',
    children: ['cleanser', 'moisturizer', 'serum', 'sunscreen', 'masks', 'toner', 'exfoliator', 'eye-cream'],
  },
  {
    slug: 'accessories',
    name: 'Accessories',
    imageUrl: '/images/1.webp',
    description: 'Jewelry, bags, watches and sunglasses to finish every look.',
    children: ['jewelry', 'bags', 'scarves', 'belts', 'watches', 'sunglasses', 'hats', 'wallets'],
  },
  {
    slug: 'home',
    name: 'Home & Living',
    imageUrl: '/images/2.webp',
    description:
      'Decor, bedding, lighting and kitchen pieces that make a house feel like home.',
    children: ['decor', 'kitchen', 'bedding', 'lighting', 'furniture', 'rugs', 'curtains', 'organization'],
  },
];

/**
 * Make sure every top-level category exists. Idempotent; the common case is
 * a single indexed count. (Not memoised per process: a database emptied under
 * a running server — tests, a restore — must be re-seeded.)
 *
 * Default subcategories are inserted only together with a *newly created*
 * top-level category — so a subcategory an admin deletes is not quietly
 * restored on the next call.
 */
async function ensureDefaultCategories() {
  const existing = await Category.countDocuments({ parent: null });
  if (existing >= TOP_LEVEL_SLUGS.length) return;

  for (const [index, slug] of TOP_LEVEL_SLUGS.entries()) {
    const def = DEFAULT_CATEGORIES.find((d) => d.slug === slug) || {
      slug,
      name: slugToName(slug),
      children: [],
    };
    const result = await Category.updateOne(
      { parent: null, slug },
      {
        $setOnInsert: {
          slug,
          parent: null,
          name: def.name,
          description: def.description || '',
          imageUrl: def.imageUrl || '',
          sortOrder: index,
          isActive: true,
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount === 1 && def.children.length) {
      await Category.insertMany(
        def.children.map((child, i) => ({
          slug: child,
          parent: slug,
          name: slugToName(child),
          sortOrder: i,
        })),
        { ordered: false },
      ).catch((err) => {
        // Duplicates mean a concurrent request seeded them first — fine.
        const dupOnly =
          err?.code === 11000 ||
          (Array.isArray(err?.writeErrors) &&
            err.writeErrors.every((e) => e.code === 11000));
        if (!dupOnly) throw err;
      });
    }
  }
}

module.exports = {
  Category,
  TOP_LEVEL_SLUGS,
  SLUG_PATTERN,
  ensureDefaultCategories,
};
