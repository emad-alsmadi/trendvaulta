'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';

/**
 * Shimmering placeholder block. Size it with the same classes as the real
 * element (h-/w-/aspect-/rounded-) so nothing jumps when data lands.
 * Decorative: wrap a group of skeletons in <SkeletonGroup> for the a11y label.
 *
 * Rule of thumb: skeletons for the *first* load of content only. Keep the last
 * good data visible on refetch, and keep spinners for button-level actions.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        'rounded-control bg-surface-muted',
        'bg-[linear-gradient(90deg,transparent_0%,rgb(255_255_255/0.7)_50%,transparent_100%)] bg-size-[200%_100%] bg-no-repeat',
        'animate-shimmer rtl:[animation-direction:reverse] motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}

/** Paragraph placeholder — the last line is shorter, like real text. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2.5', className)} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3.5', i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

/** Announces one loading state for a block of skeletons. */
export function SkeletonGroup({
  label,
  className,
  children,
}: {
  /** Translated; defaults to t('common.loading'). */
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div role='status' aria-live='polite' aria-busy className={className}>
      <span className='sr-only'>{label ?? t('common.loading')}</span>
      {children}
    </div>
  );
}

// ─── Presets — mirror the real components' geometry ──────────────────────────

/** Mirrors components/products/ProductCard. */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm', className)}
    >
      <Skeleton className='aspect-square w-full rounded-none' />
      <div className='p-4'>
        <Skeleton className='h-3 w-1/3' />
        <Skeleton className='mt-2.5 h-4 w-full' />
        <Skeleton className='mt-1.5 h-4 w-3/4' />
        <Skeleton className='mt-3 h-3 w-24' />
        <Skeleton className='mt-4 h-6 w-20' />
        <div className='mt-4 flex gap-2'>
          <Skeleton className='h-9 flex-1' />
          <Skeleton className='h-9 w-9 shrink-0' />
        </div>
      </div>
    </div>
  );
}

/** A grid of product card skeletons; pass the real grid's classes. */
export function ProductGridSkeleton({
  count = 8,
  className,
  label,
}: {
  count?: number;
  className?: string;
  label?: string;
}) {
  return (
    <SkeletonGroup label={label} className={className}>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </SkeletonGroup>
  );
}

/** Image-led tile (categories, deals, lookbooks, brands). */
export function MediaTileSkeleton({
  className,
  mediaClassName = 'aspect-[4/3]',
  lines = 2,
}: {
  className?: string;
  mediaClassName?: string;
  lines?: number;
}) {
  return (
    <div aria-hidden className={className}>
      <Skeleton className={cn('w-full rounded-card', mediaClassName)} />
      <Skeleton className='mt-3 h-4 w-2/3' />
      {lines > 1 && <Skeleton className='mt-2 h-3 w-1/2' />}
    </div>
  );
}

/** Row list: thumbnail + two lines + trailing meta (orders, addresses, reviews…). */
export function ListSkeleton({
  rows = 3,
  thumb = true,
  className,
  label,
}: {
  rows?: number;
  thumb?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <SkeletonGroup label={label} className={cn('space-y-3', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className='flex items-center gap-4 rounded-card border border-line bg-surface p-4'
        >
          {thumb && <Skeleton className='h-14 w-14 shrink-0 rounded-card' />}
          <div className='min-w-0 flex-1'>
            <Skeleton className='h-4 w-2/5' />
            <Skeleton className='mt-2 h-3 w-3/5' />
          </div>
          <Skeleton className='hidden h-8 w-20 shrink-0 sm:block' />
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** Long-form content (policies, help articles). */
export function ProseSkeleton({ className, label }: { className?: string; label?: string }) {
  return (
    <SkeletonGroup label={label} className={cn('space-y-8', className)}>
      {[4, 3, 5].map((lines, i) => (
        <div key={i} aria-hidden>
          <Skeleton className='h-5 w-1/3' />
          <SkeletonText lines={lines} className='mt-4' />
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** Page heading: eyebrow, title, subtitle. */
export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={className}>
      <Skeleton className='h-3 w-24' />
      <Skeleton className='mt-3 h-8 w-64 max-w-full' />
      <Skeleton className='mt-3 h-4 w-96 max-w-full' />
    </div>
  );
}
