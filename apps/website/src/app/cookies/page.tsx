'use client';

import { motion } from 'framer-motion';
import { Sparkles, Cookie } from 'lucide-react';

/** Simple cookie policy page — footer link target */
export default function CookiesPage() {
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
            Legal
          </div>
          <h1 className='text-3xl font-extrabold text-stone-900 sm:text-4xl'>
            Cookie Policy
          </h1>
          <p className='mt-2 text-sm font-semibold text-stone-500'>
            Last updated: August 8, 2026
          </p>
        </motion.div>

        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className='space-y-8 rounded-2xl border border-stone-200 bg-white p-8'
        >
          <section>
            <h2 className='mb-3 flex items-center gap-2 text-xl font-bold text-stone-900'>
              <Cookie className='h-5 w-5 text-fuchsia-700' aria-hidden />
              What we use cookies for
            </h2>
            <p className='text-sm font-semibold leading-relaxed text-stone-600'>
              TrendVaulta uses cookies and similar technologies to keep you
              signed in, remember cart and browsing preferences, measure
              storefront performance, and improve shopping experience.
            </p>
          </section>

          <section>
            <h2 className='mb-3 text-xl font-bold text-stone-900'>
              Types of cookies
            </h2>
            <ul className='list-disc space-y-2 ps-5 text-sm font-semibold text-stone-600'>
              <li>Essential — auth session, cart, security</li>
              <li>Preferences — language/UI choices when available</li>
              <li>Analytics — anonymized traffic to improve pages</li>
            </ul>
          </section>

          <section>
            <h2 className='mb-3 text-xl font-bold text-stone-900'>
              Managing cookies
            </h2>
            <p className='text-sm font-semibold leading-relaxed text-stone-600'>
              You can control cookies through your browser settings. Blocking
              essential cookies may prevent sign-in, checkout, or cart from
              working correctly.
            </p>
          </section>
        </motion.article>
      </div>
    </div>
  );
}
