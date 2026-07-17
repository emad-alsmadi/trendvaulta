'use client';

import { useBrands } from '@/hooks/brands/brandsQuery';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function BrandsPage() {
  const { data: brands, isLoading, error } = useBrands();

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='h-12 w-12 animate-spin text-fuchsia-600 mx-auto' />
          <p className='mt-4 text-gray-600'>Loading brands...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center text-red-600'>
          Failed to load brands
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-fuchsia-50 via-purple-50 to-cyan-50'>
      <div className='container mx-auto px-4 py-12'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className='text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-700 via-purple-700 to-cyan-700 mb-8'>
            Our Brands
          </h1>

          {brands && brands.length > 0 ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {brands.map((brand: any) => (
                <motion.div
                  key={brand._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className='bg-white/70 backdrop-blur-xl rounded-2xl border border-white/30 p-6 shadow-lg hover:shadow-xl transition-shadow'
                >
                  <div className='flex items-center gap-4 mb-4'>
                    {brand.logo && (
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        className='w-16 h-16 object-contain rounded-lg'
                      />
                    )}
                    <div>
                      <h2 className='text-xl font-bold text-gray-900'>{brand.name}</h2>
                      {brand.country && (
                        <p className='text-sm text-gray-600'>{brand.country}</p>
                      )}
                    </div>
                  </div>
                  {brand.description && (
                    <p className='text-gray-700 text-sm mb-4'>{brand.description}</p>
                  )}
                  {brand.website && (
                    <a
                      href={brand.website}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-block text-sm font-semibold text-fuchsia-700 hover:text-fuchsia-800 transition-colors'
                    >
                      Visit Website →
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className='text-center py-12'>
              <p className='text-gray-600'>No brands available yet.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
