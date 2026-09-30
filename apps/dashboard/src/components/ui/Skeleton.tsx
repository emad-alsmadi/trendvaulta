import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  /** Predefined shape: text, avatar, thumbnail, card, kpi, button, badge */
  variant?:
    | 'text'
    | 'avatar'
    | 'thumbnail'
    | 'card'
    | 'kpi'
    | 'button'
    | 'badge'
    | 'custom';
  /** Animation style: shimmer (default), pulse, wave */
  animation?: 'shimmer' | 'pulse' | 'wave';
};

/**
 * Skeleton loading placeholder. Uses the shimmer animation from index.css.
 * Predefined shapes match common UI patterns; use 'custom' with explicit classes for others.
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  function Skeleton(
    { className, variant = 'text', animation = 'shimmer', ...props },
    ref,
  ) {
    const variantClasses = {
      text: 'skeleton-text',
      avatar: 'skeleton-avatar',
      thumbnail: 'skeleton-thumbnail',
      card: 'skeleton-card',
      kpi: 'skeleton-kpi',
      button: 'skeleton-button',
      badge: 'skeleton-badge',
      custom: '',
    };

    const animationClasses = {
      shimmer: 'animate-[skeleton-shimmer_2s_ease-in-out_infinite]',
      pulse: 'animate-[skeleton-pulse_1.5s_ease-in-out_infinite]',
      wave: 'animate-[skeleton-wave_1.5s_ease-in-out_infinite]',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'skeleton',
          variantClasses[variant],
          animationClasses[animation],
          className,
        )}
        aria-hidden
        role='presentation'
        {...props}
      />
    );
  },
);

/**
 * Skeleton row for table or list items. Displays a horizontal layout of
 * skeleton elements matching a typical row structure.
 */
export function SkeletonRow({
  cells = 4,
  className,
}: {
  cells?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-4 py-3', className)}>
      {Array.from({ length: cells }).map((_, i) => (
        <Skeleton
          key={i}
          variant='text'
          className={cn(
            'flex-1',
            i === 0 && 'w-1/4',
            i === cells - 1 && 'w-1/6',
          )}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton card for dashboard tiles. Shows a header, content, and optional footer.
 */
export function SkeletonCard({
  hasFooter = false,
  className,
}: {
  hasFooter?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-card p-5 transition-all duration-300 hover:shadow-lg',
        className,
      )}
    >
      <div className='mb-4 flex items-center justify-between gap-3'>
        <Skeleton
          variant='text'
          className='w-1/3'
          animation='pulse'
        />
        <Skeleton
          variant='badge'
          animation='pulse'
        />
      </div>
      <Skeleton
        variant='kpi'
        className='mb-3'
        animation='shimmer'
      />
      <Skeleton
        variant='text'
        className='w-1/2'
        animation='shimmer'
      />
      {hasFooter && (
        <div className='mt-4 pt-4 border-t border-border'>
          <Skeleton
            variant='text'
            className='w-1/4'
            animation='pulse'
          />
        </div>
      )}
    </div>
  );
}
