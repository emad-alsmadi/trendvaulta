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

import {
  categoryHref,
  isCategorySlug,
  normalizeCategorySlug,
} from '@/lib/categories';

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
  icon:
    | 'truck'
    | 'refresh'
    | 'package'
    | 'shield'
    | 'gift'
    | 'headset'
    | 'user'
    | 'tag';
};

/** DEMO deliver-to regions — expectation messaging only (no geo/shipping engine).
 *  `label`/`hint` are message keys — render with t(). */
export type DemoDeliverRegion = {
  id: string;
  label: string;
  hint: string;
};

export const DEMO_DELIVER_REGIONS: DemoDeliverRegion[] = [
  {
    id: 'us',
    label: 'demo.deliverRegions.us.label',
    hint: 'demo.deliverRegions.us.hint',
  },
  {
    id: 'gb',
    label: 'demo.deliverRegions.gb.label',
    hint: 'demo.deliverRegions.gb.hint',
  },
  {
    id: 'ae',
    label: 'demo.deliverRegions.ae.label',
    hint: 'demo.deliverRegions.ae.hint',
  },
  {
    id: 'sa',
    label: 'demo.deliverRegions.sa.label',
    hint: 'demo.deliverRegions.sa.hint',
  },
  {
    id: 'lb',
    label: 'demo.deliverRegions.lb.label',
    hint: 'demo.deliverRegions.lb.hint',
  },
  {
    id: 'ch',
    label: 'demo.deliverRegions.ch.label',
    hint: 'demo.deliverRegions.ch.hint',
  },
];

export const DEMO_DEFAULT_DELIVER_REGION_ID = 'us';

/** DEMO homepage hero promo slides — replace with CMS / GET /api/storefront/hero.
 *  In the demo set, `eyebrow`/`title`/`subtitle`/`ctaLabel` are message keys
 *  (live slides carry plain text) — always render with t(). */
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
    eyebrow: 'demo.hero.glow.eyebrow',
    title: 'demo.hero.glow.title',
    subtitle: 'demo.hero.glow.subtitle',
    ctaLabel: 'demo.hero.glow.ctaLabel',
    href: '/products?category=makeup',
    imageUrl: '/images/1.jpeg',
    tone: 'rose',
  },
  {
    id: 'hero-fashion',
    eyebrow: 'demo.hero.fashion.eyebrow',
    title: 'demo.hero.fashion.title',
    subtitle: 'demo.hero.fashion.subtitle',
    ctaLabel: 'demo.hero.fashion.ctaLabel',
    href: '/products?category=clothing',
    imageUrl: '/images/2.jpeg',
    tone: 'indigo',
  },
  {
    id: 'hero-offers',
    eyebrow: 'demo.hero.offers.eyebrow',
    title: 'demo.hero.offers.title',
    subtitle: 'demo.hero.offers.subtitle',
    ctaLabel: 'demo.hero.offers.ctaLabel',
    href: '/offers',
    imageUrl: '/images/3.jpeg',
    tone: 'teal',
  },
  {
    id: 'hero-lifestyle',
    eyebrow: 'demo.hero.lifestyle.eyebrow',
    title: 'demo.hero.lifestyle.title',
    subtitle: 'demo.hero.lifestyle.subtitle',
    ctaLabel: 'demo.hero.lifestyle.ctaLabel',
    href: '/products?category=home',
    imageUrl: '/images/4.jpeg',
    tone: 'stone',
  },
];

/** DEMO PDP Q&A — category-scoped FAQ (not live customer Q&A).
 *  `question`/`answer` are message keys — render with t(). */
export type DemoProductQaItem = {
  id: string;
  question: string;
  answer: string;
};

const DEMO_QA_COMMON: DemoProductQaItem[] = [
  {
    id: 'qa-ship',
    question: 'demo.qa.shipping.question',
    answer: 'demo.qa.shipping.answer',
  },
  {
    id: 'qa-return',
    question: 'demo.qa.returns.question',
    answer: 'demo.qa.returns.answer',
  },
  {
    id: 'qa-pay',
    question: 'demo.qa.payments.question',
    answer: 'demo.qa.payments.answer',
  },
];

