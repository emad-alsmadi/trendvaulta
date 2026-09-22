'use client';

import Link from 'next/link';
import { ChevronRight, X, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useBrands } from '@/hooks/brands/brandsQuery';
import type { ProductFacets } from '@/types';

const categories = [
  {
    name: 'Makeup',
    slug: 'makeup',
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
    name: 'Perfumes',
    slug: 'perfumes',
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
    name: 'Clothing',
    slug: 'clothing',
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
    name: 'Skincare',
    slug: 'skincare',
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
    name: 'Accessories',
    slug: 'accessories',
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
    name: 'Home and Living',
    slug: 'home',
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

/** DEMO — “shopping ideas” shortcuts (href-only, original TrendVaulta copy) */
const shoppingIdeas = [
  { label: 'Beauty', href: '/products?category=makeup' },
  { label: 'Skincare', href: '/products?category=skincare' },
  { label: 'Fashion', href: '/products?category=clothing' },
  { label: 'Home', href: '/products?category=home' },
  { label: 'Gifts', href: '/products?q=gift' },
  { label: 'Offers', href: '/offers' },
];

const pricePresets = [
  { label: 'Under $25', min: '0', max: '25' },
  { label: '$25–$50', min: '25', max: '50' },
  { label: '$50–$100', min: '50', max: '100' },
  { label: '$100+', min: '100', max: '' },
];

/** Fallbacks shown until `meta.facets` arrives from GET /api/products?facets=true */
const defaultSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const defaultColors = [
  { name: 'Black', code: '#000000' },
  { name: 'White', code: '#FFFFFF' },
  { name: 'Red', code: '#EF4444' },
  { name: 'Blue', code: '#3B82F6' },
  { name: 'Green', code: '#10B981' },
  { name: 'Yellow', code: '#F59E0B' },
  { name: 'Pink', code: '#EC4899' },
  { name: 'Purple', code: '#8B5CF6' },
];

const ratings = [
  { value: 4, label: '4★ & Up' },
  { value: 3, label: '3★ & Up' },
  { value: 2, label: '2★ & Up' },
  { value: 1, label: '1★ & Up' },
];

type Props = {
  /** Close mobile drawer after category navigation / apply */
  onAfterNavigate?: () => void;
  /** `drawer` drops sticky positioning for mobile sheet */
  variant?: 'sidebar' | 'drawer';
  /** Disjunctive counts from `meta.facets` (undefined until first load) */
  facets?: ProductFacets;
};

function listParam(value: string | null): string[] {
  return value ? value.split(',').map((v) => v.trim()).filter(Boolean) : [];
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function Count({ value }: { value?: number }) {
  if (value === undefined) return null;
  return (
    <span className='ml-1 text-xs tabular-nums text-stone-400'>({value})</span>
  );
}

export function CategorySidebar({
  onAfterNavigate,
  variant = 'sidebar',
  facets,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentCategory = searchParams.get('category');
  const currentSubcategory = searchParams.get('subcategory');
  const urlMin = searchParams.get('minPrice');
  const urlMax = searchParams.get('maxPrice');
  const urlRating = searchParams.get('minRating');
  const urlInStock = ['1', 'true'].includes(searchParams.get('inStock') || '');
  const urlOnSale = ['1', 'true'].includes(searchParams.get('onSale') || '');
  const urlBrands = listParam(searchParams.get('brand'));
  const urlSizes = listParam(searchParams.get('size'));
  const urlColors = listParam(searchParams.get('color'));

  // Brand options: facet counts when loaded, else GET /api/brands (no counts).
  // Filter value is always the brand _id (server-side `brand=` filter).
  const { data: allBrands = [], isLoading: brandsLoading } = useBrands();
  const brandOptions = facets
    ? facets.brands.map((b) => ({ _id: b._id, name: b.name, count: b.count }))
    : allBrands.map((b) => ({ _id: b._id, name: b.name, count: undefined }));
  const sizeOptions = facets
    ? facets.sizes.map((s) => ({ value: s.value, count: s.count }))
    : defaultSizes.map((value) => ({ value, count: undefined }));
  const colorOptions = facets
    ? facets.colors.map((c) => ({
        name: c.value,
        code: c.colorCode || undefined,
        count: c.count,
      }))
    : defaultColors.map((c) => ({ ...c, count: undefined }));
  const ratingCount = (value: number) =>
    facets?.ratings.find((r) => r.value === value)?.count;
  const categoryCount = (value: string) =>
    facets?.categories.find((c) => c.value === value)?.count;
  const subcategoryCount = (value: string) =>
    facets?.subcategories.find((c) => c.value === value)?.count;
  /** Zero-count options are disabled unless already selected (so they can be cleared). */
  const isDisabled = (count: number | undefined, selected: boolean) =>
    count === 0 && !selected;

  // priceMin/priceMax are draft input values the user edits before clicking
  // "Apply" — they must reset to the URL's value whenever it changes from
  // outside this component (navigation, clear filters, browser back). Rather
  // than committing the '0'/'500' defaults then correcting them in an effect
  // after every URL change, reset during render by tracking the URL values
  // we last synced from (see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const [[syncedMin, syncedMax], setSyncedRange] = useState([urlMin, urlMax]);
  const [priceMin, setPriceMin] = useState(urlMin || '0');
  const [priceMax, setPriceMax] = useState(urlMax || '500');
  if (syncedMin !== urlMin || syncedMax !== urlMax) {
    setSyncedRange([urlMin, urlMax]);
    setPriceMin(urlMin || '0');
    setPriceMax(urlMax || '500');
  }

  const [expandedSections, setExpandedSections] = useState({
    ideas: true,
    categories: true,
    price: true,
    availability: true,
    brands: false,
    size: false,
    color: false,
    rating: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const pushParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : '/products');
    onAfterNavigate?.();
  };

  const toggleListParam = (key: 'size' | 'color' | 'brand', value: string) => {
    const current =
      key === 'size' ? urlSizes : key === 'color' ? urlColors : urlBrands;
    pushParams((params) => {
      const next = toggleValue(current, value);
      if (next.length) params.set(key, next.join(','));
      else params.delete(key);
    });
  };

  const applyPrice = () => {
    pushParams((params) => {
      const min = Number(priceMin);
      const max = Number(priceMax);
      if (!Number.isNaN(min) && min > 0) params.set('minPrice', String(min));
      else params.delete('minPrice');
      if (!Number.isNaN(max) && max > 0) params.set('maxPrice', String(max));
      else params.delete('maxPrice');
    });
  };

  const setRating = (value: number) => {
    pushParams((params) => {
      if (urlRating === String(value)) params.delete('minRating');
      else params.set('minRating', String(value));
    });
  };

  const clearFilters = () => {
    router.push('/products');
    onAfterNavigate?.();
  };

  const applyPricePreset = (min: string, max: string) => {
    pushParams((params) => {
      if (min) params.set('minPrice', min);
      else params.delete('minPrice');
      if (max) params.set('maxPrice', max);
      else params.delete('maxPrice');
      params.delete('page');
    });
    setPriceMin(min || '0');
    setPriceMax(max || '500');
  };

  const toggleFlag = (key: 'inStock' | 'onSale', enabled: boolean) => {
    pushParams((params) => {
      if (enabled) params.set(key, '1');
      else params.delete(key);
      params.delete('page');
    });
  };

  const hasActiveFilters = Boolean(
    currentCategory ||
      urlMin ||
      urlMax ||
      urlRating ||
      urlInStock ||
      urlOnSale ||
      urlBrands.length ||
      urlSizes.length ||
      urlColors.length,
  );

  return (
    <div
      className={
        variant === 'drawer' ? 'w-full' : 'w-full lg:w-64 lg:shrink-0'
      }
    >
      <div
        className={
          variant === 'drawer'
            ? 'rounded-xl border border-stone-100 bg-white p-3'
            : 'rounded-xl border border-stone-100 bg-white p-4 shadow-sm lg:sticky lg:top-24'
        }
      >
        {variant === 'sidebar' && (
          <div className='mb-4 flex items-center justify-between'>
            <h3 className='text-lg font-semibold text-stone-900'>Filters</h3>
            {hasActiveFilters && (
              <button
                type='button'
                onClick={clearFilters}
                className='flex items-center gap-1 text-xs font-medium text-fuchsia-600 hover:text-fuchsia-700'
              >
                <X className='h-3 w-3' />
                Clear All
              </button>
            )}
          </div>
        )}

        {/* Shopping ideas */}
        <div className='mb-4 border-b border-stone-100 pb-4'>
          <button
            type='button'
            onClick={() => toggleSection('ideas')}
            className='mb-3 flex w-full items-center justify-between'
          >
            <h4 className='text-sm font-semibold text-stone-900'>
              Popular ideas
            </h4>
            {expandedSections.ideas ? (
              <ChevronUp className='h-4 w-4 text-stone-500' />
            ) : (
              <ChevronDown className='h-4 w-4 text-stone-500' />
            )}
          </button>
          {expandedSections.ideas && (
            <ul className='flex flex-wrap gap-2'>
              {shoppingIdeas.map((idea) => (
                <li key={idea.label}>
                  <Link
                    href={idea.href}
                    onClick={() => onAfterNavigate?.()}
                    className='inline-block rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700 hover:border-fuchsia-300 hover:text-fuchsia-700'
                  >
                    {idea.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Categories */}
        <div className='mb-4 border-b border-stone-100 pb-4'>
          <button
            type='button'
            onClick={() => toggleSection('categories')}
            className='mb-3 flex w-full items-center justify-between'
          >
            <h4 className='text-sm font-semibold text-stone-900'>Categories</h4>
            {expandedSections.categories ? (
              <ChevronUp className='h-4 w-4 text-stone-500' />
            ) : (
              <ChevronDown className='h-4 w-4 text-stone-500' />
            )}
          </button>

          {expandedSections.categories && (
            <nav className='space-y-1'>
              {categories.map((category) => (
                <div key={category.slug}>
                  <Link
                    href={`/products?category=${category.slug}`}
                    onClick={() => onAfterNavigate?.()}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                      currentCategory === category.slug
                        ? 'bg-fuchsia-50 font-medium text-fuchsia-700'
                        : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span>
                      {category.name}
                      <Count value={categoryCount(category.slug)} />
                    </span>
                    <ChevronRight className='h-4 w-4' />
                  </Link>

                  {currentCategory === category.slug && (
                    <div className='ml-4 mt-1 space-y-1'>
                      {category.subcategories.map((sub) => (
                        <Link
                          key={sub}
                          href={`/products?category=${category.slug}&subcategory=${sub}`}
                          onClick={() => onAfterNavigate?.()}
                          className={`block px-3 py-1.5 text-xs capitalize transition-colors ${
                            currentSubcategory === sub
                              ? 'font-semibold text-fuchsia-700'
                              : 'text-stone-600 hover:text-fuchsia-600'
                          }`}
                        >
                          {sub.replace(/-/g, ' ')}
                          <Count value={subcategoryCount(sub)} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className='mt-3 border-t border-stone-200 pt-3'>
                <Link
                  href='/products'
                  onClick={() => onAfterNavigate?.()}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    !currentCategory
                      ? 'bg-fuchsia-50 font-medium text-fuchsia-700'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  All Products
                </Link>
              </div>
            </nav>
          )}
        </div>

        {/* Availability + deals — API flags (inStock / onSale) */}
        <div className='mb-4 border-b border-stone-100 pb-4'>
          <button
            type='button'
            onClick={() => toggleSection('availability')}
            className='mb-3 flex w-full items-center justify-between'
          >
            <h4 className='text-sm font-semibold text-stone-900'>Availability</h4>
            {expandedSections.availability ? (
              <ChevronUp className='h-4 w-4 text-stone-500' />
            ) : (
              <ChevronDown className='h-4 w-4 text-stone-500' />
            )}
          </button>
          {expandedSections.availability && (
            <div className='space-y-2'>
              <label className='flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-50'>
                <input
                  type='checkbox'
                  className='h-4 w-4 rounded border-stone-300 text-fuchsia-600 focus:ring-fuchsia-500'
                  checked={urlInStock}
                  disabled={isDisabled(facets?.inStock, urlInStock)}
                  onChange={(e) => toggleFlag('inStock', e.target.checked)}
                />
                <span>
                  In stock only
                  <Count value={facets?.inStock} />
                </span>
              </label>
              <label className='flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-50'>
                <input
                  type='checkbox'
                  className='h-4 w-4 rounded border-stone-300 text-fuchsia-600 focus:ring-fuchsia-500'
                  checked={urlOnSale}
                  disabled={isDisabled(facets?.onSale, urlOnSale)}
                  onChange={(e) => toggleFlag('onSale', e.target.checked)}
                />
                <span>
                  On sale
                  <Count value={facets?.onSale} />
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Brands — API-backed multi-select (brand=<id>,<id>) */}
        <div className='mb-4 border-b border-stone-100 pb-4'>
          <button
            type='button'
            onClick={() => toggleSection('brands')}
            className='mb-3 flex w-full items-center justify-between'
          >
            <h4 className='text-sm font-semibold text-stone-900'>
              Brands
            </h4>
            {expandedSections.brands ? (
              <ChevronUp className='h-4 w-4 text-stone-500' />
            ) : (
              <ChevronDown className='h-4 w-4 text-stone-500' />
            )}
          </button>
          {expandedSections.brands && (
            <ul className='max-h-64 space-y-1 overflow-y-auto'>
              {!facets && brandsLoading && brandOptions.length === 0 && (
                <li className='px-3 py-2 text-sm text-stone-400'>
                  Loading brands…
                </li>
              )}
              {(facets || !brandsLoading) && brandOptions.length === 0 && (
                <li className='px-3 py-2 text-sm text-stone-400'>
                  No brands yet
                </li>
              )}
              {brandOptions.map((brand) => {
                const selected = urlBrands.includes(brand._id);
                return (
                  <li key={brand._id}>
                    <label
                      className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                        selected
                          ? 'bg-fuchsia-50 font-medium text-fuchsia-700'
                          : 'text-stone-700 hover:bg-stone-50'
                      } ${isDisabled(brand.count, selected) ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <input
                        type='checkbox'
                        className='h-4 w-4 rounded border-stone-300 text-fuchsia-600 focus:ring-fuchsia-500'
                        checked={selected}
                        disabled={isDisabled(brand.count, selected)}
                        onChange={() => toggleListParam('brand', brand._id)}
                      />
                      <span className='min-w-0 flex-1 truncate'>{brand.name}</span>
                      <Count value={brand.count} />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Price Range — API-backed */}
        <div className='mb-4 border-b border-stone-100 pb-4'>
          <button
            type='button'
            onClick={() => toggleSection('price')}
            className='mb-3 flex w-full items-center justify-between'
          >
            <h4 className='text-sm font-semibold text-stone-900'>Price</h4>
            {expandedSections.price ? (
              <ChevronUp className='h-4 w-4 text-stone-500' />
            ) : (
              <ChevronDown className='h-4 w-4 text-stone-500' />
            )}
          </button>

          {expandedSections.price && (
            <div className='space-y-3'>
              <div className='flex flex-wrap gap-1.5'>
                {pricePresets.map((preset) => {
                  const active =
                    (urlMin || '0') === (preset.min || '0') &&
                    (urlMax || '') === (preset.max || '');
                  return (
                    <button
                      key={preset.label}
                      type='button'
                      onClick={() => applyPricePreset(preset.min, preset.max)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                        active
                          ? 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <div className='flex items-center gap-2'>
                <label className='sr-only' htmlFor='filter-min-price'>
                  Min price
                </label>
                <span className='text-xs font-medium text-stone-500'>$</span>
                <input
                  id='filter-min-price'
                  type='number'
                  min={0}
                  placeholder='Min'
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className='w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-fuchsia-500'
                />
              </div>
              <div className='flex items-center gap-2'>
                <label className='sr-only' htmlFor='filter-max-price'>
                  Max price
                </label>
                <span className='text-xs font-medium text-stone-500'>$</span>
                <input
                  id='filter-max-price'
                  type='number'
                  min={0}
                  placeholder='Max'
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className='w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-fuchsia-500'
                />
              </div>
              <button
                type='button'
                onClick={applyPrice}
                className='w-full rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800'
              >
                Apply price
              </button>
            </div>
          )}
        </div>

        {/* Size — API facet (variants.size) */}
        <div className='mb-4 border-b border-stone-100 pb-4'>
          <button
            type='button'
            onClick={() => toggleSection('size')}
            className='mb-3 flex w-full items-center justify-between'
          >
            <h4 className='text-sm font-semibold text-stone-900'>Size</h4>
            {expandedSections.size ? (
              <ChevronUp className='h-4 w-4 text-stone-500' />
            ) : (
              <ChevronDown className='h-4 w-4 text-stone-500' />
            )}
          </button>

          {expandedSections.size && (
            <div className='flex flex-wrap gap-2'>
              {sizeOptions.length === 0 && (
                <p className='px-1 text-sm text-stone-400'>No sizes here</p>
              )}
              {sizeOptions.map((size) => {
                const selected = urlSizes.includes(size.value);
                return (
                  <button
                    key={size.value}
                    type='button'
                    onClick={() => toggleListParam('size', size.value)}
                    aria-pressed={selected}
                    disabled={isDisabled(size.count, selected)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                      selected
                        ? 'border-fuchsia-600 bg-fuchsia-50 font-medium text-fuchsia-700'
                        : 'border-stone-300 text-stone-700 hover:border-stone-400'
                    }`}
                  >
                    {size.value}
                    <Count value={size.count} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Color — API facet (variants.color, case-insensitive) */}
        <div className='mb-4 border-b border-stone-100 pb-4'>
          <button
            type='button'
            onClick={() => toggleSection('color')}
            className='mb-3 flex w-full items-center justify-between'
          >
            <h4 className='text-sm font-semibold text-stone-900'>Color</h4>
            {expandedSections.color ? (
              <ChevronUp className='h-4 w-4 text-stone-500' />
            ) : (
              <ChevronDown className='h-4 w-4 text-stone-500' />
            )}
          </button>

          {expandedSections.color && (
            <div className='flex flex-wrap gap-3'>
              {colorOptions.length === 0 && (
                <p className='px-1 text-sm text-stone-400'>No colors here</p>
              )}
              {colorOptions.map((color) => {
                const selected = urlColors.some(
                  (c) => c.toLowerCase() === color.name.toLowerCase(),
                );
                const title =
                  color.count === undefined
                    ? color.name
                    : `${color.name} (${color.count})`;
                return (
                  <button
                    key={color.name}
                    type='button'
                    onClick={() => toggleListParam('color', color.name)}
                    aria-pressed={selected}
                    disabled={isDisabled(color.count, selected)}
                    className={`h-7 w-7 rounded-full border-2 transition-all hover:scale-110 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100 ${
                      selected
                        ? 'border-fuchsia-600 ring-2 ring-fuchsia-200'
                        : 'border-stone-300 hover:border-stone-400'
                    }`}
                    style={{
                      backgroundColor: color.code || '#d6d3d1',
                    }}
                    title={title}
                    aria-label={`Filter by ${title}`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Rating — API filter (minRating), single choice */}
        <div>
          <button
            type='button'
            onClick={() => toggleSection('rating')}
            className='mb-3 flex w-full items-center justify-between'
          >
            <h4 className='text-sm font-semibold text-stone-900'>
              Customer rating
            </h4>
            {expandedSections.rating ? (
              <ChevronUp className='h-4 w-4 text-stone-500' />
            ) : (
              <ChevronDown className='h-4 w-4 text-stone-500' />
            )}
          </button>

          {expandedSections.rating && (
            <div className='space-y-2' role='radiogroup' aria-label='Customer rating'>
              {ratings.map((rating) => {
                const selected = urlRating === String(rating.value);
                const count = ratingCount(rating.value);
                return (
                <button
                  key={rating.value}
                  type='button'
                  role='radio'
                  aria-checked={selected}
                  onClick={() => setRating(rating.value)}
                  disabled={isDisabled(count, selected)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected
                      ? 'bg-fuchsia-50 text-fuchsia-700'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className='flex items-center'>
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < rating.value
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-stone-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span>& Up</span>
                  <Count value={count} />
                </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
