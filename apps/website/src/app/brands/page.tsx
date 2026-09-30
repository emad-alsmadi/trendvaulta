'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useBrands } from '@/hooks/brands/brandsQuery';
import { useTranslation } from '@/contexts/TranslationContext';
import { intlLocale } from '@/lib/locale';
import { MediaTileSkeleton, PageHeaderSkeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import type { Brand } from '@/types';

const EASE = [0.22, 1, 0.36, 1] as const; // --ease-brand

/** First letter for the A–Z index; digits and symbols share '#'. */
function indexLetter(name: string, locale: string) {
  const first = name.trim().charAt(0);
  return /\p{L}/u.test(first) ? first.toLocaleUpperCase(locale) : '#';
}

function BrandTile({ brand, index }: { brand: Brand; index: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.04, ease: EASE }}
    >
      <Link
        href={`/brands/${brand._id}`}
        className='group block rounded-card text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4'
      >
        <span className='relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-card bg-surface shadow-soft transition-[box-shadow,transform] duration-(--dur-base) ease-brand group-hover:-translate-y-0.5 group-hover:shadow-raised'>
          {brand.logo ? (
            <Image
              src={brand.logo}
              alt=''
              width={160}
              height={96}
              className='max-h-[45%] w-auto max-w-[60%] object-contain opacity-80 grayscale transition-[filter,opacity] duration-(--dur-slow) ease-brand group-hover:opacity-100 group-hover:grayscale-0'
            />
          ) : (
            // No logo: a typographic wordmark instead of an icon bubble.
            <span dir='auto' className='px-4 text-center text-2xl font-bold tracking-tight text-ink-subtle transition-colors duration-(--dur-base) group-hover:text-ink'>
              {brand.name}
            </span>
          )}
        </span>
        <span dir='auto' className='mt-3 block truncate text-sm font-semibold text-ink transition-colors duration-(--dur-fast) group-hover:text-accent'>
          {brand.name}
        </span>
        {brand.country && (
          <span dir='auto' className='mt-0.5 block truncate text-xs text-ink-muted'>
            {brand.country}
          </span>
        )}
      </Link>
    </motion.li>
  );
}

export default function BrandsPage() {
  const { data: brands, isLoading, error } = useBrands();
  const { t, locale } = useTranslation();
  const [query, setQuery] = useState('');

  const intl = intlLocale(locale);
  const groups = useMemo(() => {
    const collator = new Intl.Collator(intl, { sensitivity: 'base', numeric: true });
    const q = query.trim().toLocaleLowerCase(intl);
    const list = (brands ?? [])
      .filter((b) => !q || b.name.toLocaleLowerCase(intl).includes(q))
      .sort((a, b) => collator.compare(a.name, b.name));
    const map = new Map<string, Brand[]>();
    for (const brand of list) {
      const letter = indexLetter(brand.name, intl);
      map.set(letter, [...(map.get(letter) ?? []), brand]);
    }
    // '#' last, letters in collation order.
    return [...map.entries()].sort(([a], [b]) =>
      a === '#' ? 1 : b === '#' ? -1 : collator.compare(a, b),
    );
  }, [brands, query, intl]);

  if (isLoading) {
    return (
      <SkeletonGroup
        label={t('brandsPage.loading')}
        className='mx-auto max-w-[1400px] py-6'
      >
        <PageHeaderSkeleton className='mb-10' />
        <div className='grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
          {Array.from({ length: 10 }, (_, i) => (
            <MediaTileSkeleton key={i} mediaClassName='aspect-[4/3]' />
          ))}
        </div>
      </SkeletonGroup>
    );
  }

  if (error) {
    return (
      <div className='mx-auto max-w-[1400px] py-16'>
        <p className='rounded-card bg-red-50 px-5 py-4 text-sm text-red-700'>
          {t('brandsPage.loadFailed')}
        </p>
      </div>
    );
  }

  const total = brands?.length ?? 0;
  const shown = groups.reduce((n, [, list]) => n + list.length, 0);

  return (
    <div className='mx-auto max-w-[1400px] pb-16'>
      {/* Editorial header — inline-start aligned, mirrors in RTL. */}
      <header className='border-b border-line pb-8 pt-4 sm:pt-8'>
        <p className='text-eyebrow uppercase text-accent'>{t('common.brands')}</p>
        <div className='mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
          <div className='max-w-2xl'>
            <h1 className='text-title text-ink sm:text-display'>{t('brandsPage.title')}</h1>
            <p className='mt-3 text-base text-ink-muted sm:text-lg'>{t('brandsPage.subtitle')}</p>
          </div>
          {total > 0 && (
            <div className='w-full lg:w-80'>
              <label htmlFor='brand-search' className='sr-only'>
                {t('brandsPage.searchLabel')}
              </label>
              <div className='relative'>
                <Search aria-hidden className='pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle' />
                <input
                  id='brand-search'
                  type='search'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('brandsPage.searchPlaceholder')}
                  className='h-11 w-full rounded-control border border-line bg-surface pe-10 ps-10 text-sm text-ink placeholder:text-ink-subtle transition-shadow focus:border-fuchsia-300 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 [&::-webkit-search-cancel-button]:hidden'
                />
                {query && (
                  <button
                    type='button'
                    onClick={() => setQuery('')}
                    aria-label={t('brandsPage.clearSearch')}
                    className='absolute end-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink'
                  >
                    <X aria-hidden className='h-4 w-4' />
                  </button>
                )}
              </div>
              <p className='mt-2 text-xs text-ink-muted' role='status'>
                {t('brandsPage.count', { count: shown })}
              </p>
            </div>
          )}
        </div>
      </header>

      {total === 0 ? (
        <div className='py-20 text-start'>
          <h2 className='text-heading text-ink'>{t('brandsPage.emptyTitle')}</h2>
          <p className='mt-2 max-w-md text-ink-muted'>{t('brandsPage.emptyDescription')}</p>
        </div>
      ) : groups.length === 0 ? (
        <div className='py-20 text-start'>
          <p className='text-heading text-ink'>{t('brandsPage.noMatch', { query: query.trim() })}</p>
          <button
            type='button'
            onClick={() => setQuery('')}
            className='mt-3 text-sm font-semibold text-accent underline-offset-4 hover:underline'
          >
            {t('brandsPage.clearSearch')}
          </button>
        </div>
      ) : (
        <>
          {/* A–Z index: only letters that have brands. */}
          {groups.length > 1 && (
            <nav aria-label={t('brandsPage.indexLabel')} className='hide-scrollbar -mx-1 flex gap-1 overflow-x-auto py-5'>
              {groups.map(([letter], i) => (
                <a
                  key={letter}
                  href={`#brands-group-${i}`}
                  className='inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-control px-2 text-sm font-semibold text-ink-muted transition-colors duration-(--dur-fast) hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
                >
                  {letter}
                </a>
              ))}
            </nav>
          )}

          <div className='space-y-14 pt-4'>
            {groups.map(([letter, list], i) => (
              <section key={letter} id={`brands-group-${i}`} aria-labelledby={`brands-letter-${i}`} className='scroll-mt-48'>
                <h2 id={`brands-letter-${i}`} className='mb-6 flex items-baseline gap-3 border-b border-line pb-3'>
                  <span className='text-title text-ink'>{letter}</span>
                  <span className='text-xs text-ink-subtle'>{list.length}</span>
                </h2>
                <ul className='grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
                  {list.map((brand, j) => (
                    <BrandTile key={brand._id} brand={brand} index={j} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
