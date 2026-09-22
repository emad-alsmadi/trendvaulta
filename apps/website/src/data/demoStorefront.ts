/**
 * DEMO / MOCK storefront merchandising data.
 * Easy to replace with API hooks later (see docs/STOREFRONT_BACKEND_BACKLOG.md).
 *
 * TODO(api): GET /api/storefront/home ✓ (layout + hero/trust inline)
 * TODO(api): GET /api/offers
 * TODO(api): GET /api/brands?featured=true
 * TODO(api): GET /api/storefront/lookbooks
 * TODO(api): GET /api/products/:id/bundles
 * TODO(api): GET /api/storefront/help
 * TODO(api): GET /api/storefront/hero
 * TODO(api): GET /api/products/:id/qa
 */

export type DemoBadge = 'bestseller' | 'lowStock' | 'new';

export type DemoTrustItem = {
  id: string;
  icon: 'truck' | 'refresh' | 'shield' | 'headset';
  title: string;
  description: string;
};

export type DemoDeal = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  /** Local placeholder assets only — not scraped from third parties */
  imageUrl: string;
};

export type DemoBrand = {
  id: string;
  name: string;
  tagline: string;
  href: string;
  accent: string;
};

export type DemoCategoryShortcut = {
  name: string;
  countLabel: string;
  href: string;
  accent: string;
  icon:
    | 'sparkles'
    | 'shirt'
    | 'heart'
    | 'watch'
    | 'home'
    | 'gift'
    | 'sun'
    | 'bag';
};

export type DemoLookbookStory = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
  /** Local placeholder assets only — not scraped from third parties */
  imageUrl: string;
  tone: 'rose' | 'stone' | 'teal';
};

export type DemoGiftOption = {
  id: string;
  label: string;
  /** Search / filter hints used to build /products URL */
  q?: string;
  category?: string;
  maxPrice?: number;
  minPrice?: number;
};

export type DemoGiftFinderConfig = {
  occasions: DemoGiftOption[];
  recipients: DemoGiftOption[];
  budgets: DemoGiftOption[];
};

export type DemoHelpTopic = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: 'truck' | 'refresh' | 'package' | 'shield' | 'gift' | 'headset' | 'user' | 'tag';
};

/** DEMO deliver-to regions — expectation messaging only (no geo/shipping engine) */
export type DemoDeliverRegion = {
  id: string;
  label: string;
  hint: string;
};

export const DEMO_DELIVER_REGIONS: DemoDeliverRegion[] = [
  {
    id: 'us',
    label: 'United States',
    hint: 'Standard & express options at checkout',
  },
  {
    id: 'gb',
    label: 'United Kingdom',
    hint: 'Tracked delivery on eligible orders',
  },
  {
    id: 'ae',
    label: 'United Arab Emirates',
    hint: 'Regional shipping estimates at checkout',
  },
  {
    id: 'sa',
    label: 'Saudi Arabia',
    hint: 'Delivery windows vary by city',
  },
  {
    id: 'lb',
    label: 'Lebanon',
    hint: 'Local delivery when selected at checkout',
  },
  {
    id: 'ch',
    label: 'Switzerland',
    hint: 'International shipping notes may apply',
  },
];

export const DEMO_DEFAULT_DELIVER_REGION_ID = 'us';

/** DEMO homepage hero promo slides — replace with CMS / GET /api/storefront/hero */
export type DemoHeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  href: string;
  imageUrl: string;
  tone: 'rose' | 'stone' | 'teal' | 'indigo';
};

export const DEMO_HERO_SLIDES: DemoHeroSlide[] = [
  {
    id: 'hero-glow',
    eyebrow: 'Beauty edit',
    title: 'Soft-glow essentials for every routine',
    subtitle: 'Skincare and makeup picks with clear prices.',
    ctaLabel: 'Shop beauty',
    href: '/products?category=beauty',
    imageUrl: '/images/1.webp',
    tone: 'rose',
  },
  {
    id: 'hero-fashion',
    eyebrow: 'Fashion',
    title: 'Everyday pieces that feel elevated',
    subtitle: 'Layer-ready looks without the noise.',
    ctaLabel: 'Shop fashion',
    href: '/products?category=fashion',
    imageUrl: '/images/2.webp',
    tone: 'indigo',
  },
  {
    id: 'hero-offers',
    eyebrow: "Today's offers",
    title: 'Limited edits worth a second look',
    subtitle: 'Seasonal deals curated for TrendVaulta shoppers.',
    ctaLabel: 'See offers',
    href: '/offers',
    imageUrl: '/images/3.webp',
    tone: 'teal',
  },
  {
    id: 'hero-lifestyle',
    eyebrow: 'Lifestyle',
    title: 'Home & self-care that fits your pace',
    subtitle: 'Thoughtful details for calm, polished days.',
    ctaLabel: 'Explore lifestyle',
    href: '/products?category=lifestyle',
    imageUrl: '/images/4.webp',
    tone: 'stone',
  },
];

