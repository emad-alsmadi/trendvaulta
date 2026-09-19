const asyncHandler = require('express-async-handler');
const { DEFAULT_TRUST_ITEMS } = require('./trust.controller');

/**
 * Homepage hero promo slides — aligned with DEMO_HERO_SLIDES on the website.
 * Uses ctaHref (storefront API convention); FE maps to href.
 */
const DEFAULT_HERO_SLIDES = [
  {
    id: 'hero-glow',
    eyebrow: 'Beauty edit',
    title: 'Soft-glow essentials for every routine',
    subtitle: 'Skincare and makeup picks with clear prices.',
    ctaLabel: 'Shop beauty',
    ctaHref: '/products?category=beauty',
    imageUrl: '/images/1.webp',
    tone: 'rose',
  },
  {
    id: 'hero-fashion',
    eyebrow: 'Fashion',
    title: 'Everyday pieces that feel elevated',
    subtitle: 'Layer-ready looks without the noise.',
    ctaLabel: 'Shop fashion',
    ctaHref: '/products?category=fashion',
    imageUrl: '/images/2.webp',
    tone: 'indigo',
  },
  {
    id: 'hero-offers',
    eyebrow: "Today's offers",
    title: 'Limited edits worth a second look',
    subtitle: 'Seasonal deals curated for TrendVaulta shoppers.',
    ctaLabel: 'See offers',
    ctaHref: '/offers',
    imageUrl: '/images/3.webp',
    tone: 'teal',
  },
  {
    id: 'hero-lifestyle',
    eyebrow: 'Lifestyle',
    title: 'Home & self-care that fits your pace',
    subtitle: 'Thoughtful details for calm, polished days.',
    ctaLabel: 'Explore lifestyle',
    ctaHref: '/products?category=lifestyle',
    imageUrl: '/images/4.webp',
    tone: 'stone',
  },
];

/**
 * Ordered homepage module layout + inline CMS content where applicable.
 * V1 static config — replace with StorefrontModule collection later.
 */
const DEFAULT_HOME_MODULES = [
  {
    key: 'hero',
    type: 'hero_carousel',
    active: true,
    sortOrder: 0,
    slides: DEFAULT_HERO_SLIDES,
  },
  {
    key: 'trust',
    type: 'trust_strip',
    active: true,
    sortOrder: 1,
    items: DEFAULT_TRUST_ITEMS,
  },
  {
    key: 'categories',
    type: 'popular_categories',
    active: true,
    sortOrder: 2,
  },
  {
    key: 'deals',
    type: 'deals_rail',
    active: true,
    sortOrder: 3,
    limit: 12,
  },
  {
    key: 'featured_products',
    type: 'featured_products',
    active: true,
    sortOrder: 4,
    limit: 8,
    sort: 'bestselling',
  },
  {
    key: 'featured_brands',
    type: 'featured_brands',
    active: true,
    sortOrder: 5,
    limit: 8,
  },
  {
    key: 'gift_finder',
    type: 'gift_finder',
    active: true,
    sortOrder: 6,
  },
  {
    key: 'recently_viewed',
    type: 'recently_viewed',
    active: true,
    sortOrder: 7,
  },
  {
    key: 'inspired',
    type: 'inspired_rail',
    active: true,
    sortOrder: 8,
  },
  {
    key: 'lookbook',
    type: 'lookbook',
    active: true,
    sortOrder: 9,
  },
  {
    key: 'why_choose_us',
    type: 'why_choose_us',
    active: true,
    sortOrder: 10,
  },
  {
    key: 'testimonials',
    type: 'testimonials',
    active: true,
    sortOrder: 11,
  },
  {
    key: 'cta',
    type: 'cta',
    active: true,
    sortOrder: 12,
  },
];

/**
 * Public homepage CMS/config — module order, visibility, and inline hero/trust content.
 *
 * @route GET /api/storefront/home
 * @access Public
 */
const getStorefrontHome = asyncHandler(async (_req, res) => {
  const modules = DEFAULT_HOME_MODULES
    .filter((mod) => mod.active !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  res.status(200).json({
    message: 'ok',
    modules,
  });
});

module.exports = {
  getStorefrontHome,
  DEFAULT_HOME_MODULES,
  DEFAULT_HERO_SLIDES,
};
