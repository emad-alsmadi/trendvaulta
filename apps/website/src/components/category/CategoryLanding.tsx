import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { JsonLd } from '@/components/seo/JsonLd';
import { CategoryProductGrid } from '@/components/category/CategoryProductGrid';
import {
  categoryDescription,
  categoryHref,
  categoryLabel,
  subcategoryLabel,
  type CategoryDef,
} from '@/lib/categories';
import { getSiteUrl } from '@/lib/site';
import { getTranslation } from '@/lib/i18n-server';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';

type Props = {
  def: CategoryDef;
  subcategories: string[];
  subcategory?: string;
};

function GridFallback() {
  return (
    <ProductGridSkeleton className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' />
  );
}

/** Server-rendered category landing: breadcrumbs, hero, chips, product grid */
export async function CategoryLanding({
  def,
  subcategories,
  subcategory,
}: Props) {
  const { t } = await getTranslation();
  const site = getSiteUrl();
  const label = categoryLabel(def, t);
  const subLabel = subcategory ? subcategoryLabel(subcategory, t) : undefined;

  const crumbs = [
    { name: t('common.home'), href: '/' },
    { name: label, href: categoryHref(def.slug) },
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

  const tabClass = (active: boolean) =>
    `inline-block whitespace-nowrap border-b-2 pb-3 pt-1 text-sm transition-colors duration-(--dur-fast) ${
      active
        ? 'border-ink font-semibold text-ink'
        : 'border-transparent text-ink-muted hover:text-ink'
    }`;

  return (
    <div className='-mx-4 -my-6 bg-surface px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-20 lg:px-20 lg:py-10'>
      <JsonLd data={breadcrumbJsonLd} />

      <div className='mx-auto max-w-[1400px]'>
        <nav aria-label={t('nav.breadcrumb')}>
          <ol className='flex flex-wrap items-center gap-1.5 text-xs text-ink-muted'>
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              return (
                <li key={crumb.href} className='flex items-center gap-1.5'>
                  {index > 0 ? (
                    <ChevronRight className='h-3 w-3 rtl:-scale-x-100' aria-hidden />
                  ) : null}
                  {isLast ? (
                    <span aria-current='page' className='text-ink'>
                      {crumb.name}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className='transition-colors hover:text-ink'
                    >
                      {crumb.name}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Editorial banner: the category image carries the section, copy sits
            on a dark wash so it stays readable over any photo. */}
        <header className='relative mt-5 overflow-hidden rounded-panel bg-ink'>
          {def.image ? (
            <>
              <Image
                src={def.image}
                alt=''
                fill
                className='object-cover'
                priority
                sizes='(max-width: 1400px) 100vw, 1400px'
              />
              <div
                aria-hidden
                className='absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/45 to-ink/10'
              />
            </>
          ) : null}
          <div className='relative flex min-h-[240px] flex-col justify-end p-6 sm:min-h-[340px] sm:p-10 lg:p-14'>
            <p className='text-eyebrow uppercase text-white/80 rtl:tracking-normal'>
              {subLabel ? label : t('catalog.category.eyebrow')}
            </p>
            <h1 className='mt-3 text-4xl font-semibold tracking-tight text-white sm:text-display'>
              {subLabel ?? label}
            </h1>
            <p className='mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base'>
              {categoryDescription(def, t)}
            </p>
          </div>
        </header>

        {chips.length > 0 ? (
          <nav
            aria-label={t('catalog.category.subcategoriesAria', {
              category: label,
            })}
            className='mt-8 border-b border-line'
          >
            <ul className='hide-scrollbar -mb-px flex gap-6 overflow-x-auto sm:gap-8'>
              <li className='shrink-0'>
                <Link
                  href={categoryHref(def.slug)}
                  aria-current={!subcategory ? 'page' : undefined}
                  className={tabClass(!subcategory)}
                >
                  {t('catalog.category.all', { category: label })}
                </Link>
              </li>
              {chips.map((sub) => {
                const active = sub === subcategory;
                return (
                  <li key={sub} className='shrink-0'>
                    <Link
                      href={categoryHref(def.slug, sub)}
                      aria-current={active ? 'page' : undefined}
                      className={tabClass(active)}
                    >
                      {subcategoryLabel(sub, t)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}

        <div className='mt-6'>
          <Suspense fallback={<GridFallback />}>
            <CategoryProductGrid category={def.slug} subcategory={subcategory} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
