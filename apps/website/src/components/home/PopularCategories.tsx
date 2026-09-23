'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Sparkles,
  Shirt,
  Heart,
  Watch,
  Home,
  Gift,
  Sun,
  ShoppingBag,
} from 'lucide-react';
import { DEMO_CATEGORY_SHORTCUTS } from '@/data/demoStorefront';
import { useStorefrontCategories } from '@/hooks/storefront/categoriesQuery';
import { useTranslation } from '@/contexts/TranslationContext';

const ICONS = {
  sparkles: Sparkles,
  shirt: Shirt,
  heart: Heart,
  watch: Watch,
  home: Home,
  gift: Gift,
  sun: Sun,
  bag: ShoppingBag,
} as const;

/** Category shortcuts — GET /api/storefront/categories with DEMO fallback */
export function PopularCategories() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useStorefrontCategories();

  const liveCategories = data && data.length > 0 ? data : null;
  const categories =
    liveCategories ?? (!isLoading ? DEMO_CATEGORY_SHORTCUTS : null);
  const usingFallback = !liveCategories && !isLoading;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5 }}
      aria-labelledby='categories-heading'
      className='bg-white py-16 border-t border-gray-200'
    >
      <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='mb-8'>
          <h2
            id='categories-heading'
            className='text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2'
          >
            {t('home.categories.title')}
          </h2>
          <p className='text-gray-600'>
            {usingFallback || isError
              ? t('home.categories.subtitleFallback')
              : t('home.categories.subtitle')}
          </p>
        </div>

        {isLoading && !categories ? (
          <p className='text-sm text-gray-500' role='status'>
            {t('home.categories.loading')}
          </p>
        ) : categories ? (
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            {categories.map((category, index) => {
              const Icon = ICONS[category.icon];
              return (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link
                    href={category.href}
                    className='group block'
                  >
                    <div
                      className={`bg-gradient-to-br ${category.accent} rounded-xl p-6 text-white hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
                    >
                      <Icon
                        className='h-8 w-8 mb-3 opacity-90'
                        aria-hidden
                      />
                      <h3 className='font-bold text-lg mb-1'>{t(category.name)}</h3>
                      <p className='text-sm opacity-90'>{t(category.countLabel)}</p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}
