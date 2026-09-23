'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Filter, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/products/ProductCard';
import { useProducts } from '@/hooks/products/productsQuery';
import { CategorySidebar } from '@/components/products/CategorySidebar';
import { ProductFiltersDrawer } from '@/components/products/ProductFiltersDrawer';
import { Pagination } from '@/components/ui/Pagination';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useBrands } from '@/hooks/brands/brandsQuery';
import type { ProductSort } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';

/**
 * API Product.category enum: makeup, perfumes, clothing, skincare,
 * accessories, home. Older marketing links used broader names — map them
 * so those URLs keep working instead of showing "No products".
 */
const CATEGORY_ALIASES: Record<string, string> = {
  beauty: 'makeup',
  fashion: 'clothing',
  lifestyle: 'home',
  wellness: 'skincare',
  fragrance: 'perfumes',
};

function normalizeCategoryParam(value: string | null): string | undefined {
  if (!value) return undefined;
  const key = value.trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? key;
}

const DEFAULT_SORT: ProductSort = 'featured';

const sortOptions: { value: ProductSort; labelKey: string }[] = [
  { value: 'featured', labelKey: 'catalog.sort.featured' },
  { value: 'bestselling', labelKey: 'catalog.sort.bestselling' },
  { value: 'price_asc', labelKey: 'catalog.sort.priceAsc' },
  { value: 'price_desc', labelKey: 'catalog.sort.priceDesc' },
  { value: 'rating', labelKey: 'catalog.sort.rating' },
  { value: 'newest', labelKey: 'catalog.sort.newest' },
];

/** Older links used raw field sorts — map them onto the API presets. */
const LEGACY_SORT: Record<string, ProductSort> = {
  createdAt: 'featured',
  '-createdAt': 'newest',
  price: 'price_asc',
  '-price': 'price_desc',
  '-averageRating': 'rating',
};

function normalizeSortParam(value: string | null): ProductSort {
  if (!value) return DEFAULT_SORT;
  if (LEGACY_SORT[value]) return LEGACY_SORT[value];
  return sortOptions.some((o) => o.value === value) ? value : DEFAULT_SORT;
}

