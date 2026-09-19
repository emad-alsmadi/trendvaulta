'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Truck,
  RefreshCw,
  Package,
  ShieldCheck,
  Gift,
  Headset,
  User,
  Tag,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { useHelpTopics } from '@/hooks/storefront/helpTopicsQuery';
import type { DemoHelpTopic } from '@/data/demoStorefront';

const ICONS: Record<
  DemoHelpTopic['icon'],
  ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
> = {
  truck: Truck,
  refresh: RefreshCw,
  package: Package,
  shield: ShieldCheck,
  gift: Gift,
  headset: Headset,
  user: User,
  tag: Tag,
};

/**
 * Customer Service / Help Center hub.
 * Pattern adapted from Amazon "Let Us Help You" IA — original TrendVaulta copy.
 * API: GET /api/storefront/help
 */
export default function HelpPage() {
  const { data: topics = [], isLoading, error } = useHelpTopics();

  return (
    <div className='min-h-screen bg-stone-50 py-12'>
      <div className='mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8'>
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className='mb-10 text-center'
        >
          <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-extrabold text-fuchsia-700'>
            <Sparkles
              className='h-4 w-4'
              aria-hidden
            />
            Help Center
          </div>
          <h1 className='text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl'>
            How can we help?
          </h1>
          <p className='mx-auto mt-3 max-w-2xl text-sm font-semibold text-stone-600 sm:text-base'>
            Shipping, returns, orders, payments, and gifts — self-serve guides
            for TrendVaulta shoppers.
          </p>
        </motion.div>

        {isLoading && (
          <p className='py-10 text-center text-sm text-stone-500'>
            Loading help topics…
          </p>
        )}

        {error && (
          <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800'>
            Failed to load help topics. Please try again later.
          </div>
        )}

        {!isLoading && !error && topics.length === 0 && (
          <p className='py-10 text-center text-sm text-stone-500'>
            No help topics available at this time.
          </p>
        )}

        {!isLoading && !error && topics.length > 0 && (
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {topics.map((topic, index) => {
              const Icon = ICONS[topic.icon] || HelpCircle;
              return (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <Link
                    href={topic.href}
                    className='flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-fuchsia-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500'
                  >
                    <span className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-stone-50 text-stone-800 ring-1 ring-stone-200'>
                      <Icon
                        className='h-5 w-5'
                        aria-hidden
                      />
                    </span>
                    <h2 className='mt-4 text-base font-extrabold text-stone-900'>
                      {topic.title}
                    </h2>
                    <p className='mt-2 flex-1 text-sm font-semibold text-stone-600'>
                      {topic.description}
                    </p>
                    <span className='mt-4 inline-flex items-center gap-1 text-sm font-bold text-fuchsia-700'>
                      Open
                      <ArrowRight
                        className='h-4 w-4'
                        aria-hidden
                      />
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        <section className='mt-12 grid gap-6 lg:grid-cols-2'>
          <div className='rounded-2xl border border-stone-200 bg-white p-6 sm:p-8'>
            <div className='inline-flex items-center gap-2 text-sm font-extrabold text-stone-900'>
              <HelpCircle
                className='h-5 w-5 text-fuchsia-700'
                aria-hidden
              />
              Quick answers
            </div>
            <ul className='mt-4 space-y-3 text-sm font-semibold text-stone-600'>
              <li>
                <Link
                  href='/faq'
                  className='text-fuchsia-700 hover:underline'
                >
                  FAQ
                </Link>{' '}
                — payments, shipping windows, and product questions
              </li>
              <li>
                <Link
                  href='/shipping'
                  className='text-fuchsia-700 hover:underline'
                >
                  Shipping policy
                </Link>{' '}
                — rates, tracking, and international notes
              </li>
              <li>
                <Link
                  href='/returns'
                  className='text-fuchsia-700 hover:underline'
                >
                  Returns policy
                </Link>{' '}
                — eligibility and refund timing
              </li>
            </ul>
          </div>

          <div className='rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-900 via-indigo-950 to-fuchsia-950 p-6 text-white sm:p-8'>
            <h2 className='text-lg font-extrabold'>Still need a human?</h2>
            <p className='mt-2 text-sm font-semibold text-white/80'>
              Our care team can help with damaged items, missing packages, or
              account issues.
            </p>
            <Link
              href='/contact'
              className='mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-indigo-950 transition hover:bg-stone-100'
            >
              Contact support
              <ArrowRight
                className='h-4 w-4'
                aria-hidden
              />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
