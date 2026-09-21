'use client';

import { Search, Sparkles, Shirt, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { HeroPromoCarousel } from '@/components/home/HeroPromoCarousel';
import type { DemoHeroSlide } from '@/data/demoStorefront';

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  heroSlides?: DemoHeroSlide[];
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export function HeroSection({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  heroSlides,
}: HeroSectionProps) {
  return (
    <div className='relative overflow-hidden bg-white'>
      <div className='relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8'>
        <div className='grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12'>
          <motion.div
            className='space-y-6 text-start'
            initial='hidden'
            animate='visible'
            variants={{
              visible: { transition: { staggerChildren: 0.08 } },
            }}
          >
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.4 }}
              className='text-sm font-semibold uppercase tracking-[0.22em] text-fuchsia-700'
            >
              TrendVaulta
            </motion.p>
            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.45 }}
              className='text-3xl font-bold leading-[1.15] tracking-tight text-stone-900 sm:text-4xl lg:text-5xl'
            >
              Beauty, fashion & lifestyle — curated for everyday polish
            </motion.h1>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.45 }}
              className='max-w-xl text-base text-stone-700 sm:text-lg'
            >
              Discover elevated essentials, limited edits, and brands that match
              your rhythm. Clear prices, trusted checkout, care you can feel.
            </motion.p>

            <motion.form
              variants={fadeUp}
              transition={{ duration: 0.4 }}
              onSubmit={onSearchSubmit}
              className='relative max-w-xl'
              role='search'
            >
              <label
                htmlFor='home-search'
                className='sr-only'
              >
                Search products
              </label>
              <input
                id='home-search'
                type='text'
                placeholder='Search beauty, fashion, lifestyle…'
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className='w-full rounded-lg border border-stone-200 bg-white/90 py-4 pe-28 ps-12 text-gray-900 shadow-lg backdrop-blur-sm placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-fuchsia-500/20'
              />
              <Search className='pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400' />
              <button
                type='submit'
                className='absolute end-2 top-1/2 -translate-y-1/2 rounded-md bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-500 px-6 py-2 font-medium text-white transition-colors hover:from-fuchsia-700 hover:via-indigo-700 hover:to-cyan-600'
              >
                Search
              </button>
            </motion.form>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.4 }}
              className='flex flex-wrap gap-3'
            >
              <Link
                href='/products?category=makeup'
                className='inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white/80 px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-white'
              >
                <Sparkles className='h-4 w-4' />
                Beauty
              </Link>
              <Link
                href='/products?category=clothing'
                className='inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white/80 px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-white'
              >
                <Shirt className='h-4 w-4' />
                Fashion
              </Link>
              <Link
                href='/products'
                className='inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white/80 px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-white'
              >
                <ShoppingBag className='h-4 w-4' />
                Shop all
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: 'easeOut' }}
            className='w-full'
          >
            {/* Live hero slides from GET /api/storefront/home; demo fallback in carousel */}
            <HeroPromoCarousel slides={heroSlides} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
