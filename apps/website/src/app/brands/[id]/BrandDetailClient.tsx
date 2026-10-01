'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useBrandById } from '@/hooks/brands/brandsQuery';
import { useProducts } from '@/hooks/products/productsQuery';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  MapPin,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { ProductCard } from '@/components/products/ProductCard';
import { Pagination } from '@/components/ui/Pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useTranslation } from '@/contexts/TranslationContext';
import { ProductGridSkeleton, Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';

const LIMIT = 12;
const GRID = 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

const sortOptions = [
  { value: 'createdAt', labelKey: 'catalog.sort.featured' },
  { value: 'bestselling', labelKey: 'catalog.sort.bestselling' },
  { value: 'price', labelKey: 'catalog.sort.priceAsc' },
  { value: '-price', labelKey: 'catalog.sort.priceDesc' },
  { value: '-averageRating', labelKey: 'catalog.sort.rating' },
  { value: '-createdAt', labelKey: 'catalog.sort.newest' },
];

export function BrandDetailClient({ id }: { id: string }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('createdAt');
  const {
    data: brand,
    isLoading: brandLoading,
    error: brandError,
  } = useBrandById(id);
  const {
    data: productsResponse,
    isLoading: productsLoading,
    isFetching: productsFetching,
  } = useProducts({
    brand: id,
    limit: LIMIT,
    sort,
    page,
  });
  const products = productsResponse?.data || [];
  const totalProducts = productsResponse?.meta?.total ?? products.length;
  const totalPages = productsResponse?.meta?.pages ?? 1;

  if (brandLoading) {
    return (
      <SkeletonGroup
        label={t('brandsPage.detail.loading')}
        className='mx-auto max-w-[1320px] py-6'
      >
        <div aria-hidden className='flex flex-col items-center gap-5 py-8'>
          <Skeleton className='h-28 w-28 shrink-0 rounded-full' />
          <Skeleton className='h-9 w-56 max-w-full' />
          <Skeleton className='h-4 w-80 max-w-full' />
        </div>
        <ProductGridSkeleton className={`mt-10 ${GRID}`} />
      </SkeletonGroup>
    );
  }

  if (brandError || !brand) {
    return (
      <div className='flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center'>
        <p className='text-heading text-ink'>
          {t('brandsPage.detail.notFound')}
        </p>
        <Link
          href='/brands'
          className='text-sm font-semibold text-ink underline underline-offset-4 hover:text-accent'
        >
          {t('brandsPage.title')}
        </Link>
      </div>
    );
  }

  const trustItems = [
    {
      icon: ShieldCheck,
      title: t('brandsPage.detail.trust.secureCheckout'),
      text: t('brandsPage.detail.trust.secureCheckoutText'),
    },
    {
      icon: BadgeCheck,
      title: t('brandsPage.detail.trust.authentic'),
      text: t('brandsPage.detail.trust.authenticText', { brand: brand.name }),
    },
    {
      icon: Star,
      title: t('productPage.reviews.title'),
      text: t('brandsPage.detail.trust.reviewsText'),
    },
  ];

  return (
    <div className='-mx-4 -my-6 bg-surface px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-20 lg:px-20 lg:py-10'>
      <div className='mx-auto max-w-[1320px]'>
        <nav aria-label={t('nav.breadcrumb')}>
          <ol className='flex flex-wrap items-center gap-1.5 text-xs text-ink-muted'>
            <li>
              <Link href='/' className='transition-colors hover:text-ink'>
                {t('common.home')}
              </Link>
            </li>
            <li className='flex items-center gap-1.5'>
              <ChevronRight className='h-3 w-3 rtl:-scale-x-100' aria-hidden />
              <Link href='/brands' className='transition-colors hover:text-ink'>
                {t('brandsPage.title')}
              </Link>
            </li>
            <li className='flex items-center gap-1.5'>
              <ChevronRight className='h-3 w-3 rtl:-scale-x-100' aria-hidden />
              <span aria-current='page' className='text-ink'>
                {brand.name}
              </span>
            </li>
          </ol>
        </nav>

        {/* Brand header */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className='mx-auto flex max-w-3xl flex-col items-center py-10 text-center sm:py-14'
        >
          <BrandLogo
            src={brand.logo}
            alt={brand.name}
            width={112}
            height={112}
            className='h-full w-full object-contain'
            frameClassName='h-28 w-28 overflow-hidden rounded-full border border-line bg-surface p-4 shadow-soft'
            fallback={
              <span
                aria-hidden
                className='flex h-28 w-28 items-center justify-center rounded-full border border-line bg-surface-muted text-4xl font-semibold text-ink shadow-soft'
              >
                {brand.name.charAt(0).toUpperCase()}
              </span>
            }
          />

          {brand.country && (
            <p className='mt-6 inline-flex items-center gap-1.5 text-eyebrow uppercase text-ink-muted rtl:tracking-normal'>
              <MapPin className='h-3.5 w-3.5' aria-hidden />
              {brand.country}
            </p>
          )}
          <h1
            className={`text-4xl font-semibold tracking-tight text-ink sm:text-display ${brand.country ? 'mt-3' : 'mt-6'}`}
          >
            {brand.name}
          </h1>
          {brand.description && (
            <p className='mt-4 text-base leading-relaxed text-ink-muted'>
              {brand.description}
            </p>
          )}
          {brand.website && (
            <a
              href={brand.website}
              target='_blank'
              rel='noopener noreferrer'
              className='mt-6 inline-flex items-center gap-1.5 border-b border-ink pb-0.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent'
            >
              {t('brandsPage.visitWebsite')}
              <ArrowUpRight className='h-4 w-4 rtl:-scale-x-100' aria-hidden />
            </a>
          )}
        </motion.header>

        {/* Products */}
        <section aria-labelledby='brand-products-heading'>
          <div className='flex flex-col gap-3 border-y border-line py-4 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
              <h2
                id='brand-products-heading'
                className='text-heading text-ink'
              >
                {t('brandsPage.detail.productsFrom', { brand: brand.name })}
              </h2>
              <span
                role='status'
                className='text-sm tabular-nums text-ink-muted'
              >
                {t('brandsPage.detail.productCount', { count: totalProducts })}
                {productsFetching && productsResponse ? (
                  <span className='ms-2 text-xs text-ink-subtle'>
                    {t('catalog.updating')}
                  </span>
                ) : null}
              </span>
            </div>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label={t('catalog.sortLabel')}
                className='w-full sm:w-52'
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align='end'>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='mt-8'>
            {productsLoading && !productsResponse ? (
              <ProductGridSkeleton className={GRID} />
            ) : products.length > 0 ? (
              <>
                <div className={GRID}>
                  {products.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      badges={product.badges ?? []}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className='mt-10'>
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={(next) => {
                        setPage(next);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className='rounded-card bg-surface-muted px-6 py-16 text-center'>
                <p className='text-base text-ink-muted'>
                  {t('brandsPage.detail.emptyProducts')}
                </p>
                <Link
                  href='/products'
                  className='mt-4 inline-block text-sm font-semibold text-ink underline underline-offset-4 hover:text-accent'
                >
                  {t('catalog.browseAll')}
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Trust */}
        <ul className='mt-16 grid grid-cols-1 divide-y divide-line border-y border-line md:grid-cols-3 md:divide-x md:divide-y-0 md:rtl:divide-x-reverse'>
          {trustItems.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className='flex items-start gap-4 px-2 py-6 md:px-8'
            >
              <Icon
                className='mt-0.5 h-6 w-6 shrink-0 text-ink'
                strokeWidth={1.5}
                aria-hidden
              />
              <div>
                <h3 className='text-sm font-semibold text-ink'>{title}</h3>
                <p className='mt-1 text-sm text-ink-muted'>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