/** DEMO PDP Q&A — category-scoped FAQ (not live customer Q&A) */
export type DemoProductQaItem = {
  id: string;
  question: string;
  answer: string;
};

const DEMO_QA_COMMON: DemoProductQaItem[] = [
  {
    id: 'qa-ship',
    question: 'How long does shipping usually take?',
    answer:
      'Most orders dispatch within 1–2 business days. Standard delivery is typically 5–7 business days; express options appear at checkout when available.',
  },
  {
    id: 'qa-return',
    question: 'Can I return this item?',
    answer:
      'Eligible unused items can usually be returned within 30 days in original packaging. See our returns policy for hygiene-sealed exceptions.',
  },
  {
    id: 'qa-pay',
    question: 'Is checkout secure?',
    answer:
      'Yes. Payments are processed through encrypted checkout (Stripe when configured). TrendVaulta never stores full card numbers in the storefront.',
  },
];

const DEMO_QA_BY_CATEGORY: Record<string, DemoProductQaItem[]> = {
  beauty: [
    {
      id: 'qa-beauty-skin',
      question: 'Is this suitable for sensitive skin?',
      answer:
        'Always check the ingredient list on the product page. If you have sensitivities, patch-test first or ask our care team before full use.',
    },
    {
      id: 'qa-beauty-expire',
      question: 'How should I store this product?',
      answer:
        'Keep in a cool, dry place away from direct sun. Close lids tightly after use to protect texture and scent.',
    },
  ],
  skincare: [
    {
      id: 'qa-skin-order',
      question: 'When should I use this in my routine?',
      answer:
        'Most cleansers go first, then treatments/serums, then moisturizer and SPF by day. Follow any usage notes on the packaging.',
    },
  ],
  makeup: [
    {
      id: 'qa-makeup-shade',
      question: 'How do I choose the right shade?',
      answer:
        'Compare undertone (cool/warm/neutral) in natural light. If you are between shades, the lighter option is often easier to correct.',
    },
  ],
  fashion: [
    {
      id: 'qa-fashion-fit',
      question: 'How does sizing run?',
      answer:
        'Check the size guide and measurements on the product page when listed. If you prefer a relaxed fit, consider sizing up.',
    },
    {
      id: 'qa-fashion-care',
      question: 'How do I care for this piece?',
      answer:
        'Follow the care label. Many items prefer gentle wash or cool water; avoid high heat drying unless the label allows it.',
    },
  ],
  clothing: [
    {
      id: 'qa-clothing-fit',
      question: 'Will this shrink after washing?',
      answer:
        'Follow the garment care label. Natural fibers can relax or shrink with heat — cool wash and air dry when recommended.',
    },
  ],
  lifestyle: [
    {
      id: 'qa-life-use',
      question: 'Is this ready to use out of the box?',
      answer:
        'Most lifestyle pieces arrive ready for everyday use. Any assembly or care notes will be listed under product details when required.',
    },
  ],
  home: [
    {
      id: 'qa-home-place',
      question: 'Where does this work best at home?',
      answer:
        'Use on a stable, dry surface unless the listing says otherwise. Keep away from prolonged moisture if the material is not waterproof.',
    },
  ],
};

/**
 * Pick DEMO Q&A for a product category (falls back to common retail FAQs).
 * TODO(api): GET /api/products/:id/qa
 */
export function getDemoProductQa(category?: string | null): DemoProductQaItem[] {
  const key = (category || '').toLowerCase().trim();
  const specific = key ? DEMO_QA_BY_CATEGORY[key] : undefined;
  return [...(specific ?? []), ...DEMO_QA_COMMON];
}

