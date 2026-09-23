'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { SlidersHorizontal } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { ProductCard } from '@/components/products/ProductCard';
import { useProducts } from '@/hooks/products/productsQuery';
import { useTranslation } from '@/contexts/TranslationContext';

const sortOptions = [
  { value: 'createdAt', labelKey: 'catalog.sort.featured' },
  { value: 'bestselling', labelKey: 'catalog.sort.bestselling' },
  { value: 'price', labelKey: 'catalog.sort.priceAsc' },
  { value: '-price', labelKey: 'catalog.sort.priceDesc' },
  { value: '-averageRating', labelKey: 'catalog.sort.rating' },
  { value: '-createdAt', labelKey: 'catalog.sort.newest' },
];

const LIMIT = 12;

type Props = {
  category: string;
  subcategory?: string;
};

/**
 * Client island for /c/[category] landing pages.
 * Reads `sort` / `page` from the URL and renders the catalog grid via
 * the shared useProducts hook. Full faceting lives on /products.
 */
export function CategoryProductGrid({ category, subcategory }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const sortBy = searchParams.get('sort') || 'createdAt';
  const pageParam = Number(searchParams.get('page') || '1');
  const currentPage =
    Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const replaceParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const query = useMemo(
    () => ({
      category,
      subcategory,
      sort: sortBy,
      page: currentPage,
      limit: LIMIT,
    }),
    [category, subcategory, sortBy, currentPage],
  );

  const {
    data: response,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useProducts(query);

  const products = response?.data || [];
  const meta = response?.meta || { total: 0, page: 1, pages: 1, limit: LIMIT };

  const rangeStart = meta.total === 0 ? 0 : (currentPage - 1) * LIMIT + 1;
  const rangeEnd = Math.min(currentPage * LIMIT, meta.total);

  const allFiltersParams = new URLSearchParams({ category });
  if (subcategory) allFiltersParams.set('subcategory', subcategory);
  if (sortBy !== 'createdAt') allFiltersParams.set('sort', sortBy);
  const allFiltersHref = `/products?${allFiltersParams.toString()}`;

  const handlePageChange = (page: number) => {
    replaceParams((params) => {
      if (page <= 1) params.delete('page');
      else params.set('page', String(page));
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (value: string) => {
    replaceParams((params) => {
      if (value === 'createdAt') params.delete('sort');
      else params.set('sort', value);
      params.delete('page');
    });
  };

  return (
    <div>
      <div className='mb-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center'>
        <div className='flex flex-wrap items-center gap-2 text-sm text-stone-600'>
          {isLoading && !response ? (
            <span>{t('catalog.loading')}</span>
          ) : error && !response ? (
            <span className='text-rose-600'>{t('catalog.loadFailed')}</span>
          ) : (
            <span>
              {meta.total === 0
                ? t('catalog.noResults')
                : t('catalog.resultsRange', {
                    start: rangeStart,
                    end: rangeEnd,
                    total: meta.total,
                  })}
            </span>
          )}
          {isFetching && response ? (
            <span className='text-xs text-stone-400'>{t('catalog.updating')}</span>
          ) : null}
        </div>

        <div className='flex w-full gap-3 sm:w-auto'>
          <label className='sr-only' htmlFor='category-sort'>
            {t('catalog.sortLabel')}
          </label>
          <select
            id='category-sort'
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className='flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-fuchsia-500 sm:flex-none'
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>

          <Link
            href={allFiltersHref}
            className='inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500'
          >
            <SlidersHorizontal className='h-4 w-4' aria-hidden />
            {t('catalog.allFilters')}
          </Link>
        </div>
      </div>

      {isLoading && !response ? (
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className='aspect-[3/4] animate-pulse rounded-xl bg-stone-200/70'
            />
          ))}
        </div>
      ) : error && !response ? (
        <div className='rounded-xl border border-rose-100 bg-white py-12 text-center'>
          <p className='text-rose-600'>{t('catalog.catalogLoadFailed')}</p>
          <Button type='button' className='mt-4' onClick={() => refetch()}>
            {t('catalog.retry')}
          </Button>
        </div>
      ) : products.length > 0 ? (
        <>
          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                badges={product.badges ?? []}
              />
            ))}
          </div>

          {meta.pages > 1 && (
            <div className='mt-8'>
              <Pagination
                currentPage={currentPage}
                totalPages={meta.pages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      ) : (
        <div className='rounded-xl border border-stone-100 bg-white py-12 text-center'>
          <p className='text-lg text-stone-500'>
            {t('catalog.emptyCategory')}
          </p>
          <Link
            href='/products'
            className='mt-4 inline-block text-sm font-semibold text-fuchsia-700 hover:text-fuchsia-800'
          >
            {t('catalog.browseAll')}
          </Link>
        </div>
      )}
    </div>
  );
}
