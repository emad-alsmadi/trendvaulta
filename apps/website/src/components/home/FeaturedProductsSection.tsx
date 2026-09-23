'use client';

import Link from 'next/link';
import { ProductCard } from '@/components/products/ProductCard';
import type { ProductCardBadge } from '@/components/products/ProductCard';
import type { Product } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';

type Props = {
  products: Product[];
  loading?: boolean;
  error?: string | null;
};

/** Product.badges is computed server-side (bestseller / new / lowStock). */
function badgesFromProduct(product: Product): ProductCardBadge[] {
  return (product.badges ?? []).filter(
    (b): b is ProductCardBadge =>
      b === 'bestseller' || b === 'new' || b === 'lowStock',
  );
}

/**
 * Featured / best-sellers rail — GET /api/products?sort=bestselling&limit=8
 */
export function FeaturedProductsSection({
  products,
  loading = false,
  error = null,
}: Props) {
  const { t } = useTranslation();
  const [loadErrorBefore, loadErrorAfter = ''] = t(
    'home.featured.loadError',
  ).split('{link}');
  return (
    <section
      aria-labelledby='featured-heading'
      className='bg-white py-12 sm:py-16'
    >
      <div className='mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8'>
        <div className='mb-6 flex items-end justify-between gap-4'>
          <div>
            <p className='text-xs font-medium uppercase tracking-wider text-fuchsia-700'>
              {t('home.featured.eyebrow')}
            </p>
            <h2
              id='featured-heading'
              className='mt-1 text-2xl font-extrabold text-stone-900 sm:text-3xl'
            >
              {t('home.featured.title')}
            </h2>
            <p className='mt-1 text-sm text-stone-600'>
              {t('home.featured.subtitle')}
            </p>
          </div>
          <Link
            href='/products'
            className='text-sm font-semibold text-fuchsia-700 hover:text-fuchsia-800'
          >
            {t('home.featured.viewCatalog')}
          </Link>
        </div>

        {loading && (
          <p className='py-10 text-center text-sm text-stone-500'>
            {t('home.featured.loading')}
          </p>
        )}

        {!loading && error && (
          <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-700'>
            {loadErrorBefore}
            <Link
              href='/products'
              className='font-semibold underline'
            >
              {t('home.featured.fullCatalog')}
            </Link>
            {loadErrorAfter}
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className='rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-10 text-center text-sm text-stone-600'>
            {t('home.featured.empty')}
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className='grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4'>
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                badges={badgesFromProduct(product)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