/** DEMO — Customer Service / Help Center topics (Amazon-like IA, TrendVaulta copy) */
export const DEMO_HELP_TOPICS: DemoHelpTopic[] = [
  {
    id: 'orders',
    title: 'Your orders',
    description: 'Track shipments, view history, and manage recent purchases.',
    href: '/auth/login',
    icon: 'package',
  },
  {
    id: 'shipping',
    title: 'Shipping & delivery',
    description: 'Rates, timelines, and how tracked delivery works.',
    href: '/shipping',
    icon: 'truck',
  },
  {
    id: 'returns',
    title: 'Returns & refunds',
    description: 'Return window, eligible items, and how refunds are processed.',
    href: '/returns',
    icon: 'refresh',
  },
  {
    id: 'payments',
    title: 'Secure payments',
    description: 'Checkout, coupons, and how Stripe-secured payments work.',
    href: '/faq',
    icon: 'shield',
  },
  {
    id: 'gifts',
    title: 'Gifts & occasions',
    description: 'Find gift-ready edits by occasion, recipient, and budget.',
    href: '/#gift-finder',
    icon: 'gift',
  },
  {
    id: 'offers',
    title: 'Offers & deals',
    description: 'Browse limited-time promotions and seasonal edits.',
    href: '/offers',
    icon: 'tag',
  },
  {
    id: 'account',
    title: 'Account & wishlist',
    description: 'Sign in to manage profile, wishlist, and reviews.',
    href: '/auth/login',
    icon: 'user',
  },
  {
    id: 'contact',
    title: 'Contact support',
    description: 'Reach the care team for order or product questions.',
    href: '/contact',
    icon: 'headset',
  },
];

/** DEMO — trust / service strip */
export const DEMO_TRUST_ITEMS: DemoTrustItem[] = [
  {
    id: 'shipping',
    icon: 'truck',
    title: 'Fast shipping',
    description: 'Tracked delivery on every order',
  },
  {
    id: 'returns',
    icon: 'refresh',
    title: 'Easy returns',
    description: 'Hassle-free returns within policy window',
  },
  {
    id: 'secure',
    icon: 'shield',
    title: 'Secure checkout',
    description: 'Encrypted payments you can trust',
  },
  {
    id: 'support',
    icon: 'headset',
    title: 'Care support',
    description: 'Real people ready to help',
  },
];

/** DEMO — offers rail (replace with GET /api/offers) */
export const DEMO_DEALS: DemoDeal[] = [
  {
    id: 'deal-glow',
    title: 'Glow edit',
    subtitle: 'Skincare picks for a fresh finish',
    badge: 'Limited',
    href: '/products?category=beauty',
    imageUrl: '/images/1.webp',
  },
  {
    id: 'deal-fashion',
    title: 'Wardrobe refresh',
    subtitle: 'New-season essentials under your budget',
    badge: 'Trending',
    href: '/products?category=fashion',
    imageUrl: '/images/2.webp',
  },
  {
    id: 'deal-lifestyle',
    title: 'Home & lifestyle',
    subtitle: 'Quiet luxury accents for everyday',
    badge: 'New',
    href: '/products?category=lifestyle',
    imageUrl: '/images/3.webp',
  },
  {
    id: 'deal-gift',
    title: 'Gift-ready sets',
    subtitle: 'Curated bundles for someone special',
    badge: 'Gift',
    href: '/products?q=gift',
    imageUrl: '/images/4.webp',
  },
];

/** DEMO — featured brands strip */
export const DEMO_FEATURED_BRANDS: DemoBrand[] = [
  {
    id: 'brand-aura',
    name: 'Aura Lab',
    tagline: 'Clean beauty rituals',
    href: '/products?q=beauty',
    accent: 'from-rose-500 to-amber-400',
  },
  {
    id: 'brand-thread',
    name: 'Thread & Form',
    tagline: 'Modern wardrobe basics',
    href: '/products?q=fashion',
    accent: 'from-slate-700 to-stone-500',
  },
  {
    id: 'brand-lumen',
    name: 'Lumen Home',
    tagline: 'Soft lifestyle pieces',
    href: '/products?q=home',
    accent: 'from-teal-600 to-cyan-500',
  },
  {
    id: 'brand-noir',
    name: 'Noir Atelier',
    tagline: 'Evening accessories',
    href: '/products?q=accessories',
    accent: 'from-zinc-800 to-neutral-600',
  },
];