const DEMO_QA_BY_CATEGORY: Record<string, DemoProductQaItem[]> = {
  beauty: [
    {
      id: 'qa-beauty-skin',
      question: 'demo.qa.sensitiveSkin.question',
      answer: 'demo.qa.sensitiveSkin.answer',
    },
    {
      id: 'qa-beauty-expire',
      question: 'demo.qa.storage.question',
      answer: 'demo.qa.storage.answer',
    },
  ],
  skincare: [
    {
      id: 'qa-skin-order',
      question: 'demo.qa.routine.question',
      answer: 'demo.qa.routine.answer',
    },
  ],
  makeup: [
    {
      id: 'qa-makeup-shade',
      question: 'demo.qa.shade.question',
      answer: 'demo.qa.shade.answer',
    },
  ],
  fashion: [
    {
      id: 'qa-fashion-fit',
      question: 'demo.qa.sizing.question',
      answer: 'demo.qa.sizing.answer',
    },
    {
      id: 'qa-fashion-care',
      question: 'demo.qa.fashionCare.question',
      answer: 'demo.qa.fashionCare.answer',
    },
  ],
  clothing: [
    {
      id: 'qa-clothing-fit',
      question: 'demo.qa.shrink.question',
      answer: 'demo.qa.shrink.answer',
    },
  ],
  lifestyle: [
    {
      id: 'qa-life-use',
      question: 'demo.qa.readyToUse.question',
      answer: 'demo.qa.readyToUse.answer',
    },
  ],
  home: [
    {
      id: 'qa-home-place',
      question: 'demo.qa.placement.question',
      answer: 'demo.qa.placement.answer',
    },
  ],
};

/**
 * Pick DEMO Q&A for a product category (falls back to common retail FAQs).
 * TODO(api): GET /api/products/:id/qa
 */
export function getDemoProductQa(
  category?: string | null,
): DemoProductQaItem[] {
  const key = (category || '').toLowerCase().trim();
  const specific = key ? DEMO_QA_BY_CATEGORY[key] : undefined;
  return [...(specific ?? []), ...DEMO_QA_COMMON];
}

/** DEMO — Customer Service / Help Center topics (Amazon-like IA, TrendVaulta copy).
 *  `title`/`description` are message keys — render with t(). */
export const DEMO_HELP_TOPICS: DemoHelpTopic[] = [
  {
    id: 'orders',
    title: 'demo.help.orders.title',
    description: 'demo.help.orders.description',
    href: '/auth/login',
    icon: 'package',
  },
  {
    id: 'shipping',
    title: 'demo.help.shipping.title',
    description: 'demo.help.shipping.description',
    href: '/shipping',
    icon: 'truck',
  },
  {
    id: 'returns',
    title: 'demo.help.returns.title',
    description: 'demo.help.returns.description',
    href: '/returns',
    icon: 'refresh',
  },
  {
    id: 'payments',
    title: 'demo.help.payments.title',
    description: 'demo.help.payments.description',
    href: '/faq',
    icon: 'shield',
  },
  {
    id: 'gifts',
    title: 'demo.help.gifts.title',
    description: 'demo.help.gifts.description',
    href: '/#gift-finder',
    icon: 'gift',
  },
  {
    id: 'offers',
    title: 'demo.help.offers.title',
    description: 'demo.help.offers.description',
    href: '/offers',
    icon: 'tag',
  },
  {
    id: 'account',
    title: 'demo.help.account.title',
    description: 'demo.help.account.description',
    href: '/auth/login',
    icon: 'user',
  },
  {
    id: 'contact',
    title: 'demo.help.contact.title',
    description: 'demo.help.contact.description',
    href: '/contact',
    icon: 'headset',
  },
];

/** DEMO — trust / service strip (`title`/`description` are message keys — render with t()) */
export const DEMO_TRUST_ITEMS: DemoTrustItem[] = [
  {
    id: 'shipping',
    icon: 'truck',
    title: 'demo.trust.shipping.title',
    description: 'demo.trust.shipping.description',
  },
  {
    id: 'returns',
    icon: 'refresh',
    title: 'demo.trust.returns.title',
    description: 'demo.trust.returns.description',
  },
  {
    id: 'secure',
    icon: 'shield',
    title: 'demo.trust.secure.title',
    description: 'demo.trust.secure.description',
  },
  {
    id: 'support',
    icon: 'headset',
    title: 'demo.trust.support.title',
    description: 'demo.trust.support.description',
  },
];

/** DEMO — offers rail (replace with GET /api/offers).
 *  `title`/`subtitle`/`badge` are message keys — render with t(). */
