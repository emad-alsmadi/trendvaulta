'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/products/ProductCard';
import { pickInspiredProducts } from '@/data/demoStorefront';
import { useHomeRecommendations } from '@/hooks/storefront/recommendationsQuery';
import { getRecentlyViewed } from '@/lib/recentlyViewed';
import { useTranslation } from '@/contexts/TranslationContext';
import type { Product } from '@/types';

type Props = {
  /** Optional catalog for demo fallback when recommendations API fails */
  products?: Product[];
  /** Parent catalog loading (used only for fallback path) */
  loading?: boolean;
};

/** Live results are Product docs with `brand` populated as { name, slug, logo } */
function isRenderableProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<Product>;
  return (
    typeof p._id === 'string' &&
    typeof p.title === 'string' &&
    typeof p.price === 'number'
  );
}

/**
 * Inspired-by-browsing rail.
 * Prefers GET /api/recommendations?context=home&limit=8 (`{ message,
 * results, strategy }`); falls back to local pickInspiredProducts(products)
 * only when the request fails or returns no results.
 */
export function InspiredByBrowsingSection({
  products = [],
  loading: parentLoading = false,
}: Props) {
  const { t } = useTranslation();
  // getRecentlyViewed() reads localStorage (SSR-safe, returns [] on the
  // server) — a lazy initializer reads it exactly once on mount with no
  // extra render, instead of committing an empty state then correcting it
  // in an effect.
  const [viewedIds] = useState<string[]>(() =>
    getRecentlyViewed().map((v) => v.id),
  );
  const [preferredCategories] = useState<string[]>(() =>
    getRecentlyViewed()
      .map((v) => v.category)
      .filter((c): c is string => Boolean(c)),
  );

  // Most recently viewed category → API `similar_category` strategy
  const { data, isLoading: recLoading, isError } = useHomeRecommendations(
    8,
    preferredCategories[0],
  );

  const apiResults = useMemo(
    () =>
      Array.isArray(data?.results)
        ? data.results.filter(isRenderableProduct)
        : [],
    [data],
  );
  const fromApi = !isError && apiResults.length > 0;

  const inspired = useMemo(() => {
    if (fromApi) {
      return apiResults.slice(0, 8);
    }
    return pickInspiredProducts(products, {
      excludeIds: viewedIds,
      preferredCategories,
      limit: 8,
    });
  }, [fromApi, apiResults, products, viewedIds, preferredCategories]);

  const hasBrowsingSignal = viewedIds.length > 0;
  const title = hasBrowsingSignal
    ? t('home.inspired.titleBrowsing')
    : t('home.inspired.titleDefault');
  const subtitle = fromApi
    ? hasBrowsingSignal
      ? t('home.inspired.subtitleBrowsing')
      : t('home.inspired.subtitleDefault')
    : hasBrowsingSignal
      ? t('home.inspired.demoSubtitleBrowsing')
      : t('home.inspired.demoSubtitleDefault');

  const awaitingFallbackCatalog =
    !fromApi && parentLoading && products.length === 0;
  const showLoading =
    (recLoading && !fromApi) || awaitingFallbackCatalog;

  if (showLoading) {
    return (
      <section
        aria-labelledby='inspired-heading'
        className='border-t border-stone-200 bg-stone-50 py-12 sm:py-16'
      >
        <div className='mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8'>
          <p className='py-8 text-center text-sm text-stone-500'>
            {t('home.inspired.loading')}
          </p>
        </div>
      </section>
    );
  }

  if (inspired.length === 0) return null;

  return (
    <section
      aria-labelledby='inspired-heading'
      className='border-t border-stone-200 bg-stone-50 py-12 sm:py-16'
    >
      <div className='mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8'>
        <div className='mb-6 flex items-end justify-between gap-4'>
          <div>
            <p className='text-xs font-medium uppercase tracking-wider text-stone-500'>
              {fromApi
                ? t('home.inspired.eyebrow')
                : t('home.inspired.demoEyebrow')}
            </p>
            <h2
              id='inspired-heading'
              className='mt-1 text-2xl font-extrabold text-stone-900 sm:text-3xl'
            >
              {title}
            </h2>
            <p className='mt-1 text-sm text-stone-600'>{subtitle}</p>
          </div>
          <Link
            href='/products'
            className='text-sm font-semibold text-fuchsia-700 hover:text-fuchsia-800'
          >
            {t('home.inspired.exploreMore')}
          </Link>
        </div>

        <div className='-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 md:grid-cols-3 lg:grid-cols-4'>
          {inspired.map((product) => (
            <div
              key={product._id}
              className='min-w-[70%] snap-start sm:min-w-0'
            >
              <ProductCard product={product} badges={product.badges ?? []} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
