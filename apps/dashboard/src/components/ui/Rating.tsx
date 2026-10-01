import { Star } from 'lucide-react';
import { cn } from '../../lib/cn';

/** Read-only star rating: filled stars up to `value`, outlines after. */
export function Rating({
  value,
  max = 5,
  label,
  className,
}: {
  value: number;
  max?: number;
  /** Accessible text, e.g. t('testimonials.ratedOf', { n }). */
  label: string;
  className?: string;
}) {
  return (
    <span
      role='img'
      aria-label={label}
      title={label}
      className={cn('inline-flex items-center gap-0.5', className)}
    >
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          aria-hidden
          className={cn(
            'size-3.5',
            i < Math.round(value)
              ? 'fill-foreground text-foreground'
              : 'text-border-strong',
          )}
        />
      ))}
    </span>
  );
}
