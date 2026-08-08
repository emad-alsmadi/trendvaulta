'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, RefreshCw } from 'lucide-react';

/** DEMO policy content — TODO(api): CMS /storefront content */
export default function ReturnsPage() {
  return (
    <div className='min-h-screen bg-stone-50 py-12'>
      <div className='mx-auto max-w-4xl px-4 sm:px-6 lg:px-8'>
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className='mb-10 text-center'
        >
          <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700'>
            <Sparkles className='h-4 w-4' aria-hidden />
            Policies
          </div>
          <h1 className='text-3xl font-extrabold text-stone-900 sm:text-4xl'>
            Returns &amp; refunds
          </h1>
          <p className='mt-2 text-sm font-semibold text-stone-500'>
            Demo policy copy for TrendVaulta — not Amazon content
          </p>
        </motion.div>

        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className='space-y-8 rounded-2xl border border-stone-200 bg-white p-8'
        >
          <section>
            <h2 className='mb-3 flex items-center gap-2 text-xl font-bold text-stone-900'>
              <RefreshCw className='h-5 w-5 text-fuchsia-700' aria-hidden />
              Return window
            </h2>
            <p className='text-sm font-semibold leading-relaxed text-stone-600'>
              Most unused items can be returned within 30 days of delivery in
              original packaging with tags attached. Final-sale or hygiene-sealed
              beauty items may be excluded — check the product page when noted.
            </p>
          </section>

          <section>
            <h2 className='mb-3 text-xl font-bold text-stone-900'>
              How to start a return
            </h2>
            <ol className='list-decimal space-y-2 pl-5 text-sm font-semibold text-stone-600'>
              <li>Sign in and open your orders</li>
              <li>Select the item and reason for return</li>
              <li>Follow the packing and drop-off instructions we send</li>
              <li>Refund issues after we receive and inspect the item</li>
            </ol>
            <p className='mt-3 text-sm font-semibold text-stone-500'>
              Self-serve return flow is DEMO/UI guidance for now — live RMA
              automation is a later backend item.
            </p>
          </section>

          <section>
            <h2 className='mb-3 text-xl font-bold text-stone-900'>Refunds</h2>
            <p className='text-sm font-semibold leading-relaxed text-stone-600'>
              Approved refunds go to the original payment method, typically
              within 5–7 business days after inspection. Shipping fees are
              refunded only when the return is due to our error.
            </p>
          </section>

          <section>
            <h2 className='mb-3 text-xl font-bold text-stone-900'>
              Damaged or wrong item
            </h2>
            <p className='text-sm font-semibold text-stone-600'>
              Contact us via the{' '}
              <Link
                href='/contact'
                className='font-bold text-fuchsia-700 hover:underline'
              >
                contact form
              </Link>{' '}
              with photos of the item and packaging — we&apos;ll arrange a
              replacement or refund.
            </p>
          </section>
        </motion.article>
      </div>
    </div>
  );
}
