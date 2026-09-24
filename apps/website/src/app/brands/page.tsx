'use client';

import Image from 'next/image';
import { useBrands } from '@/hooks/brands/brandsQuery';
import { motion } from 'framer-motion';
import { Loader2, Globe, MapPin, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/contexts/TranslationContext';

export default function BrandsPage() {
  const { data: brands, isLoading, error } = useBrands();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div role='status' className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='h-12 w-12 animate-spin text-fuchsia-600 mx-auto' aria-hidden />
          <p className='mt-4 text-gray-600'>{t('brandsPage.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center text-red-600'>
          {t('brandsPage.loadFailed')}
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Hero Section */}
      <div className='bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-600 text-white py-16'>
        <div className='container mx-auto px-4'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='max-w-3xl'
          >
            <h1 className='text-4xl md:text-5xl font-bold mb-4'>
              {t('brandsPage.title')}
            </h1>
            <p className='text-lg text-white/90'>
              {t('brandsPage.subtitle')}
            </p>
          </motion.div>
        </div>
      </div>

      <div className='container mx-auto px-4 py-12'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className='flex items-center justify-between mb-8'>
            <h2 className='text-2xl font-bold text-gray-900'>
              {t('brandsPage.allBrands', { count: brands?.length || 0 })}
            </h2>
          </div>

          {brands && brands.length > 0 ? (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
              {brands.map((brand, index) => (
                <motion.div
                  key={brand._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className='bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden group'
                >
                  <Link href={`/brands/${brand._id}`}>
                    <div className='p-6'>
                      {/* Brand Logo */}
                      <div className='flex items-center justify-center mb-4 h-24 bg-gray-50 rounded-lg'>
                        {brand.logo ? (
                          <Image
                            src={brand.logo}
                            alt={brand.name}
                            width={80}
                            height={80}
                            className='max-h-20 max-w-full object-contain'
                          />
                        ) : (
                          <div className='w-16 h-16 bg-gradient-to-br from-fuchsia-100 to-purple-100 rounded-full flex items-center justify-center'>
                            <span className='text-2xl font-bold text-fuchsia-600'>
                              {brand.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Brand Name */}
                      <h3 className='text-lg font-semibold text-gray-900 text-center mb-2 group-hover:text-fuchsia-600 transition-colors'>
                        {brand.name}
                      </h3>

                      {/* Country */}
                      {brand.country && (
                        <div className='flex items-center justify-center gap-1 text-sm text-gray-500 mb-3'>
                          <MapPin className='h-4 w-4' />
                          <span>{brand.country}</span>
                        </div>
                      )}

                      {/* Description */}
                      {brand.description && (
                        <p className='text-sm text-gray-600 text-center line-clamp-2 mb-4'>
                          {brand.description}
                        </p>
                      )}

                      {/* View Products Button */}
                      <div className='flex items-center justify-center gap-2 text-fuchsia-600 font-medium text-sm group-hover:gap-3 transition-all'>
                        <span>{t('brandsPage.viewProducts')}</span>
                        <ArrowRight className='h-4 w-4 rtl:-scale-x-100' />
                      </div>
                    </div>
                  </Link>

                  {/* Website Link */}
                  {brand.website && (
                    <div className='px-6 pb-6 pt-0'>
                      <a
                        href={brand.website}
                        target='_blank'
                        rel='noopener noreferrer'
                        onClick={(e) => e.stopPropagation()}
                        className='flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-fuchsia-600 transition-colors'
                      >
                        <Globe className='h-3 w-3' />
                        {t('brandsPage.visitWebsite')}
                      </a>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className='text-center py-16 bg-white rounded-xl border border-gray-100'>
              <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                <Globe className='h-8 w-8 text-gray-400' />
              </div>
              <h3 className='text-xl font-semibold text-gray-900 mb-2'>
                {t('brandsPage.emptyTitle')}
              </h3>
              <p className='text-gray-600'>
                {t('brandsPage.emptyDescription')}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