/** DEMO — category shortcuts for homepage */
export const DEMO_CATEGORY_SHORTCUTS: DemoCategoryShortcut[] = [
  {
    name: 'Beauty',
    countLabel: 'Skincare & makeup',
    href: '/products?category=beauty',
    accent: 'from-rose-500 to-pink-600',
    icon: 'sparkles',
  },
  {
    name: 'Fashion',
    countLabel: 'Ready-to-wear',
    href: '/products?category=fashion',
    accent: 'from-stone-600 to-neutral-800',
    icon: 'shirt',
  },
  {
    name: 'Wellness',
    countLabel: 'Self-care picks',
    href: '/products?category=wellness',
    accent: 'from-emerald-500 to-teal-600',
    icon: 'heart',
  },
  {
    name: 'Accessories',
    countLabel: 'Bags & details',
    href: '/products?category=accessories',
    accent: 'from-amber-500 to-orange-600',
    icon: 'watch',
  },
  {
    name: 'Home',
    countLabel: 'Lifestyle living',
    href: '/products?category=home',
    accent: 'from-sky-500 to-indigo-600',
    icon: 'home',
  },
  {
    name: 'Gifts',
    countLabel: 'Thoughtful sets',
    href: '/products?q=gift',
    accent: 'from-fuchsia-500 to-violet-600',
    icon: 'gift',
  },
  {
    name: 'Summer edit',
    countLabel: 'Light layers',
    href: '/products?q=summer',
    accent: 'from-yellow-400 to-amber-500',
    icon: 'sun',
  },
  {
    name: 'New arrivals',
    countLabel: 'Just dropped',
    href: '/products?sort=createdAt',
    accent: 'from-cyan-500 to-blue-600',
    icon: 'bag',
  },
];

/**
 * DEMO — gift finder facet options.
 * TODO(api): GET /api/storefront/gift-finder
 */
export const DEMO_GIFT_FINDER: DemoGiftFinderConfig = {
  occasions: [
    { id: 'birthday', label: 'Birthday', q: 'gift' },
    { id: 'thank-you', label: 'Thank you', q: 'gift' },
    { id: 'self-care', label: 'Self-care', category: 'beauty', q: 'skincare' },
    { id: 'housewarming', label: 'Housewarming', category: 'home', q: 'home' },
    { id: 'just-because', label: 'Just because', q: 'gift' },
  ],
  recipients: [
    { id: 'for-her', label: 'For her', q: 'beauty' },
    { id: 'for-him', label: 'For him', q: 'grooming' },
    { id: 'for-home', label: 'For home', category: 'home' },
    { id: 'for-anyone', label: 'For anyone', q: 'gift' },
  ],
  budgets: [
    { id: 'under-25', label: 'Under $25', maxPrice: 25 },
    { id: '25-50', label: '$25–$50', minPrice: 25, maxPrice: 50 },
    { id: '50-plus', label: '$50+', minPrice: 50 },
    { id: 'any', label: 'Any budget' },
  ],
};

/**
 * Build PLP URL from gift-finder selections. `config` is the live
 * GET /api/storefront/gift-finder config when available (ids differ from
 * the demo set), falling back to the demo config.
 */
export function buildGiftFinderHref(
  selection: {
    occasionId?: string | null;
    recipientId?: string | null;
    budgetId?: string | null;
  },
  config: DemoGiftFinderConfig = DEMO_GIFT_FINDER,
): string {
  const occasion = config.occasions.find((o) => o.id === selection.occasionId);
  const recipient = config.recipients.find(
    (r) => r.id === selection.recipientId,
  );
  const budget = config.budgets.find((b) => b.id === selection.budgetId);

  const params = new URLSearchParams();
  const category = occasion?.category || recipient?.category;
  const q = recipient?.q || occasion?.q || 'gift';

  if (category) params.set('category', category);
  if (q) params.set('q', q);
  if (budget?.minPrice != null) params.set('minPrice', String(budget.minPrice));
  if (budget?.maxPrice != null) params.set('maxPrice', String(budget.maxPrice));

  const qs = params.toString();
  return qs ? `/products?${qs}` : '/products?q=gift';
}

