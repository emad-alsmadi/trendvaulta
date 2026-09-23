/**
 * Single source of truth for storefront categories.
 * Slugs mirror the API `Product.category` enum (apps/api/models/Product.js).
 */
import type { Translate } from '@/lib/i18n';

export type CategorySlug =
  | 'makeup'
  | 'perfumes'
  | 'clothing'
  | 'skincare'
  | 'accessories'
  | 'home';

export type CategoryDef = {
  slug: CategorySlug;
  label: string;
  description: string;
  /** Hero image (public path) */
  image?: string;
  /** Static fallback when the API does not expose subcategory facets */
  subcategories: string[];
};

export const CATEGORIES: CategoryDef[] = [
  {
    slug: 'makeup',
    label: 'Makeup',
    description:
      'Foundations, lipsticks, eyeshadows and everyday essentials from world-renowned beauty brands.',
    image: '/images/1.webp',
    subcategories: [
      'foundation',
      'lipstick',
      'eyeshadow',
      'mascara',
      'blush',
      'concealer',
      'primer',
      'setting-spray',
    ],
  },
  {
    slug: 'perfumes',
    label: 'Perfumes',
    description:
      'Signature fragrances, body mists and gift sets — find a scent that feels like you.',
    image: '/images/2.webp',
    subcategories: [
      'eau-de-parfum',
      'eau-de-toilette',
      'body-mist',
      'gift-sets',
      'cologne',
      'roll-on',
    ],
  },
  {
    slug: 'clothing',
    label: 'Clothing',
    description:
      'Dresses, tops, jackets and activewear — wardrobe staples and seasonal edits.',
    image: '/images/3.webp',
    subcategories: [
      'dresses',
      'tops',
      'pants',
      'jackets',
      'accessories',
      'sweaters',
      'skirts',
      'activewear',
    ],
  },
  {
    slug: 'skincare',
    label: 'Skincare',
    description:
      'Cleansers, serums, moisturizers and SPF for every skin type and ritual.',
    image: '/images/4.webp',
    subcategories: [
      'cleanser',
      'moisturizer',
      'serum',
      'sunscreen',
      'masks',
      'toner',
      'exfoliator',
      'eye-cream',
    ],
  },
  {
    slug: 'accessories',
    label: 'Accessories',
    description:
      'Jewelry, bags, watches and sunglasses to finish every look.',
    image: '/images/1.webp',
    subcategories: [
      'jewelry',
      'bags',
      'scarves',
      'belts',
      'watches',
      'sunglasses',
      'hats',
      'wallets',
    ],
  },
  {
    slug: 'home',
    label: 'Home & Living',
    description:
      'Decor, bedding, lighting and kitchen pieces that make a house feel like home.',
    image: '/images/2.webp',
    subcategories: [
      'decor',
      'kitchen',
      'bedding',
      'lighting',
      'furniture',
      'rugs',
      'curtains',
      'organization',
    ],
  },
];

export const CATEGORY_SLUGS: CategorySlug[] = CATEGORIES.map((c) => c.slug);

/**
 * Older marketing links used broader names — map them to enum slugs so
 * those URLs keep working.
 */
export const CATEGORY_ALIASES: Record<string, CategorySlug> = {
  beauty: 'makeup',
  fashion: 'clothing',
  lifestyle: 'home',
  wellness: 'skincare',
  fragrance: 'perfumes',
};

export function isCategorySlug(value: string): value is CategorySlug {
  return (CATEGORY_SLUGS as string[]).includes(value);
}

/** Resolve a raw value (slug or alias) to a canonical category slug. */
export function normalizeCategorySlug(
  value: string | null | undefined,
): CategorySlug | undefined {
  if (!value) return undefined;
  const key = value.trim().toLowerCase();
  if (isCategorySlug(key)) return key;
  return CATEGORY_ALIASES[key];
}

export function getCategory(slug: string): CategoryDef | undefined {
  const normalized = normalizeCategorySlug(slug);
  return normalized ? CATEGORIES.find((c) => c.slug === normalized) : undefined;
}

/** A translated message, or undefined when the key has no entry. */
function optionalMessage(t: Translate | undefined, key: string) {
  if (!t) return undefined;
  const value = t(key);
  return value === key ? undefined : value;
}

/** Category name in the reader's language (English `label` without `t`). */
export function categoryLabel(def: CategoryDef, t?: Translate): string {
  return optionalMessage(t, `categories.${def.slug}.label`) ?? def.label;
}

export function categoryDescription(def: CategoryDef, t?: Translate): string {
  return optionalMessage(t, `categories.${def.slug}.description`) ?? def.description;
}

/**
 * Human label for a subcategory slug ("eau-de-parfum" → "Eau de parfum").
 * With `t`, known slugs are translated; slugs added in the dashboard fall
 * back to the humanized slug.
 */
export function subcategoryLabel(slug: string, t?: Translate): string {
  const translated = optionalMessage(t, `categories.sub.${slug}`);
  if (translated) return translated;
  const words = slug.replace(/[-_]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : slug;
}

/** Landing-page URL for a category (and optional subcategory). */
export function categoryHref(category: string, subcategory?: string): string {
  const base = `/c/${encodeURIComponent(category)}`;
  return subcategory ? `${base}/${encodeURIComponent(subcategory)}` : base;
}
