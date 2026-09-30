'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

export function CTASection() {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby='cta-heading'
      className='bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-500 py-12 text-white rtl:bg-gradient-to-l sm:py-16'
    >
      {/* Text at the inline start, actions at the end — mirrors in RTL. */}
      <div className='mx-auto flex max-w-[1400px] flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8'>
        <div className='max-w-2xl'>
          <h2 id='cta-heading' className='text-2xl font-extrabold sm:text-3xl'>
            {t('home.cta.title')}
          </h2>
          <p className='mt-2 text-base text-white/85 sm:text-lg'>
            {t('home.cta.subtitle')}
          </p>
        </div>
        <div className='flex shrink-0 flex-col gap-3 sm:flex-row'>
          <Link
            href='/products'
            className='group inline-flex items-center justify-center gap-2 rounded-control bg-white px-7 py-3 text-base font-bold text-indigo-700 shadow-soft transition-[background-color,box-shadow] duration-(--dur-fast) hover:bg-stone-50 hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600'
          >
            {t('home.cta.browseProducts')}
            <ArrowRight
              aria-hidden
              className='h-4 w-4 transition-transform duration-(--dur-base) ease-brand rtl:-scale-x-100 ltr:group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5'
            />
          </Link>
          <Link
            href='/contact'
            className='inline-flex items-center justify-center rounded-control border border-white/60 px-7 py-3 text-base font-bold text-white transition-colors duration-(--dur-fast) hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'
          >
            {t('home.cta.contactSupport')}
          </Link>
        </div>
      </div>
    </section>
  );
}
