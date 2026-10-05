import type { Metadata } from 'next';
import { SITE_NAME, getServerApiBase } from '@/lib/site';
import type { Translate } from '@/lib/i18n';
import {
  categoryHref,
  categoryDescription,
  categoryLabel,
  subcategoryLabel,
  type CategoryDef,
} from '@/lib/categories';

const SUBCATEGORY_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSubcategorySlug(value: string): boolean {
  return value.length <= 64 && SUBCATEGORY_SLUG_RE.test(value);
}

type FacetEntry = string | { value?: string; slug?: string; name?: string };

function facetValue(entry: FacetEntry): string | undefined {
  if (typeof entry === 'string') return entry;
  return entry?.value ?? entry?.slug ?? entry?.name;
}

/**
 * Subcategory chips for a category landing page.
 * Tries GET /api/products?category=<slug>&limit=1&facets=true and reads
 * `meta.facets.subcategories` (strings or `{ value }` objects); falls back
 * to the static list in `src/lib/categories.ts`.
 */
export async function fetchSubcategories(def: CategoryDef): Promise<string[]> {
  try {
    const res = await fetch(
      `${getServerApiBase()}/api/products?category=${def.slug}&limit=1&facets=true`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return def.subcategories;
    const json = await res.json();
    const raw = json?.meta?.facets?.subcategories;
    if (!Array.isArray(raw)) return def.subcategories;
    const values = raw
      .map((entry: FacetEntry) => facetValue(entry))
      .filter((v): v is string => typeof v === 'string' && v.length > 0);
    return values.length > 0 ? Array.from(new Set(values)) : def.subcategories;
  } catch {
    return def.subcategories;
  }
}

export function buildCategoryMetadata(
  def: CategoryDef,
  subcategory?: string,
  t?: Translate,
): Metadata {
  // Translated label/description when a translator is passed (the category
  // name itself may still be English-only if dashboard content has no
  // Arabic field yet — see API-311); the "Shop ... at" sentence around it
  // is always translated now regardless.
  const label = categoryLabel(def, t);
  const description = categoryDescription(def, t);
  const subLabel = subcategory ? subcategoryLabel(subcategory, t) : undefined;
  const title = subLabel ? `${subLabel} — ${label}` : label;
  const metaDescription = t
    ? subLabel
      ? t('metadata.shopSubcategory', {
          subcategory: subLabel.toLowerCase(),
          label,
          site: SITE_NAME,
          description,
        })
      : t('metadata.shopCategory', { label, site: SITE_NAME, description })
    : subLabel
      ? `Shop ${subLabel.toLowerCase()} in ${label} at ${SITE_NAME}. ${description}`
      : `Shop ${label} at ${SITE_NAME}. ${description}`;
  const path = categoryHref(def.slug, subcategory);
  const images = def.image ? [{ url: def.image, alt: label }] : [];
  return {
    title,
    description: metaDescription,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title: `${title} | ${SITE_NAME}`,
      description: metaDescription,
      url: path,
      images,
    },
    twitter: {
      card: images.length ? 'summary_large_image' : 'summary',
      title: `${title} | ${SITE_NAME}`,
      description: metaDescription,
      images: images.map((i) => i.url),
    },
  };
}