function listParam(value: string | null): string[] {
  return value ? value.split(',').map((v) => v.trim()).filter(Boolean) : [];
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export default function ProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t, formatPrice } = useTranslation();

  const category = normalizeCategoryParam(searchParams.get('category'));
  const subcategory = searchParams.get('subcategory') || undefined;
  const qParam = searchParams.get('q') || '';
  const sortBy = normalizeSortParam(searchParams.get('sort'));
  const minPrice = searchParams.get('minPrice') || undefined;
  const maxPrice = searchParams.get('maxPrice') || undefined;
  const minRatingParam = Number(searchParams.get('minRating'));
  const minRating =
    Number.isFinite(minRatingParam) && minRatingParam > 0
      ? minRatingParam
      : null;
  const pageParam = Number(searchParams.get('page') || '1');
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const sizeParam = searchParams.get('size');
  const colorParam = searchParams.get('color');
  const brandParam = searchParams.get('brand');
  const selectedSizes = useMemo(() => listParam(sizeParam), [sizeParam]);
  const selectedColors = useMemo(() => listParam(colorParam), [colorParam]);
  const selectedBrands = useMemo(() => listParam(brandParam), [brandParam]);
  const inStockOnly = ['1', 'true'].includes(searchParams.get('inStock') || '');
  const onSaleOnly = ['1', 'true'].includes(searchParams.get('onSale') || '');

  const [searchInput, setSearchInput] = useState(qParam);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const limit = 12;

  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  const replaceParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Sync debounced search → URL `q`
  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next === qParam) return;
    replaceParams((params) => {
      if (next) params.set('q', next);
      else params.delete('q');
      params.delete('page');
    });
  }, [debouncedSearch, qParam, replaceParams]);

  const query = useMemo(
    () => ({
      page: currentPage,
      limit,
      sort: sortBy,
      category,
      subcategory,
      q: qParam || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      brand: selectedBrands.length ? selectedBrands : undefined,
      size: selectedSizes.length ? selectedSizes : undefined,
      color: selectedColors.length ? selectedColors : undefined,
      minRating: minRating ?? undefined,
      inStock: inStockOnly || undefined,
      onSale: onSaleOnly || undefined,
      // Facet counts drive the sidebar; only the PLP pays for the aggregation
      facets: true,
    }),
    [
      currentPage,
      limit,
      sortBy,
      category,
      subcategory,
      qParam,
      minPrice,
      maxPrice,
      selectedBrands,
      selectedSizes,
      selectedColors,
      minRating,
      inStockOnly,
      onSaleOnly,
    ],
  );

  // Fallback brand names for chips when facets are not loaded yet
  const { data: brands = [] } = useBrands();

  const {
    data: response,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useProducts(query);

  const products = response?.data || [];
  const meta = response?.meta || { total: 0, page: 1, pages: 1, limit };
  const facets = response?.meta?.facets;

  const brandLabel = useCallback(
    (id: string) =>
      facets?.brands.find((b) => b._id === id)?.name ||
      brands.find((b) => b._id === id)?.name ||
      t('catalog.chips.brandFallback'),
    [facets, brands, t],
  );

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (qParam) {
      chips.push({
        key: 'q',
        label: t('catalog.chips.search', { query: qParam }),
        clear: () =>
          replaceParams((p) => {
            p.delete('q');
            p.delete('page');
          }),
      });
    }
    if (category) {
      chips.push({
        key: 'category',
        label: subcategory
          ? `${category} / ${subcategory}`
          : t('catalog.chips.category', { category }),
        clear: () =>
          replaceParams((p) => {
            p.delete('category');
            p.delete('subcategory');
            p.delete('page');
          }),
      });
    }
    if (minPrice || maxPrice) {
      chips.push({
        key: 'price',
        label: t('catalog.chips.price', {
          min: formatPrice(Number(minPrice || 0)),
          max: maxPrice ? formatPrice(Number(maxPrice)) : '∞',
        }),
        clear: () =>
          replaceParams((p) => {
            p.delete('minPrice');
            p.delete('maxPrice');
            p.delete('page');
          }),
      });
    }
    if (minRating != null && !Number.isNaN(minRating)) {
      chips.push({
        key: 'rating',
        label: t('catalog.chips.rating', { rating: minRating }),
        clear: () =>
          replaceParams((p) => {
            p.delete('minRating');
            p.delete('page');
          }),
      });
    }
    if (inStockOnly) {
      chips.push({
        key: 'inStock',
        label: t('catalog.chips.inStock'),
        clear: () =>
          replaceParams((p) => {
            p.delete('inStock');
            p.delete('page');
          }),
      });
    }
    if (onSaleOnly) {
      chips.push({
        key: 'onSale',
        label: t('catalog.chips.onSale'),
        clear: () =>
          replaceParams((p) => {
            p.delete('onSale');
            p.delete('page');
          }),
      });
    }
    selectedBrands.forEach((id) => {
      chips.push({
        key: `brand-${id}`,
        label: t('catalog.chips.brand', { name: brandLabel(id) }),
        clear: () =>
          replaceParams((p) => {
            const next = selectedBrands.filter((b) => b !== id);
            if (next.length) p.set('brand', next.join(','));
            else p.delete('brand');
            p.delete('page');
          }),
      });
    });
    selectedSizes.forEach((size) => {
      chips.push({
        key: `size-${size}`,
        label: t('product.sizeValue', { value: size }),
        clear: () =>
          replaceParams((p) => {
            const next = selectedSizes.filter((s) => s !== size);
            if (next.length) p.set('size', next.join(','));
            else p.delete('size');
            p.delete('page');
          }),
      });
    });
    selectedColors.forEach((color) => {
      chips.push({
        key: `color-${color}`,
        label: t('product.colorValue', { value: color }),
        clear: () =>
          replaceParams((p) => {
            const next = selectedColors.filter((c) => c !== color);
            if (next.length) p.set('color', next.join(','));
            else p.delete('color');
            p.delete('page');
          }),
      });
    });
    return chips;
  }, [
    qParam,
    category,
    subcategory,
    minPrice,
    maxPrice,
    minRating,
    inStockOnly,
    onSaleOnly,
    selectedBrands,
    brandLabel,
    selectedSizes,
    selectedColors,
    replaceParams,
    t,
    formatPrice,
  ]);

  const handlePageChange = (page: number) => {
    replaceParams((params) => {
      if (page <= 1) params.delete('page');
      else params.set('page', String(page));
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (value: string) => {
    replaceParams((params) => {
      if (value === DEFAULT_SORT) params.delete('sort');
      else params.set('sort', value);
      params.delete('page');
    });
  };

  const rangeStart =
    meta.total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const rangeEnd = Math.min(currentPage * limit, meta.total);

  const headingCategory = subcategory || category;

  // Keep the query highlighted: split the translated sentence at {query}.
  const resultsText =
    meta.total === 0
      ? t(qParam ? 'catalog.noResultsForQuery' : 'catalog.noResults')
      : t(qParam ? 'catalog.resultsRangeForQuery' : 'catalog.resultsRange', {
          start: rangeStart,
          end: rangeEnd,
          total: meta.total,
        });
  const [resultsBefore, resultsAfter = ''] = resultsText.split('{query}');

  return (
    <div className='min-h-screen bg-stone-50'>
      <div className='mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8'>
        <div className='flex gap-8'>
          <div className='hidden lg:block'>
            <CategorySidebar facets={facets} />
          </div>

          <ProductFiltersDrawer
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            activeCount={activeChips.length}
            facets={facets}
          />

          <div className='min-w-0 flex-1'>
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className='mb-6'
            >
              <h1 className='text-3xl font-extrabold capitalize text-stone-900'>
                {headingCategory ? headingCategory.replace(/-/g, ' ') : t('common.products')}
              </h1>
              <p className='mt-1 text-stone-600'>
                {t('catalog.subtitle')}
              </p>
            </motion.div>

            <div className='mb-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center'>
              <form
                role='search'
                className='relative w-full max-w-xl'
                onSubmit={(e) => {
                  e.preventDefault();
                  replaceParams((params) => {
                    const next = searchInput.trim();
                    if (next) params.set('q', next);
                    else params.delete('q');
                    params.delete('page');
                  });
                }}
              >
                <label htmlFor='plp-search' className='sr-only'>
                  {t('catalog.searchLabel')}
                </label>
                <Search className='pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400' />
                <Input
                  id='plp-search'
                  type='search'
                  placeholder={t('catalog.searchPlaceholder')}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className='ps-10'
                />
              </form>

              <div className='flex w-full gap-3 sm:w-auto'>
                <label className='sr-only' htmlFor='plp-sort'>
                  {t('catalog.sortLabel')}
                </label>
                <select
                  id='plp-sort'
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

                <Button
                  type='button'
                  variant='outline'
                  className='gap-2 lg:hidden'
                  onClick={() => setFiltersOpen(true)}
                >
                  <Filter className='h-4 w-4' />
                  {t('catalog.filters')}
                  {activeChips.length > 0 ? (
                    <span className='rounded-full bg-fuchsia-100 px-1.5 text-xs font-semibold text-fuchsia-800'>
                      {activeChips.length}
                    </span>
                  ) : null}
                </Button>
              </div>
            </div>

            {activeChips.length > 0 && (
              <ul className='mb-4 flex flex-wrap gap-2'>
                {activeChips.map((chip) => (
                  <li key={chip.key}>
                    <button
                      type='button'
                      onClick={chip.clear}
                      className='inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:border-stone-300'
                    >
                      {chip.label}
                      <X className='h-3 w-3' aria-hidden />
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type='button'
                    onClick={() => router.replace('/products')}
                    className='text-xs font-semibold text-fuchsia-700 hover:text-fuchsia-800'
                  >
                    {t('catalog.clearAll')}
                  </button>
                </li>
              </ul>
            )}

            <div className='mb-6 flex flex-wrap items-center gap-2 text-sm text-stone-600'>
              {isLoading && !response ? (
                <span>{t('catalog.loading')}</span>
              ) : error ? (
                <span className='text-rose-600'>{t('catalog.loadFailed')}</span>
              ) : (
                <span>
                  {resultsBefore}
                  {qParam ? (
                    <>
                      <span className='font-semibold text-fuchsia-700'>“{qParam}”</span>
                      {resultsAfter}
                    </>
                  ) : null}
                </span>
              )}
              {isFetching && response ? (
                <span className='text-xs text-stone-400'>{t('catalog.updating')}</span>
              ) : null}
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
                <Button
                  type='button'
                  className='mt-4'
                  onClick={() => refetch()}
                >
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
                  {qParam || activeChips.length
                    ? t('catalog.noMatches')
                    : t('catalog.noProducts')}
                </p>
                {activeChips.length > 0 && (
                  <Button
                    type='button'
                    variant='outline'
                    className='mt-4'
                    onClick={() => router.replace('/products')}
                  >
                    {t('catalog.clearFilters')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
