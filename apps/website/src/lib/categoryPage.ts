import type { Metadata } from 'next';
import { SITE_NAME, getServerApiBase } from '@/lib/site';
import {
  categoryHref,
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
): Metadata {
  const title = subcategory
    ? `${subcategoryLabel(subcategory)} — ${def.label}`
    : def.label;
  const description = subcategory
    ? `Shop ${subcategoryLabel(subcategory).toLowerCase()} in ${def.label} at ${SITE_NAME}. ${def.description}`
    : `Shop ${def.label} at ${SITE_NAME}. ${def.description}`;
  const path = categoryHref(def.slug, subcategory);
  const images = def.image ? [{ url: def.image, alt: def.label }] : [];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
      images,
    },
    twitter: {
      card: images.length ? 'summary_large_image' : 'summary',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: images.map((i) => i.url),
    },
  };
}
