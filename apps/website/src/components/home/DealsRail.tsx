'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { DEMO_DEALS, type DemoDeal } from '@/data/demoStorefront';
import { useActiveOffers } from '@/hooks/storefront/offersQuery';
import { useTranslation } from '@/contexts/TranslationContext';

type Props = {
  deals?: DemoDeal[];
};

/** Home deals rail — live GET /api/offers with demo fallback */
export function DealsRail({ deals: dealsProp }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useActiveOffers(12);

  const liveDeals = data && data.length > 0 ? data : null;
  const deals = dealsProp ?? liveDeals ?? (!isLoading ? DEMO_DEALS : null);
  const usingFallback = !dealsProp && !liveDeals && !isLoading;

  return (
    <section
      aria-labelledby='deals-heading'
      className='bg-white py-12 sm:py-16'
    >
      <div className='mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8'>
        <div className='mb-6 flex items-end justify-between gap-4'>
          <div>
            <p className='text-xs font-medium uppercase tracking-wider text-rose-600'>
              {t('home.deals.eyebrow')}
            </p>
            <h2
              id='deals-heading'
              className='mt-1 text-2xl font-extrabold text-stone-900 sm:text-3xl'
            >
              {t('home.deals.title')}
            </h2>
            <p className='mt-1 text-sm text-stone-600'>
              {isError || usingFallback
                ? t('home.deals.subtitleFallback')
                : t('home.deals.subtitle')}
            </p>
          </div>
          <Link
            href='/products'
            className='hidden text-sm font-semibold text-fuchsia-700 hover:text-fuchsia-800 sm:inline'
          >
            {t('home.deals.shopAll')}
          </Link>
        </div>

        {isLoading && !deals ? (
          <p className='text-sm text-stone-500' role='status'>
            {t('home.deals.loading')}
          </p>
        ) : deals ? (
          <div className='-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4'>
            {deals.map((deal, index) => (
              <motion.div
                key={deal.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className='min-w-[78%] snap-start sm:min-w-0'
              >
                <Link
                  href={deal.href}
                  className='group block overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500'
                >
                  <div className='relative aspect-[4/3] overflow-hidden'>
                    <Image
                      src={deal.imageUrl}
                      alt={deal.title}
                      fill
                      className='object-cover transition-transform duration-500 group-hover:scale-105'
                      sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
                    />
                    {deal.badge ? (
                      <span className='absolute start-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-stone-900 shadow-sm'>
                        {deal.badge}
                      </span>
                    ) : null}
                  </div>
                  <div className='p-4'>
                    <h3 className='font-semibold text-stone-900 group-hover:text-fuchsia-700'>
                      {deal.title}
                    </h3>
                    {deal.subtitle ? (
                      <p className='mt-1 text-sm text-stone-600'>
                        {deal.subtitle}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
