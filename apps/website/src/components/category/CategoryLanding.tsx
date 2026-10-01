import { Suspense } from 'react';
import Link from 'next/link';
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

      {/* Typographic header, edge to edge: the negative margins cancel the
          page gutters (and the top padding, so it sits flush under the
          navbar); the copy inside lines up with the content below. No photo
          on purpose: the category images are small generic stock shots that
          fall apart when stretched, so type, a soft accent glow and a ring
          motif carry it. */}
      <header className='relative -mx-4 -mt-6 overflow-hidden bg-surface-sunken sm:-mx-6 lg:-mx-20 lg:-mt-10'>
        <div
          aria-hidden
          className='absolute inset-0 bg-[radial-gradient(55%_130%_at_0%_0%,var(--color-accent-soft),transparent_70%)] rtl:bg-[radial-gradient(55%_130%_at_100%_0%,var(--color-accent-soft),transparent_70%)]'
        />
        {/* Concentric rings off the far corner: decoration that reads the
            same in Arabic and English and never sits behind the copy. */}
        <div
          aria-hidden
          className='pointer-events-none absolute -bottom-44 -end-28 hidden h-[30rem] w-[30rem] sm:block'
        >
          <span className='absolute inset-0 rounded-full border border-ink/[0.06]' />
          <span className='absolute inset-12 rounded-full border border-ink/[0.07]' />
          <span className='absolute inset-24 rounded-full border border-accent/25' />
          <span className='absolute inset-36 rounded-full border border-ink/[0.08]' />
          <span className='absolute inset-48 rounded-full bg-accent-soft' />
        </div>

        <div className='relative px-4 pb-10 pt-6 sm:px-6 sm:pb-14 lg:px-20 lg:pb-16 lg:pt-8'>
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

            <p className='mt-8 inline-flex items-center gap-2.5 text-eyebrow uppercase text-ink-muted sm:mt-12 rtl:tracking-normal'>
              <span aria-hidden className='h-px w-8 bg-accent' />
              {subLabel ? label : t('catalog.category.eyebrow')}
            </p>
            <h1 className='mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-display'>
              {subLabel ?? label}
            </h1>
            <p className='mt-4 max-w-xl text-sm leading-relaxed text-ink-muted sm:text-base'>
              {categoryDescription(def, t)}
            </p>
          </div>
        </div>
      </header>

      <div className='mx-auto max-w-[1400px]'>

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
