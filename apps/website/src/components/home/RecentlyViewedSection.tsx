'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRecentlyViewed } from '@/hooks/recentlyViewed/recentlyViewedQuery';
import { useTranslation } from '@/contexts/TranslationContext';

/** Auth: GET /api/me/recently-viewed. Anonymous: localStorage. */
export function RecentlyViewedSection() {
  const { items, source } = useRecentlyViewed();
  const { t, formatPrice } = useTranslation();

  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby='recent-heading'
      className='border-t border-stone-200 bg-white py-12'
    >
      <div className='mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8'>
        <div className='mb-5 flex items-end justify-between gap-4'>
          <div>
            <p className='text-xs font-medium uppercase tracking-wider text-stone-500'>
              {source === 'api'
                ? t('home.recentlyViewed.synced')
                : t('home.recentlyViewed.onDevice')}
            </p>
            <h2
              id='recent-heading'
              className='mt-1 text-xl font-extrabold text-stone-900 sm:text-2xl'
            >
              {t('home.recentlyViewed.title')}
            </h2>
          </div>
        </div>

        <ul className='-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 snap-x'>
          {items.map((item) => (
            <li
              key={item.id}
              className='min-w-[140px] max-w-[160px] snap-start sm:min-w-[160px]'
            >
              <Link
                href={`/products/${item.id}`}
                className='block overflow-hidden rounded-xl border border-stone-200 bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500'
              >
                <div className='aspect-square overflow-hidden bg-stone-100'>
                  <Image
                    src={item.cover}
                    alt={item.title}
                    fill
                    className='object-cover'
                    sizes='160px'
                  />
                </div>
                <div className='p-2.5'>
                  <p className='line-clamp-2 text-xs font-medium text-stone-900'>
                    {item.title}
                  </p>
                  <p className='mt-1 text-sm font-semibold text-stone-800'>
                    {formatPrice(item.price)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
