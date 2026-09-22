import { Suspense } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { JsonLd } from '@/components/seo/JsonLd';
import { CategoryProductGrid } from '@/components/category/CategoryProductGrid';
import {
  categoryHref,
  subcategoryLabel,
  type CategoryDef,
} from '@/lib/categories';
import { getSiteUrl } from '@/lib/site';

type Props = {
  def: CategoryDef;
  subcategories: string[];
  subcategory?: string;
};

function GridFallback() {
  return (
    <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className='aspect-[3/4] animate-pulse rounded-xl bg-stone-200/70'
        />
      ))}
    </div>
  );
}

/** Server-rendered category landing: breadcrumbs, hero, chips, product grid */
export function CategoryLanding({ def, subcategories, subcategory }: Props) {
  const site = getSiteUrl();
  const subLabel = subcategory ? subcategoryLabel(subcategory) : undefined;

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: def.label, href: categoryHref(def.slug) },
    ...(subcategory && subLabel
      ? [{ name: subLabel, href: categoryHref(def.slug, subcategory) }]
      : []),
  ];

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${site}${crumb.href}`,
    })),
  };

  const chips = subcategory
    ? Array.from(new Set([subcategory, ...subcategories]))
    : subcategories;

  return (
    <div className='min-h-screen bg-stone-50'>
      <JsonLd data={breadcrumbJsonLd} />

      <div className='mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8'>
        <nav aria-label='Breadcrumb' className='mb-4'>
          <ol className='flex flex-wrap items-center gap-1 text-sm text-stone-500'>
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              return (
                <li key={crumb.href} className='flex items-center gap-1'>
                  {index > 0 ? (
                    <ChevronRight className='h-3.5 w-3.5' aria-hidden />
                  ) : null}
                  {isLast ? (
                    <span aria-current='page' className='font-semibold text-stone-900'>
                      {crumb.name}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className='transition-colors hover:text-stone-900'
                    >
                      {crumb.name}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <header className='mb-6 overflow-hidden rounded-2xl border border-stone-200 bg-white'>
          <div className='grid grid-cols-1 md:grid-cols-[1.4fr_1fr]'>
            <div className='p-6 sm:p-8'>
              <p className='text-xs font-medium uppercase tracking-wider text-fuchsia-700'>
                {subLabel ? def.label : 'Category'}
              </p>
              <h1 className='mt-2 text-3xl font-extrabold text-stone-900 sm:text-4xl'>
                {subLabel ?? def.label}
              </h1>
              <p className='mt-3 max-w-xl text-sm text-stone-600 sm:text-base'>
                {def.description}
              </p>
            </div>
            {def.image ? (
              <div className='relative min-h-[160px] border-t border-stone-200/80 md:border-l md:border-t-0'>
                <img
                  src={def.image}
                  alt=''
                  className='absolute inset-0 h-full w-full object-cover'
                  loading='eager'
                />
              </div>
            ) : null}
          </div>
        </header>

        {chips.length > 0 ? (
          <nav aria-label={`${def.label} subcategories`} className='mb-6'>
            <ul className='flex flex-wrap gap-2'>
              <li>
                <Link
                  href={categoryHref(def.slug)}
                  aria-current={!subcategory ? 'page' : undefined}
                  className={`inline-block rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    !subcategory
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                  }`}
                >
                  All {def.label}
                </Link>
              </li>
              {chips.map((sub) => {
                const active = sub === subcategory;
                return (
                  <li key={sub}>
                    <Link
                      href={categoryHref(def.slug, sub)}
                      aria-current={active ? 'page' : undefined}
                      className={`inline-block rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      {subcategoryLabel(sub)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}

        <Suspense fallback={<GridFallback />}>
          <CategoryProductGrid category={def.slug} subcategory={subcategory} />
        </Suspense>
      </div>
    </div>
  );
}
