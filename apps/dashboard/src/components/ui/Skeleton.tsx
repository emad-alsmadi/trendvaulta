import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { cardClass } from './styles';

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  /** Predefined shape (index.css); 'custom' takes its size from className. */
  variant?:
    | 'text'
    | 'avatar'
    | 'thumbnail'
    | 'card'
    | 'kpi'
    | 'button'
    | 'badge'
    | 'custom';
  /** Kept for existing call sites; every skeleton uses the same soft sweep. */
  animation?: 'shimmer' | 'pulse' | 'wave';
};

/** Loading placeholder in the shape of what is about to appear. */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  function Skeleton(
    { className, variant = 'text', animation: _animation, ...props },
    ref,
  ) {
    void _animation;
    return (
      <div
        ref={ref}
        className={cn(
          'skeleton',
          variant !== 'custom' && `skeleton-${variant}`,
          className,
        )}
        aria-hidden
        {...props}
      />
    );
  },
);

/** A row of text bars, for lists that are not tables. */
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
          className={cn('flex-1', i === cells - 1 && 'max-w-[4rem]')}
        />
      ))}
    </div>
  );
}

/** KPI / dashboard tile placeholder: caption, value, supporting line. */
export function SkeletonCard({
  hasFooter = false,
  className,
}: {
  hasFooter?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(cardClass, 'p-5', className)}>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <Skeleton className='w-1/3' />
        <Skeleton
          variant='custom'
          className='size-8 rounded-control'
        />
      </div>
      <Skeleton
        variant='kpi'
        className='mb-3'
      />
      <Skeleton className='w-1/2' />
      {hasFooter && (
        <div className='mt-4 border-t border-border pt-4'>
          <Skeleton className='w-1/4' />
        </div>
      )}
    </div>
  );
}

/** Whole-page placeholder for a list page: toolbar, then table rows. */
export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className={cn(cardClass, 'overflow-hidden')}>
      <div className='flex gap-2 border-b border-border p-4'>
        <Skeleton
          variant='custom'
          className='h-control w-64 max-w-full rounded-control'
        />
        <Skeleton
          variant='custom'
          className='hidden h-control w-40 rounded-control sm:block'
        />
      </div>
      <div className='divide-y divide-border px-4'>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
