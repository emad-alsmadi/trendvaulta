'use client';

import Link from 'next/link';
import { useTranslation } from '@/contexts/TranslationContext';

export function CTASection() {
  const { t } = useTranslation();
  return (
    <div className='bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-500 text-white py-20'>
      <div className='px-4 sm:px-6 lg:px-8 text-center'>
        <h2 className='text-3xl font-bold mb-4'>{t('home.cta.title')}</h2>
        <p className='text-lg text-white/90 mb-8 max-w-2xl mx-auto'>
          {t('home.cta.subtitle')}
        </p>
        <div className='flex flex-col sm:flex-row gap-4 justify-center'>
          <Link
            href='/products'
            className='inline-flex items-center justify-center rounded-lg bg-white text-indigo-600 px-8 py-3 text-base font-bold hover:bg-gray-100 transition-colors'
          >
            {t('home.cta.browseProducts')}
          </Link>
          <Link
            href='/contact'
            className='inline-flex items-center justify-center rounded-lg border-2 border-white text-white px-8 py-3 text-base font-bold hover:bg-white/10 transition-colors'
          >
            {t('home.cta.contactSupport')}
          </Link>
        </div>
      </div>
    </div>
  );
}
