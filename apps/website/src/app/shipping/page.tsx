'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Truck } from 'lucide-react';

/** DEMO policy content — TODO(api): CMS /storefront content */
export default function ShippingPage() {
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
            Shipping &amp; delivery
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
              <Truck className='h-5 w-5 text-fuchsia-700' aria-hidden />
              Delivery options
            </h2>
            <p className='text-sm font-semibold leading-relaxed text-stone-600'>
              At checkout you can choose contact-only fulfillment or add local
              delivery details. When shipping is selected, costs and estimated
              timelines are shown before you pay.
            </p>
          </section>

          <section>
            <h2 className='mb-3 text-xl font-bold text-stone-900'>
              Typical timelines
            </h2>
            <ul className='list-disc space-y-2 pl-5 text-sm font-semibold text-stone-600'>
              <li>Standard: 5–7 business days after dispatch</li>
              <li>Express (where available): 2–3 business days</li>
              <li>International: varies by destination and customs</li>
            </ul>
          </section>

          <section>
            <h2 className='mb-3 text-xl font-bold text-stone-900'>Tracking</h2>
            <p className='text-sm font-semibold leading-relaxed text-stone-600'>
              After your order ships, tracking details appear in your account
              orders when available. Keep your email and phone current so we can
              reach you about delivery.
            </p>
          </section>

          <section>
            <h2 className='mb-3 text-xl font-bold text-stone-900'>
              Need help with a shipment?
            </h2>
            <p className='text-sm font-semibold text-stone-600'>
              Visit the{' '}
              <Link href='/help' className='font-bold text-fuchsia-700 hover:underline'>
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
          </section>
        </motion.article>
      </div>
    </div>
  );
}
