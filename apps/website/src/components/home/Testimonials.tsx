'use client';

import { motion } from 'framer-motion';
import { useTestimonials } from '@/hooks/storefront/testimonialsQuery';
import { useTranslation } from '@/contexts/TranslationContext';

const FALLBACK = [
  {
    id: 'sara',
    name: 'Sara Alami',
    role: 'Beauty enthusiast',
    quote:
      'TrendVaulta makes finding skincare and everyday glam so much easier. Clear prices, fast browsing, and products that feel curated.',
    rating: 5,
  },
  {
    id: 'omar',
    name: 'Omar Nasser',
    role: 'Style shopper',
    quote:
      'I love how clean the shopping flow feels. From discovery to checkout, it is polished without being overwhelming.',
    rating: 5,
  },
  {
    id: 'layla',
    name: 'Layla Habib',
    role: 'Gift buyer',
    quote:
      'Great for thoughtful gifts and lifestyle pieces. Support was helpful when I needed a quick order update.',
    rating: 5,
  },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export function Testimonials() {
  const { t } = useTranslation();
  const q = useTestimonials();
  const testimonials =
    q.data && q.data.length > 0 ? q.data : FALLBACK;

  return (
    <div className='bg-slate-50 py-20'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-12'>
          <h2 className='text-3xl font-bold text-gray-900 mb-4'>
            {t('home.testimonials.title')}
          </h2>
          <p className='text-gray-600 text-lg'>
            {t('home.testimonials.subtitle')}
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
          {testimonials.map((testimonial) => {
            const rating = testimonial.rating ?? 5;
            const avatar = initials(testimonial.name);
            return (
              <motion.div
                key={testimonial.id || testimonial.name}
                whileHover={{ y: -4 }}
                className='bg-white rounded-lg p-6 hover:shadow-lg transition-shadow duration-300 border border-slate-200'
              >
                <div className='flex items-center gap-1 mb-4'>
                  {[...Array(rating)].map((_, i) => (
                    <svg
                      key={i}
                      className='h-5 w-5 text-yellow-400 fill-current'
                      viewBox='0 0 20 20'
                    >
                      <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                    </svg>
                  ))}
                </div>
                <p className='text-gray-700 mb-6 leading-relaxed'>
                  {testimonial.quote}
                </p>
                <div className='flex items-center gap-3'>
                  <div className='inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-600 via-indigo-600 to-cyan-500 text-white font-bold'>
                    {avatar}
                  </div>
                  <div>
                    <div className='font-semibold text-gray-900'>
                      {testimonial.name}
                    </div>
                    {testimonial.role && (
                      <div className='text-sm text-gray-500'>
                        {testimonial.role}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
