'use client';

import { useCallback, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import {
  DEMO_HERO_SLIDES,
  type DemoHeroSlide,
} from '@/data/demoStorefront';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';

const noopSubscribe = () => () => {};

const EASE = [0.22, 1, 0.36, 1] as const; // --ease-brand

const TONE_OVERLAY: Record<DemoHeroSlide['tone'], string> = {
  rose: 'from-rose-950/75 via-rose-900/30 to-transparent',
  stone: 'from-stone-950/75 via-stone-900/30 to-transparent',
  teal: 'from-teal-950/75 via-teal-900/30 to-transparent',
  indigo: 'from-indigo-950/75 via-indigo-900/30 to-transparent',
};

const arrowClass =
  'absolute top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-stone-900 shadow-soft backdrop-blur-sm ' +
  'transition-[opacity,background-color,box-shadow,transform] duration-(--dur-base) ease-brand hover:bg-white hover:shadow-raised active:scale-95 ' +
  'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900/40 ' +
  // Reveal on hover for pointer devices; always visible on touch screens.
  'opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100';

type Props = {
  /** Optional override — defaults to DEMO_HERO_SLIDES */
  slides?: DemoHeroSlide[];
  /** Auto-advance interval ms; 0 disables */
  intervalMs?: number;
  className?: string;
};

/**
 * Homepage promo carousel — slides from GET /api/storefront/home when provided.
 *
 * Motion: images cross-fade (no blank gap) with a slow settle-in zoom; copy
 * slides in from the reading direction. Autoplay is driven by the active
 * progress bar's CSS animation, so hover/focus pause resumes exactly where it
 * stopped instead of restarting a timer.
 */
export function HeroPromoCarousel({
  slides = DEMO_HERO_SLIDES,
  intervalMs = 6000,
  className,
}: Props) {
  const { t, dir } = useTranslation();
  const [index, setIndex] = useState(0);
  // +1 = moving forward, -1 = back — steers the copy's slide direction.
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  // WCAG 2.2.2: moving content needs a user control, and nothing should
  // move on its own for people who asked the OS to reduce motion.
  const prefersReducedMotion = useReducedMotion();
  const [stopped, setStopped] = useState(false);
  // The OS motion preference is only known in the browser: autoplay and the
  // pause control start after hydration so server and client HTML match.
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const count = slides.length;
  const autoplay =
    isClient && !stopped && !prefersReducedMotion && intervalMs > 0 && count > 1;
  const slide = slides[index] ?? slides[0];
  const rtl = dir === 'rtl';

  const go = useCallback(
    (step: -1 | 1) => {
      if (count === 0) return;
      setDirection(step);
      setIndex((i) => (i + step + count) % count);
    },
    [count],
  );

  const goTo = (i: number) => {
    if (i === index) return;
    setDirection(i > index ? 1 : -1);
    setIndex(i);
  };

  // Physical gestures/keys → logical steps (in RTL "next" sits on the left).
  const onPanEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 50 || Math.abs(info.offset.x) < Math.abs(info.offset.y)) return;
    const towardsStart = info.offset.x < 0 ? !rtl : rtl; // swiped content toward the start edge
    go(towardsStart ? 1 : -1);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const right = e.key === 'ArrowRight';
    go(right !== rtl ? 1 : -1);
  };

  if (!slide || count === 0) return null;

  // Copy enters from the side it's travelling from, mirrored for RTL.
  const copyOffset = prefersReducedMotion ? 0 : 24 * direction * (rtl ? -1 : 1);

  return (
    <motion.div
      role='region'
      aria-roledescription='carousel'
      aria-label={t('home.promo.slidesLabel')}
      tabIndex={-1}
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-stone-900 shadow-overlay',
        className,
      )}
      style={{ touchAction: 'pan-y' }}
      onPanEnd={count > 1 ? onPanEnd : undefined}
      onKeyDown={count > 1 ? onKeyDown : undefined}
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
        {/* Cross-fade: both slides are stacked while one fades over the other. */}
        <AnimatePresence initial={false}>
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.7, ease: EASE },
              scale: { duration: 1.6, ease: EASE },
            }}
            className='absolute inset-0'
          >
            <div
              className='absolute inset-0 bg-cover bg-center'
              style={{ backgroundImage: `url(${slide.imageUrl})` }}
              role='img'
              aria-label={t(slide.title)}
            />
            <div
              className={cn('absolute inset-0 bg-gradient-to-t', TONE_OVERLAY[slide.tone])}
              aria-hidden
            />
          </motion.div>
        </AnimatePresence>

        {/* Progress segments + pause — top of the frame, story-style. */}
        {count > 1 && (
          <div className='absolute inset-x-4 top-4 z-20 flex items-center gap-3 sm:inset-x-5'>
            <div
              className='flex flex-1 items-center gap-1.5'
              role='group'
              aria-label={t('home.promo.slidesLabel')}
            >
              {slides.map((s, i) => {
                const active = i === index;
                return (
                  <button
                    key={s.id}
                    type='button'
                    aria-current={active ? 'true' : undefined}
                    aria-label={t('home.promo.showSlide', {
                      number: i + 1,
                      label: t(s.eyebrow),
                    })}
                    onClick={() => goTo(i)}
                    // Tall hit area, thin visual bar.
                    className='group/seg relative flex h-6 flex-1 items-center focus-visible:outline-none'
                  >
                    <span className='relative h-1 w-full overflow-hidden rounded-full bg-white/30 transition-colors duration-(--dur-fast) group-hover/seg:bg-white/50 group-focus-visible/seg:ring-2 group-focus-visible/seg:ring-white'>
                      {active && autoplay ? (
                        <span
                          key={`${s.id}-${index}`}
                          aria-hidden
                          className='absolute inset-0 origin-left rounded-full bg-white rtl:origin-right'
                          style={{
                            animation: `hero-progress ${intervalMs}ms linear forwards`,
                            animationPlayState: paused ? 'paused' : 'running',
                          }}
                          onAnimationEnd={() => go(1)}
                        />
                      ) : (
                        <span
                          aria-hidden
                          className={cn(
                            'absolute inset-0 rounded-full bg-white transition-opacity duration-(--dur-base)',
                            active ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            {isClient && !prefersReducedMotion && intervalMs > 0 && (
              <button
                type='button'
                onClick={() => setStopped((v) => !v)}
                aria-label={stopped ? t('home.promo.play') : t('home.promo.pause')}
                className='inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm transition-colors duration-(--dur-fast) hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'
              >
                {stopped ? (
                  <Play className='h-3.5 w-3.5' fill='currentColor' aria-hidden />
                ) : (
                  <Pause className='h-3.5 w-3.5' fill='currentColor' aria-hidden />
                )}
              </button>
            )}
          </div>
        )}

        {/* Slides can come from the CMS in one language only; dir='auto'
            lets each line follow its own text so English punctuation stays
            in place on the Arabic page. */}
        <div className='absolute inset-x-0 bottom-0 z-10 p-5 sm:p-7' aria-live={autoplay && !paused ? 'off' : 'polite'}>
          <AnimatePresence mode='wait' initial={false}>
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, x: copyOffset }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -copyOffset / 2 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <p dir='auto' className='text-eyebrow uppercase text-white/80'>
                {t(slide.eyebrow)}
              </p>
              <h2 dir='auto' className='mt-2 max-w-md text-xl font-extrabold leading-snug text-white sm:text-2xl'>
                {t(slide.title)}
              </h2>
              <p dir='auto' className='mt-1.5 max-w-sm text-sm font-medium text-white/85'>
                {t(slide.subtitle)}
              </p>
              <Link
                href={slide.href}
                dir='auto'
                className='group/cta mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-stone-900 shadow-soft transition-[background-color,box-shadow,transform] duration-(--dur-fast) ease-brand hover:bg-stone-50 hover:shadow-raised active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900'
              >
                {t(slide.ctaLabel)}
                <ArrowRight
                  aria-hidden
                  className='h-4 w-4 transition-transform duration-(--dur-base) ease-brand rtl:-scale-x-100 ltr:group-hover/cta:translate-x-0.5 rtl:group-hover/cta:-translate-x-0.5'
                />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        {count > 1 && (
          <>
            <button
              type='button'
              onClick={() => go(-1)}
              className={cn(arrowClass, 'start-3')}
              aria-label={t('home.promo.previous')}
            >
              <ChevronLeft className='h-5 w-5 rtl:-scale-x-100' aria-hidden />
            </button>
            <button
              type='button'
              onClick={() => go(1)}
              className={cn(arrowClass, 'end-3')}
              aria-label={t('home.promo.next')}
            >
              <ChevronRight className='h-5 w-5 rtl:-scale-x-100' aria-hidden />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
