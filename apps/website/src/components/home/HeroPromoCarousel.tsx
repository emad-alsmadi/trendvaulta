'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DEMO_HERO_SLIDES,
  type DemoHeroSlide,
} from '@/data/demoStorefront';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';

const TONE_OVERLAY: Record<DemoHeroSlide['tone'], string> = {
  rose: 'from-rose-950/70 via-rose-900/35 to-transparent',
  stone: 'from-stone-950/70 via-stone-900/35 to-transparent',
  teal: 'from-teal-950/70 via-teal-900/35 to-transparent',
  indigo: 'from-indigo-950/70 via-indigo-900/35 to-transparent',
};

type Props = {
  /** Optional override — defaults to DEMO_HERO_SLIDES */
  slides?: DemoHeroSlide[];
  /** Auto-advance interval ms; 0 disables */
  intervalMs?: number;
  className?: string;
};

/**
 * Homepage promo carousel — slides from GET /api/storefront/home when provided.
 */
export function HeroPromoCarousel({
  slides = DEMO_HERO_SLIDES,
  intervalMs = 6000,
  className,
}: Props) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const slide = slides[index] ?? slides[0];

  const go = useCallback(
    (dir: -1 | 1) => {
      if (count === 0) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (paused || intervalMs <= 0 || count <= 1) return;
    const id = window.setInterval(() => go(1), intervalMs);
    return () => window.clearInterval(id);
  }, [paused, intervalMs, count, go]);

  if (!slide || count === 0) return null;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-xl',
        className,
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <p className='sr-only'>{t('home.promo.srDescription')}</p>

      <div className='relative aspect-[4/3] sm:aspect-[16/11] lg:aspect-[4/5]'>
        <AnimatePresence mode='wait'>
          <motion.div
            key={slide.id}
            initial={{ opacity: 0.35, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className='absolute inset-0'
          >
            <div
              className='absolute inset-0 bg-cover bg-center'
              style={{ backgroundImage: `url(${slide.imageUrl})` }}
              role='img'
              aria-label={slide.title}
            />
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-t',
                TONE_OVERLAY[slide.tone],
              )}
              aria-hidden
            />
          </motion.div>
        </AnimatePresence>

        <div className='absolute inset-x-0 bottom-0 z-10 p-5 sm:p-6'>
          <p className='text-xs font-semibold uppercase tracking-[0.18em] text-white/80'>
            {slide.eyebrow}
          </p>
          <h2 className='mt-1 max-w-md text-xl font-extrabold leading-snug text-white sm:text-2xl'>
            {slide.title}
          </h2>
          <p className='mt-1.5 max-w-sm text-sm font-medium text-white/85'>
            {slide.subtitle}
          </p>
          <Link
            href={slide.href}
            className='mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-extrabold text-stone-900 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'
          >
            {slide.ctaLabel}
          </Link>
        </div>

        {count > 1 && (
          <>
            <button
              type='button'
              onClick={() => go(-1)}
              className='absolute start-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-stone-800 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500'
              aria-label={t('home.promo.previous')}
            >
              <ChevronLeft className='h-4 w-4 rtl:-scale-x-100' aria-hidden />
            </button>
            <button
              type='button'
              onClick={() => go(1)}
              className='absolute end-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-stone-800 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500'
              aria-label={t('home.promo.next')}
            >
              <ChevronRight className='h-4 w-4 rtl:-scale-x-100' aria-hidden />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div
          className='flex items-center justify-center gap-1.5 bg-white/90 px-3 py-2'
          role='tablist'
          aria-label={t('home.promo.slidesLabel')}
        >
          {slides.map((s, i) => (
            <button
              key={s.id}
              type='button'
              role='tab'
              aria-selected={i === index}
              aria-label={t('home.promo.showSlide', {
                number: i + 1,
                label: s.eyebrow,
              })}
              onClick={() => setIndex(i)}
              className={cn(
                'h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500',
                i === index
                  ? 'w-6 bg-fuchsia-600'
                  : 'w-2 bg-stone-300 hover:bg-stone-400',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
