'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Tag, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useOffersList } from '@/hooks/storefront/offersQuery';
import type { StorefrontOffer } from '@/lib/api';
import { useTranslation } from '@/contexts/TranslationContext';
import { intlLocale, type Locale } from '@/lib/locale';

function formatEndsAt(
  endsAt: string | null | undefined,
  locale: Locale,
): string | null {
  if (!endsAt) return null;
  const d = new Date(endsAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(intlLocale(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function OfferCard({ offer }: { offer: StorefrontOffer }) {
  const { t, locale } = useTranslation();
  const ends = formatEndsAt(offer.endsAt, locale);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className='flex flex-col overflow-hidden rounded-2xl border border-white/30 bg-white/70 shadow-lg backdrop-blur-xl transition-shadow hover:shadow-xl'
    >
      {offer.imageUrl ? (
        <Image
          src={offer.imageUrl}
          alt=''
          width={400}
          height={176}
          className='h-44 w-full object-cover'
        />
      ) : (
        <div className='flex h-44 items-center justify-center bg-gradient-to-br from-fuchsia-600 to-purple-600'>
          <Tag
            className='h-10 w-10 text-white'
            aria-hidden
          />
        </div>
      )}
      <div className='flex flex-1 flex-col p-6'>
        {offer.badge && (
          <span className='mb-2 inline-flex w-fit rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-fuchsia-700'>
            {offer.badge}
          </span>
        )}
        <h2 className='text-xl font-bold text-gray-900'>{offer.title}</h2>
        {offer.subtitle && (
          <p className='mt-2 text-sm text-gray-700'>{offer.subtitle}</p>
        )}
        <div className='mt-auto flex items-center justify-between pt-4'>
          {ends ? (
            <span className='inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600'>
              <Clock
                className='h-3.5 w-3.5'
                aria-hidden
              />
              {t('offersPage.endsOn', { date: ends })}
            </span>
          ) : (
            <span />
          )}
          <Link
            href={offer.href || '/products'}
            className='inline-flex items-center gap-1 text-sm font-bold text-fuchsia-700 hover:underline'
          >
            {t('offersPage.shopOffer')}
            <ArrowRight
              className='h-4 w-4 rtl:-scale-x-100'
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/** Offers page — GET /api/offers?active=true */
export default function OffersPage() {
  const { t } = useTranslation();
  const { data: offers = [], isLoading, error, refetch } = useOffersList(24);

  return (
    <div className='min-h-screen bg-white'>
      <div className='container mx-auto px-4 py-12'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className='mb-8 bg-gradient-to-r from-fuchsia-700 via-purple-700 to-cyan-700 bg-clip-text text-4xl font-bold text-transparent'>
            {t('offersPage.title')}
          </h1>

          {isLoading ? (
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className='h-72 animate-pulse rounded-2xl bg-gray-100'
                />
              ))}
            </div>
          ) : error ? (
            <div className='flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-800'>
              <span>{t('offersPage.loadError')}</span>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() => refetch()}
              >
                {t('orders.retry')}
              </Button>
            </div>
          ) : offers.length === 0 ? (
            <div className='rounded-2xl border border-gray-200 bg-white p-10 text-center'>
              <p className='text-lg font-semibold text-gray-900'>
                {t('offersPage.emptyTitle')}
              </p>
              <p className='mt-2 text-sm text-gray-600'>
                {t('offersPage.emptyDescription')}
              </p>
              <Link
                href='/products?sort=bestselling'
                className='mt-4 inline-flex items-center gap-1 text-sm font-bold text-fuchsia-700 hover:underline'
              >
                {t('offersPage.browseProducts')}
                <ArrowRight
                  className='h-4 w-4 rtl:-scale-x-100'
                  aria-hidden
                />
              </Link>
            </div>
          ) : (
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {offers.map((offer) => (
                <OfferCard
                  key={offer._id}
                  offer={offer}
                />
              ))}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className='mt-12 rounded-2xl border border-white/30 bg-white/70 p-6 shadow-lg backdrop-blur-xl'
          >
            <h3 className='mb-3 text-lg font-bold text-gray-900'>
              {t('offersPage.couponHowTo.title')}
            </h3>
            <ol className='list-inside list-decimal space-y-2 text-gray-700'>
              <li>{t('offersPage.couponHowTo.step1')}</li>
              <li>{t('offersPage.couponHowTo.step2')}</li>
              <li>{t('offersPage.couponHowTo.step3')}</li>
            </ol>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