/** DEMO — editorial lookbook stories (replace with GET /api/storefront/lookbooks) */
export const DEMO_LOOKBOOK_STORIES: DemoLookbookStory[] = [
  {
    id: 'look-morning',
    eyebrow: 'Beauty edit',
    title: 'Soft morning ritual',
    body: 'Layer lightweight textures that wake skin without the fuss. Original TrendVaulta styling — demo content only.',
    ctaLabel: 'Shop the ritual',
    href: '/products?category=beauty',
    imageUrl: '/images/1.webp',
    tone: 'rose',
  },
  {
    id: 'look-wardrobe',
    eyebrow: 'Fashion edit',
    title: 'Quiet wardrobe staples',
    body: 'Clean silhouettes and easy layers for days that move. Curated for polish, not noise.',
    ctaLabel: 'Browse fashion',
    href: '/products?category=fashion',
    imageUrl: '/images/2.webp',
    tone: 'stone',
  },
  {
    id: 'look-home',
    eyebrow: 'Lifestyle edit',
    title: 'At-home calm corners',
    body: 'Small accents that make everyday spaces feel intentional — candles, linen, soft light.',
    ctaLabel: 'Explore lifestyle',
    href: '/products?category=lifestyle',
    imageUrl: '/images/3.webp',
    tone: 'teal',
  },
];

/**
 * DEMO badge overlay for homepage product rails.
 * Maps list index → badges until Product.badges exists in API.
 * TODO(api): read badges from product payload
 */
export function getDemoBadgesForIndex(index: number): DemoBadge[] {
  if (index === 0) return ['bestseller'];
  if (index === 1) return ['new'];
  if (index === 2) return ['lowStock'];
  if (index % 5 === 0) return ['bestseller'];
  return [];
}

/**
 * DEMO recommendation stub — category affinity + exclude recently viewed.
 * TODO(api): GET /api/recommendations?context=home
 */
export function pickInspiredProducts<
  T extends { _id: string; category?: string },
>(
  catalog: T[],
  options: {
    excludeIds?: string[];
    preferredCategories?: string[];
    limit?: number;
  } = {},
): T[] {
  const limit = options.limit ?? 8;
  const exclude = new Set(options.excludeIds ?? []);
  const preferred = new Set(
    (options.preferredCategories ?? [])
      .filter(Boolean)
      .map((c) => c.toLowerCase()),
  );

  const unused = catalog.filter((p) => !exclude.has(p._id));
  const pool = unused.length > 0 ? unused : catalog;

  const ranked = [
    ...pool.filter(
      (p) => p.category && preferred.has(String(p.category).toLowerCase()),
    ),
    ...pool.filter(
      (p) => !p.category || !preferred.has(String(p.category).toLowerCase()),
    ),
  ];

  // Rotate so the rail differs from a plain “newest first” featured grid
  const rotated =
    ranked.length > 3
      ? [...ranked.slice(3), ...ranked.slice(0, 3)]
      : [...ranked].reverse();

  return rotated.slice(0, limit);
}

/**
 * DEMO FBT companions — category affinity excluding the primary product.
 * TODO(api): GET /api/products/:id/bundles
 */
export function pickBundleCompanions<
  T extends { _id: string; category?: string },
>(
  catalog: T[],
  options: {
    primaryId: string;
    category?: string;
    limit?: number;
  },
): T[] {
  return pickInspiredProducts(catalog, {
    excludeIds: [options.primaryId],
    preferredCategories: options.category ? [options.category] : [],
    limit: options.limit ?? 2,
  });
}

/**
 * DEMO display-only bundle pricing (does not change checkout totals).
 * Applies a small visual “bundle” discount when 2+ items are selected.
 */
export function getDemoBundlePricing(prices: number[]): {
  subtotal: number;
  bundleTotal: number;
  savings: number;
} {
  const subtotal = prices.reduce(
    (sum, p) => sum + (Number.isFinite(p) ? p : 0),
    0,
  );
  if (prices.length < 2) {
    return { subtotal, bundleTotal: subtotal, savings: 0 };
  }
  const discountRate = 0.08;
  const savings = Math.round(subtotal * discountRate * 100) / 100;
  const bundleTotal = Math.max(0, Math.round((subtotal - savings) * 100) / 100);
  return { subtotal, bundleTotal, savings };
}
