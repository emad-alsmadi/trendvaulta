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

const sortOptions = [
  { value: 'createdAt', label: 'Featured' },
  { value: 'bestselling', label: 'Best Sellers' },
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
  { value: '-averageRating', label: 'Avg. Customer Review' },
  { value: '-createdAt', label: 'Newest Arrivals' },
];

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

  const category = normalizeCategoryParam(searchParams.get('category'));
  const subcategory = searchParams.get('subcategory') || undefined;
  const qParam = searchParams.get('q') || '';
  const sortBy = searchParams.get('sort') || 'createdAt';
  const minPrice = searchParams.get('minPrice') || undefined;
  const maxPrice = searchParams.get('maxPrice') || undefined;
  const minRatingParam = searchParams.get('minRating');
  const minRating = minRatingParam ? Number(minRatingParam) : null;
  const pageParam = Number(searchParams.get('page') || '1');
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const sizeParam = searchParams.get('size');
  const colorParam = searchParams.get('color');
  const selectedSizes = sizeParam ? sizeParam.split(',').filter(Boolean) : [];
  const selectedColors = colorParam ? colorParam.split(',').filter(Boolean) : [];
  const inStockOnly = searchParams.get('inStock') === '1';
  const onSaleOnly = searchParams.get('onSale') === '1';
  const brandParam = searchParams.get('brand') || '';

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
      // Brand is a server-side filter (brand=<id>)
      brand: brandParam || undefined,
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
      brandParam,
    ],
  );

  const { data: brands = [] } = useBrands();
  const brandName =
    brands.find((b) => b._id === brandParam)?.name || brandParam;

  const {
    data: response,
    isLoading,
    isFetching,
    error,
  } = useProducts(query);

  const products = response?.data || [];
  const meta = response?.meta || { total: 0, page: 1, pages: 1, limit };

  /**
   * DEMO client facets for rating / size / color (not backend-backed).
   * Price + search + category already go through the API.
   * TODO(api): server-side facet counts + variant filters
   */
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (minRating != null && !Number.isNaN(minRating)) {
        if ((product.averageRating || 0) < minRating) return false;
      }
      if (inStockOnly && product.stock !== undefined && product.stock <= 0) {
        return false;
      }
      if (onSaleOnly) {
        const onSale =
          typeof product.basePrice === 'number' &&
          product.basePrice > product.price;
        if (!onSale) return false;
      }
      if (selectedSizes.length > 0) {
        const sizes = (product.variants || [])
          .map((v) => v.size)
          .filter(Boolean) as string[];
        if (sizes.length > 0 && !selectedSizes.some((s) => sizes.includes(s))) {
          return false;
        }
      }
      if (selectedColors.length > 0) {
        const colors = (product.variants || [])
          .map((v) => v.color)
          .filter(Boolean) as string[];
        if (
          colors.length > 0 &&
          !selectedColors.some((c) => colors.includes(c))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    products,
    minRating,
    inStockOnly,
    onSaleOnly,
    selectedSizes,
    selectedColors,
  ]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (qParam) {
      chips.push({
        key: 'q',
        label: `Search: “${qParam}”`,
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
          : `Category: ${category}`,
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
        label: `Price: $${minPrice || '0'}–$${maxPrice || '∞'}`,
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
        label: `${minRating}★ & up (demo)`,
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
        label: 'In stock (demo)',
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
        label: 'On sale (demo)',
        clear: () =>
          replaceParams((p) => {
            p.delete('onSale');
            p.delete('page');
          }),
      });
    }
    if (brandParam) {
      chips.push({
        key: 'brand',
        label: `Brand: ${brandName}`,
        clear: () =>
          replaceParams((p) => {
            p.delete('brand');
            p.delete('page');
          }),
      });
    }
    selectedSizes.forEach((size) => {
      chips.push({
        key: `size-${size}`,
        label: `Size: ${size} (demo)`,
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
        label: `Color: ${color} (demo)`,
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
    brandParam,
    brandName,
    selectedSizes,
    selectedColors,
    replaceParams,
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
      if (value === 'createdAt') params.delete('sort');
      else params.set('sort', value);
      params.delete('page');
    });
  };

  const rangeStart =
    meta.total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const rangeEnd = Math.min(currentPage * limit, meta.total);

  const headingCategory = subcategory || category;

  return (
    <div className='min-h-screen bg-stone-50'>
      <div className='mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8'>
        <div className='flex gap-8'>
          <div className='hidden lg:block'>
            <CategorySidebar />
          </div>

          <ProductFiltersDrawer
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            activeCount={activeChips.length}
          />

          <div className='min-w-0 flex-1'>
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className='mb-6'
            >
              <h1 className='text-3xl font-extrabold capitalize text-stone-900'>
                {headingCategory ? headingCategory.replace(/-/g, ' ') : 'Products'}
              </h1>
              <p className='mt-1 text-stone-600'>
                Beauty, fashion & lifestyle — find your next essential.
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
                  Search products
                </label>
                <Search className='pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400' />
                <Input
                  id='plp-search'
                  type='search'
                  placeholder='Search products…'
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className='pl-10'
                />
              </form>

              <div className='flex w-full gap-3 sm:w-auto'>
                <label className='sr-only' htmlFor='plp-sort'>
                  Sort products
                </label>
                <select
                  id='plp-sort'
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className='flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-fuchsia-500 sm:flex-none'
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
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
                  Filters
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
                    Clear all
                  </button>
                </li>
              </ul>
            )}

            <div className='mb-6 flex flex-wrap items-center gap-2 text-sm text-stone-600'>
              {isLoading && !response ? (
                <span>Loading products…</span>
              ) : error ? (
                <span className='text-rose-600'>Failed to load products</span>
              ) : (
                <span>
                  {meta.total === 0
                    ? 'No results'
                    : `${rangeStart}–${rangeEnd} of ${meta.total} results`}
                  {qParam ? (
                    <>
                      {' '}
                      for <span className='font-semibold text-fuchsia-700'>“{qParam}”</span>
                    </>
                  ) : null}
                </span>
              )}
              {isFetching && response ? (
                <span className='text-xs text-stone-400'>Updating…</span>
              ) : null}
              {(minRating != null ||
                inStockOnly ||
                onSaleOnly ||
                !!brandParam ||
                selectedSizes.length > 0 ||
                selectedColors.length > 0) && (
                <span className='rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800'>
                  Demo facets applied on this page
                </span>
              )}
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
                <p className='text-rose-600'>Couldn’t load the catalog.</p>
                <Button
                  type='button'
                  className='mt-4'
                  onClick={() => router.refresh()}
                >
                  Retry
                </Button>
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                  {filteredProducts.map((product) => (
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
                    ? 'No products match these filters.'
                    : 'No products available.'}
                </p>
                {activeChips.length > 0 && (
                  <Button
                    type='button'
                    variant='outline'
                    className='mt-4'
                    onClick={() => router.replace('/products')}
                  >
                    Clear filters
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