export const DEMO_DEALS: DemoDeal[] = [
  {
    id: 'deal-glow',
    title: 'demo.deals.glow.title',
    subtitle: 'demo.deals.glow.subtitle',
    badge: 'demo.deals.glow.badge',
    href: '/products?category=makeup',
    imageUrl: '/images/1.jpeg',
  },
  {
    id: 'deal-fashion',
    title: 'demo.deals.fashion.title',
    subtitle: 'demo.deals.fashion.subtitle',
    badge: 'demo.deals.fashion.badge',
    href: '/products?category=clothing',
    imageUrl: '/images/2.jpeg',
  },
  {
    id: 'deal-lifestyle',
    title: 'demo.deals.lifestyle.title',
    subtitle: 'demo.deals.lifestyle.subtitle',
    badge: 'demo.deals.lifestyle.badge',
    href: '/products?category=home',
    imageUrl: '/images/3.jpeg',
  },
  {
    id: 'deal-gift',
    title: 'demo.deals.gift.title',
    subtitle: 'demo.deals.gift.subtitle',
    badge: 'demo.deals.gift.badge',
    href: '/products?q=gift',
    imageUrl: '/images/4.jpeg',
  },
];

/** DEMO — featured brands strip (`name` is a brand name; `tagline` is a message key — render with t()) */
export const DEMO_FEATURED_BRANDS: DemoBrand[] = [
  {
    id: 'brand-aura',
    name: 'Aura Lab',
    tagline: 'demo.brands.aura.tagline',
    href: '/products?q=makeup',
    accent: 'from-rose-500 to-amber-400',
  },
  {
    id: 'brand-thread',
    name: 'Thread & Form',
    tagline: 'demo.brands.thread.tagline',
    href: '/products?q=clothing',
    accent: 'from-slate-700 to-stone-500',
  },
  {
    id: 'brand-lumen',
    name: 'Lumen Home',
    tagline: 'demo.brands.lumen.tagline',
    href: '/products?q=home',
    accent: 'from-teal-600 to-cyan-500',
  },
  {
    id: 'brand-noir',
    name: 'Noir Atelier',
    tagline: 'demo.brands.noir.tagline',
    href: '/products?q=accessories',
    accent: 'from-zinc-800 to-neutral-600',
  },
];

/** DEMO — category shortcuts for homepage (`name`/`countLabel` are message keys) */
export const DEMO_CATEGORY_SHORTCUTS: DemoCategoryShortcut[] = [
  {
    name: 'home.categories.shortcuts.beauty',
    countLabel: 'home.categories.taglines.beauty',
    href: '/products?category=makeup',
    accent: 'from-rose-500 to-pink-600',
    icon: 'sparkles',
  },
  {
    name: 'home.categories.shortcuts.fashion',
    countLabel: 'home.categories.taglines.fashion',
    href: '/products?category=clothing',
    accent: 'from-stone-600 to-neutral-800',
    icon: 'shirt',
  },
  {
    name: 'home.categories.shortcuts.wellness',
    countLabel: 'home.categories.taglines.wellness',
    href: '/products?category=skincare',
    accent: 'from-emerald-500 to-teal-600',
    icon: 'heart',
  },
  {
    name: 'home.categories.shortcuts.accessories',
    countLabel: 'home.categories.taglines.accessories',
    href: '/products?category=accessories',
    accent: 'from-amber-500 to-orange-600',
    icon: 'watch',
  },
  {
    name: 'home.categories.shortcuts.home',
    countLabel: 'home.categories.taglines.home',
    href: '/products?category=home',
    accent: 'from-sky-500 to-indigo-600',
    icon: 'home',
  },
  {
    name: 'home.categories.shortcuts.gifts',
    countLabel: 'home.categories.taglines.gifts',
    href: '/products?q=gift',
    accent: 'from-fuchsia-500 to-violet-600',
    icon: 'gift',
  },
  {
    name: 'home.categories.shortcuts.summer',
    countLabel: 'home.categories.taglines.summer',
    href: '/products?q=summer',
    accent: 'from-yellow-400 to-amber-500',
    icon: 'sun',
  },
  {
    name: 'home.categories.shortcuts.newArrivals',
    countLabel: 'home.categories.taglines.newArrivals',
    href: '/products?sort=createdAt',
    accent: 'from-cyan-500 to-blue-600',
    icon: 'bag',
  },
];

/**
 * DEMO — gift finder facet options (`label` is a message key — render with t()).
 * TODO(api): GET /api/storefront/gift-finder
 */
