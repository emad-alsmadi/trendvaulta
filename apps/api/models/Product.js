const mongoose = require('mongoose');
const {
  validateCreateProduct,
  validateUpdateProduct,
} = require('../validators/product.validator');

const MERCHANDISING_BADGES = ['bestseller', 'new', 'lowStock'];
const LOW_STOCK_THRESHOLD = 5;
const NEW_PRODUCT_DAYS = 30;
/** Auto-apply bestseller when units sold reach this threshold (curated badge still wins). */
const BESTSELLER_SALES_THRESHOLD = 10;

/**
 * Merge curated badges with computed merchandising signals.
 * @param {object} product - lean product or plain object
 * @returns {Array<'bestseller'|'new'|'lowStock'>}
 */
const resolveProductBadges = (product) => {
  const badges = new Set(
    Array.isArray(product?.badges)
      ? product.badges.filter((b) => MERCHANDISING_BADGES.includes(b))
      : [],
  );

  const salesCount = Number(product?.salesCount) || 0;
  if (product?.featured === true || salesCount >= BESTSELLER_SALES_THRESHOLD) {
    badges.add('bestseller');
  }

  // Checkout sells a variant product from its variants' stock, not the
  // product-level field, so a variant product needs the badge as soon as
  // any one option runs low — matching the admin low-stock list's
  // $elemMatch definition (adminStats.controller.js) — not only when the
  // (often-unused) top-level stock happens to be low.
  const hasVariants = Array.isArray(product?.variants) && product.variants.length > 0;
  const stock = Number(product?.stock) || 0;
  const lowStockTrigger = hasVariants
    ? product.variants.some((v) => {
        const vStock = Number(v?.stock) || 0;
        return vStock > 0 && vStock <= LOW_STOCK_THRESHOLD;
      })
    : stock > 0 && stock <= LOW_STOCK_THRESHOLD;
  if (lowStockTrigger) {
    badges.add('lowStock');
  }

  if (product?.createdAt) {
    const ageMs = Date.now() - new Date(product.createdAt).getTime();
    if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000) {
      badges.add('new');
    }
  }

  return Array.from(badges);
};

const ProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 2000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
      default: function () {
        return this.price;
      },
    },
    cover: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 500,
    },
    images: [{
      type: String,
      trim: true,
    }],
    category: {
      type: String,
      required: true,
      enum: ['makeup', 'perfumes', 'clothing', 'skincare', 'accessories', 'home'],
    },
    subcategory: {
      type: String,
      required: true,
      trim: true,
    },
    variants: [{
      size: {
        type: String,
        trim: true,
      },
      color: {
        type: String,
        trim: true,
      },
      colorCode: {
        type: String,
        trim: true,
      },
      stock: {
        type: Number,
        min: 0,
        default: 0,
      },
      price: {
        type: Number,
        min: 0,
      },
      sku: {
        type: String,
        trim: true,
      },
    }],
    material: {
      type: String,
      trim: true,
    },
    weight: {
      type: Number,
      min: 0,
    },
    dimensions: {
      length: {
        type: Number,
        min: 0,
      },
      width: {
        type: Number,
        min: 0,
      },
      height: {
        type: Number,
        min: 0,
      },
    },
    shippingInfo: {
      weight: {
        type: Number,
        min: 0,
      },
      dimensions: {
        length: {
          type: Number,
          min: 0,
        },
        width: {
          type: Number,
          min: 0,
        },
        height: {
          type: Number,
          min: 0,
        },
      },
      requiresSpecialHandling: {
        type: Boolean,
        default: false,
      },
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    /** Units sold — used for sort=bestselling */
    salesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Curated merchandising badges; lowStock/new may also be computed at read time */
    badges: [{
      type: String,
      enum: MERCHANDISING_BADGES,
    }],
  },
  {
    timestamps: true,
    collection: 'products',
  },
);

ProductSchema.index({ salesCount: -1, reviewCount: -1, createdAt: -1 });
ProductSchema.index({ featured: 1, isActive: 1 });
ProductSchema.index({ isActive: 1, category: 1, price: 1 });
ProductSchema.index({ isActive: 1, brand: 1 });
ProductSchema.index({ isActive: 1, createdAt: -1 });
// Sitemap shards page through active products in _id order
ProductSchema.index({ isActive: 1, _id: 1 });
// Full-text search index (replaces $regex scans)
ProductSchema.index(
  { title: 'text', description: 'text', subcategory: 'text' },
  { weights: { title: 10, description: 5, subcategory: 2 }, name: 'ProductTextIndex' },
);
// Facet filters / sorts (GET /api/products)
ProductSchema.index({ 'variants.size': 1 });
ProductSchema.index({ 'variants.color': 1 });
ProductSchema.index({ averageRating: -1, reviewCount: -1 });

const Product = mongoose.model('Product', ProductSchema);

module.exports = {
  Product,
  validateCreateProduct,
  validateUpdateProduct,
  resolveProductBadges,
  MERCHANDISING_BADGES,
  BESTSELLER_SALES_THRESHOLD,
  LOW_STOCK_THRESHOLD,
  NEW_PRODUCT_DAYS,
};
