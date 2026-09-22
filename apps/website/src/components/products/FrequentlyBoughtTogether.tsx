'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/lib/cartStore';
import {
  useProductBundles,
  useProducts,
} from '@/hooks/products/productsQuery';
import {
  getDemoBundlePricing,
  pickBundleCompanions,
} from '@/data/demoStorefront';

type BundleProduct = {
  _id: string;
  title: string;
  price: number;
  cover: string;
  category?: string;
  stock?: number;
};

type Props = {
  primary: BundleProduct;
};

/**
 * Frequently-bought-together module (PDP).
 * Prefers GET /api/products/:id/bundles; falls back to demo companion picks.
 * Cart add uses real product prices; API savings are display-only.
 */
export function FrequentlyBoughtTogether({ primary }: Props) {
  const cart = useCart();
  const bundlesQuery = useProductBundles(primary._id);
  const apiItems = (bundlesQuery.data?.items ?? []) as BundleProduct[];
  const useApi = bundlesQuery.isSuccess && apiItems.length > 0;
  const useFallback =
    bundlesQuery.isFetched &&
    (!bundlesQuery.isSuccess || apiItems.length === 0);

  const {
    data,
    isLoading: catalogLoading,
    error: catalogError,
  } = useProducts(
    {
      page: 1,
      limit: 16,
      sort: 'createdAt',
      ...(primary.category ? { category: primary.category } : {}),
    },
    { enabled: useFallback },
  );
  const catalog = useMemo(
    () => (data?.data ?? []) as BundleProduct[],
    [data],
  );

  const demoCompanions = useMemo(
    () =>
      pickBundleCompanions(catalog, {
        primaryId: primary._id,
        category: primary.category,
        limit: 2,
      }),
    [catalog, primary._id, primary.category],
  );

  const companions = useApi ? apiItems : demoCompanions;

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const effectiveSelected = useMemo(() => {
    if (Object.keys(selected).length > 0) return selected;
    return {
      [primary._id]: true,
      ...Object.fromEntries(companions.map((p) => [p._id, true])),
    };
  }, [companions, primary._id, selected]);

  const allItems = useMemo(
    () => [primary, ...companions],
    [primary, companions],
  );

  const selectedItems = allItems.filter((p) => effectiveSelected[p._id]);

  const pricing = useMemo(() => {
    const prices = selectedItems.map((p) => p.price);
    const demo = getDemoBundlePricing(prices);
    const fullApiSelection =
      useApi &&
      selectedItems.length === allItems.length &&
      selectedItems.length > 1;
    const apiSavings = bundlesQuery.data?.savings;
    const apiBundlePrice = bundlesQuery.data?.bundlePrice;

    if (
      fullApiSelection &&
      typeof apiSavings === 'number' &&
      typeof apiBundlePrice === 'number'
    ) {
      return {
        subtotal: demo.subtotal,
        bundleTotal: apiBundlePrice,
        savings: apiSavings,
      };
    }

    if (useApi) {
      return {
        subtotal: demo.subtotal,
        bundleTotal: demo.subtotal,
        savings: 0,
      };
    }

    return demo;
  }, [
    allItems.length,
    bundlesQuery.data?.bundlePrice,
    bundlesQuery.data?.savings,
    selectedItems,
    useApi,
  ]);

  const toggle = (id: string) => {
    // Primary stays selected — FBT always includes the viewed product
    if (id === primary._id) return;
    setSelected((prev) => {
      const base =
        Object.keys(prev).length > 0
          ? prev
          : {
              [primary._id]: true,
              ...Object.fromEntries(companions.map((p) => [p._id, true])),
            };
      return { ...base, [id]: !base[id] };
    });
  };

  const handleAddBundle = () => {
    selectedItems.forEach((p) => {
      cart.addToCart({
        productId: p._id,
        title: p.title,
        price: p.price,
        cover: p.cover,
        qty: 1,
      });
    });
  };

  const isLoading =
    bundlesQuery.isLoading || (useFallback && catalogLoading);

  if (isLoading) {
    return (
      <section
        aria-labelledby='fbt-heading'
        className='mb-8 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8'
      >
        <div className='flex items-center gap-2 text-sm text-stone-500'>
          <Loader2
            className='h-4 w-4 animate-spin'
            aria-hidden
          />
          Loading bundle suggestions…
        </div>
      </section>
    );
  }

  if (useFallback && (catalogError || companions.length === 0)) return null;
  if (!useFallback && companions.length === 0) return null;

  return (
    <section
      aria-labelledby='fbt-heading'
      className='mb-8 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8'
    >
      <div className='mb-5 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <p className='text-xs font-medium uppercase tracking-wider text-stone-500'>
            {useApi
              ? 'Frequently bought together'
              : 'Demo · frequently bought together'}
          </p>
          <h2
            id='fbt-heading'
            className='mt-1 text-xl font-bold text-stone-900 sm:text-2xl'
          >
            Buy it with
          </h2>
          <p className='mt-1 text-sm text-stone-600'>
            {useApi
              ? 'Suggested companions for this product. Bundle savings are display-only — checkout still uses real product prices.'
              : 'Companion picks from the catalog. Bundle savings are demo-only — checkout still uses real product prices.'}
          </p>
        </div>
        {pricing.savings > 0 && selectedItems.length > 1 && (
          <span className='rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900'>
            {useApi ? 'Save' : 'Demo save'} ${pricing.savings.toFixed(2)}
          </span>
        )}
      </div>

      <ul className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch'>
        {allItems.map((item, index) => {
          const checked = !!effectiveSelected[item._id];
          const inStock = item.stock === undefined || item.stock > 0;
          const isPrimary = item._id === primary._id;
          return (
            <li
              key={item._id}
              className='flex items-stretch gap-2 sm:max-w-[220px] sm:flex-1'
            >
              {index > 0 && (
                <div
                  className='hidden items-center text-stone-400 sm:flex'
                  aria-hidden
                >
                  <Plus className='h-5 w-5' />
                </div>
              )}
              <label
                className={`flex w-full cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
                  checked
                    ? 'border-fuchsia-300 bg-fuchsia-50/40'
                    : 'border-stone-200 bg-stone-50'
                } ${!inStock ? 'opacity-60' : ''}`}
              >
                <input
                  type='checkbox'
                  className='mt-1 h-4 w-4 rounded border-stone-300 text-fuchsia-600 focus:ring-fuchsia-500'
                  checked={checked}
                  disabled={!inStock || isPrimary}
                  onChange={() => toggle(item._id)}
                  aria-label={
                    isPrimary
                      ? `${item.title} (this product)`
                      : `Select ${item.title}`
                  }
                />
                <div className='min-w-0 flex-1'>
                  {isPrimary ? (
                    <div className='flex gap-3'>
                      <Image
                        src={item.cover}
                        alt={item.title}
                        width={64}
                        height={64}
                        className='shrink-0 rounded-lg object-cover bg-stone-100'
                      />
                      <div className='min-w-0'>
                        <p className='text-[10px] font-semibold uppercase tracking-wide text-fuchsia-700'>
                          This item
                        </p>
                        <p className='line-clamp-2 text-sm font-medium text-stone-900'>
                          {item.title}
                        </p>
                        <p className='mt-1 text-sm font-semibold text-stone-800'>
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={`/products/${item._id}`}
                      className='flex gap-3'
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Image
                        src={item.cover}
                        alt={item.title}
                        width={64}
                        height={64}
                        className='shrink-0 rounded-lg object-cover bg-stone-100'
                      />
                      <div className='min-w-0'>
                        <p className='line-clamp-2 text-sm font-medium text-stone-900'>
                          {item.title}
                        </p>
                        <p className='mt-1 text-sm font-semibold text-stone-800'>
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
                    </Link>
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      <div className='mt-6 flex flex-col gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:items-center sm:justify-between'>
        <div className='text-sm text-stone-600'>
          {selectedItems.length <= 1 ? (
            <span>Select a companion to build a bundle</span>
          ) : (
            <>
              {pricing.savings > 0 && (
                <span className='text-stone-500 line-through mr-2'>
                  ${pricing.subtotal.toFixed(2)}
                </span>
              )}
              <span className='font-semibold text-stone-900'>
                ${pricing.bundleTotal.toFixed(2)}
              </span>
              <span className='ml-1 text-xs text-stone-500'>
                for {selectedItems.length} items
                {useApi ? ' (display total)' : ' (demo total)'}
              </span>
            </>
          )}
        </div>
        <Button
          type='button'
          onClick={handleAddBundle}
          disabled={selectedItems.length === 0}
          className='gap-2'
        >
          <ShoppingCart
            className='h-4 w-4'
            aria-hidden
          />
          Add {selectedItems.length} to cart
        </Button>
      </div>
    </section>
  );
}
