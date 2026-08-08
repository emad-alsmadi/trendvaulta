'use client';

import Link from 'next/link';
import { ProductCard } from '@/components/products/ProductCard';
import type { ProductCardBadge } from '@/components/products/ProductCard';
import { getDemoBadgesForIndex } from '@/data/demoStorefront';
import type { Product } from '@/types';

type Props = {
  products: Product[];
  loading?: boolean;
  error?: string | null;
};

function badgesFromProduct(
  product: Product,
  index: number,
): ProductCardBadge[] {
  if (product.badges?.length) {
    return product.badges.filter(
      (b): b is ProductCardBadge =>
        b === 'bestseller' || b === 'new' || b === 'lowStock',
    );
  }
  // DEMO until Product.badges ships from API
  return getDemoBadgesForIndex(index);
}

/**
 * Featured / best-sellers rail — GET /api/products?sort=bestselling&limit=8
 */
export function FeaturedProductsSection({
  products,
  loading = false,
  error = null,
}: Props) {
  return (
    <section
      aria-labelledby='featured-heading'
      className='bg-white py-12 sm:py-16'
    >
      <div className='mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8'>
        <div className='mb-6 flex items-end justify-between gap-4'>
          <div>
            <p className='text-xs font-medium uppercase tracking-wider text-fuchsia-700'>
              Bestsellers
            </p>
            <h2
              id='featured-heading'
              className='mt-1 text-2xl font-extrabold text-stone-900 sm:text-3xl'
            >
              Featured picks
            </h2>
            <p className='mt-1 text-sm text-stone-600'>
              Top sellers from the catalog
            </p>
          </div>
          <Link
            href='/products'
            className='text-sm font-semibold text-fuchsia-700 hover:text-fuchsia-800'
          >
            View catalog
          </Link>
        </div>

        {loading && (
          <p className='py-10 text-center text-sm text-stone-500'>
            Loading featured products…
          </p>
        )}

        {!loading && error && (
          <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-700'>
            Could not load products. Browse the{' '}
            <Link
              href='/products'
              className='font-semibold underline'
            >
              full catalog
            </Link>
            .
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className='rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-10 text-center text-sm text-stone-600'>
            No products yet. Seed the catalog or check API connectivity.
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className='grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4'>
            {products.map((product, index) => (
              <ProductCard
                key={product._id}
                product={product}
                badges={badgesFromProduct(product, index)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