export const DEMO_GIFT_FINDER: DemoGiftFinderConfig = {
  occasions: [
    { id: 'birthday', label: 'demo.giftFinder.occasions.birthday', q: 'gift' },
    { id: 'thank-you', label: 'demo.giftFinder.occasions.thankYou', q: 'gift' },
    {
      id: 'self-care',
      label: 'demo.giftFinder.occasions.selfCare',
      category: 'skincare',
      q: 'skincare',
    },
    {
      id: 'housewarming',
      label: 'demo.giftFinder.occasions.housewarming',
      category: 'home',
      q: 'home',
    },
    {
      id: 'just-because',
      label: 'demo.giftFinder.occasions.justBecause',
      q: 'gift',
    },
  ],
  recipients: [
    { id: 'for-her', label: 'demo.giftFinder.recipients.forHer', q: 'makeup' },
    {
      id: 'for-him',
      label: 'demo.giftFinder.recipients.forHim',
      q: 'grooming',
    },
    {
      id: 'for-home',
      label: 'demo.giftFinder.recipients.forHome',
      category: 'home',
    },
    {
      id: 'for-anyone',
      label: 'demo.giftFinder.recipients.forAnyone',
      q: 'gift',
    },
  ],
  budgets: [
    { id: 'under-25', label: 'demo.giftFinder.budgets.under25', maxPrice: 25 },
    {
      id: '25-50',
      label: 'demo.giftFinder.budgets.from25to50',
      minPrice: 25,
      maxPrice: 50,
    },
    { id: '50-plus', label: 'demo.giftFinder.budgets.over50', minPrice: 50 },
    { id: 'any', label: 'demo.giftFinder.budgets.any' },
  ],
};

/**
 * Build catalog URL from gift-finder selections. `config` is the active
 * config: the live GET /api/storefront/gift-finder config when loaded
 * (option ids differ from the demo set), otherwise DEMO_GIFT_FINDER.
 * Options resolve to their own `q` / `category` / `minPrice` / `maxPrice`.
 * A category-only selection routes to the `/c/<category>` landing page.
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

  const rawCategory = occasion?.category || recipient?.category;
  const category = normalizeCategorySlug(rawCategory) ?? rawCategory;
  const q = (recipient?.q || occasion?.q || '').trim();
  const minPrice =
    budget?.minPrice ?? occasion?.minPrice ?? recipient?.minPrice;
  const maxPrice =
    budget?.maxPrice ?? occasion?.maxPrice ?? recipient?.maxPrice;

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (minPrice != null) params.set('minPrice', String(minPrice));
  if (maxPrice != null) params.set('maxPrice', String(maxPrice));

  // Category without a search term → crawlable landing page
  if (category && !q && isCategorySlug(category)) {
    const qs = params.toString();
    return qs ? `${categoryHref(category)}?${qs}` : categoryHref(category);
  }

  if (category) params.set('category', category);
  if (!q && !category) params.set('q', 'gift');

  return `/products?${params.toString()}`;
}

/** DEMO — editorial lookbook stories (replace with GET /api/storefront/lookbooks).
 *  `eyebrow`/`title`/`body`/`ctaLabel` are message keys — render with t(). */
export const DEMO_LOOKBOOK_STORIES: DemoLookbookStory[] = [
  {
    id: 'look-morning',
    eyebrow: 'demo.lookbook.morning.eyebrow',
    title: 'demo.lookbook.morning.title',
    body: 'demo.lookbook.morning.body',
    ctaLabel: 'demo.lookbook.morning.ctaLabel',
    href: '/products?category=makeup',
    imageUrl: '/images/1.jpeg',
    tone: 'rose',
  },
  {
    id: 'look-wardrobe',
    eyebrow: 'demo.lookbook.wardrobe.eyebrow',
    title: 'demo.lookbook.wardrobe.title',
    body: 'demo.lookbook.wardrobe.body',
    ctaLabel: 'demo.lookbook.wardrobe.ctaLabel',
    href: '/products?category=clothing',
    imageUrl: '/images/2.jpeg',
    tone: 'stone',
  },
  {
    id: 'look-home',
    eyebrow: 'demo.lookbook.home.eyebrow',
    title: 'demo.lookbook.home.title',
    body: 'demo.lookbook.home.body',
    ctaLabel: 'demo.lookbook.home.ctaLabel',
    href: '/products?category=home',
    imageUrl: '/images/3.jpeg',
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
