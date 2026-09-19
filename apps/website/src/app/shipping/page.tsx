'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Truck } from 'lucide-react';
import { useContent } from '@/hooks/storefront/contentQuery';

/** Shipping policy page — API: GET /api/content?type=SHIPPING */
export default function ShippingPage() {
  const { data: content, isLoading, error } = useContent('SHIPPING');

  return (
    <div className='min-h-screen bg-stone-50 py-12'>
      <div className='mx-auto max-w-4xl px-4 sm:px-6 lg:px-8'>
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className='mb-10 text-center'
        >
          <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700'>
            <Sparkles
              className='h-4 w-4'
              aria-hidden
            />
            Policies
          </div>
          <h1 className='text-3xl font-extrabold text-stone-900 sm:text-4xl'>
            {content?.title || 'Shipping &amp; delivery'}
          </h1>
        </motion.div>

        {isLoading && (
          <p className='py-10 text-center text-sm text-stone-500'>
            Loading shipping policy…
          </p>
        )}

        {error && (
          <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800'>
            Failed to load shipping policy. Please try again later.
          </div>
        )}

        {!isLoading && !error && content && (
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className='rounded-2xl border border-stone-200 bg-white p-8'
            dangerouslySetInnerHTML={{ __html: content.body }}
          />
        )}

        {!isLoading && !error && !content && (
          <div className='rounded-lg border border-stone-200 bg-white p-8 text-center text-sm text-stone-500'>
            Shipping policy not available at this time.
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className='mt-8 text-center'
        >
          <p className='text-sm font-semibold text-stone-600'>
            Need help with a shipment? Visit the{' '}
            <Link
              href='/help'
              className='font-bold text-fuchsia-700 hover:underline'
            >
              Help Center
            </Link>{' '}
            or{' '}
            <Link
              href='/contact'
              className='font-bold text-fuchsia-700 hover:underline'
            >
              contact support
            </Link>
            .
          </p>
        </motion.div>
      </div>
    </div>
  );
}
