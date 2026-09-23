'use client';

import Link from 'next/link';
import { DEMO_FEATURED_BRANDS, type DemoBrand } from '@/data/demoStorefront';
import { useFeaturedBrands } from '@/hooks/brands/brandsQuery';
import type { Brand } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';
import type { Translate } from '@/lib/i18n';

type Props = {
  /** Optional override (tests / storybook). When omitted, fetches featured brands. */
  brands?: DemoBrand[];
};

const ACCENTS = [
  'from-rose-500 to-amber-400',
  'from-slate-700 to-stone-500',
  'from-teal-600 to-cyan-500',
  'from-zinc-800 to-neutral-600',
  'from-fuchsia-600 to-violet-500',
  'from-amber-600 to-orange-400',
  'from-emerald-600 to-teal-400',
  'from-sky-600 to-indigo-500',
] as const;

function mapApiBrandToStripItem(
  brand: Partial<Brand>,
  index: number,
  t: Translate,
): DemoBrand {
  const id = String(brand?._id ?? index);
  const slugOrId = brand?.slug || brand?._id || id;
  const description =
    typeof brand?.description === 'string' ? brand.description.trim() : '';
  const tagline =
    description ||
    (brand?.country
      ? t('home.brands.fromCountry', { country: brand.country })
      : t('home.brands.shopCollection'));

  return {
    id,
    name: brand?.name || t('home.brands.fallbackName'),
    tagline,
    href: `/brands/${slugOrId}`,
    accent: ACCENTS[index % ACCENTS.length],
  };
}

/** Featured houses — GET /api/brands?featured=true&limit=8; demo fallback if empty/error */
export function FeaturedBrandsStrip({ brands: brandsProp }: Props) {
  const { t } = useTranslation();
  const { data, isError } = useFeaturedBrands(8);

  const fromApi =
    !brandsProp && !isError && Array.isArray(data) && data.length > 0
      ? data.map((brand, index) => mapApiBrandToStripItem(brand, index, t))
      : [];

  const brands =
    brandsProp ?? (fromApi.length > 0 ? fromApi : DEMO_FEATURED_BRANDS);
  const usingDemo = !brandsProp && fromApi.length === 0;

  return (
    <section
      aria-labelledby='brands-heading'
      className='border-t border-stone-200 bg-stone-50 py-12 sm:py-16'
    >
      <div className='mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8'>
        <div className='mb-6'>
          <p className='text-xs font-medium uppercase tracking-wider text-stone-500'>
            {usingDemo
              ? t('home.brands.eyebrowDemo')
              : t('home.brands.eyebrow')}
          </p>
          <h2
            id='brands-heading'
            className='mt-1 text-2xl font-extrabold text-stone-900 sm:text-3xl'
          >
            {t('home.brands.title')}
          </h2>
          <p className='mt-1 text-sm text-stone-600'>
            {usingDemo
              ? t('home.brands.subtitleDemo')
              : t('home.brands.subtitle')}
          </p>
        </div>

        <ul className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={brand.href}
                className='flex h-full flex-col justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500'
              >
                <div
                  className={`mb-4 h-1.5 w-12 rounded-full bg-gradient-to-r ${brand.accent}`}
                  aria-hidden
                />
                <div>
                  <h3 className='text-lg font-semibold text-stone-900'>
                    {brand.name}
                  </h3>
                  <p className='mt-1 text-sm text-stone-600'>{brand.tagline}</p>
                </div>
                <span className='mt-4 text-sm font-semibold text-fuchsia-700'>
                  {t('home.brands.explore')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
