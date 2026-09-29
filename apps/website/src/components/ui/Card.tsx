import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Card surfaces. Default is `plain`: no border, no fill — let type, spacing
 * and composition carry the hierarchy. Reach for `muted`/`elevated` only when
 * the card must separate from a busy background; `outline` for dense lists.
 *
 *   plain     transparent, no padding — editorial blocks, feature lists
 *   muted     soft stone fill — grouped info (summaries, settings)
 *   elevated  white + soft shadow — floating content on tinted sections
 *   outline   hairline border — tables of choices, addresses, options
 */
const cardVariants = cva('relative text-start', {
  variants: {
    variant: {
      plain: '',
      muted: 'rounded-card bg-surface-muted p-5 sm:p-6',
      elevated: 'rounded-card bg-surface p-5 shadow-soft sm:p-6',
      outline: 'rounded-card border border-line bg-surface p-5 sm:p-6',
    },
    interactive: {
      true: 'group cursor-pointer transition-[box-shadow,transform,background-color] duration-(--dur-base) ease-brand focus-within:ring-2 focus-within:ring-accent/40',
      false: '',
    },
  },
  compoundVariants: [
    { variant: 'elevated', interactive: true, class: 'hover:-translate-y-0.5 hover:shadow-raised' },
    { variant: 'outline', interactive: true, class: 'hover:border-stone-300 hover:shadow-soft' },
    { variant: 'muted', interactive: true, class: 'hover:bg-stone-200/60' },
  ],
  defaultVariants: { variant: 'plain', interactive: false },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, interactive }), className)} {...props} />
  ),
);
Card.displayName = 'Card';

export { cardVariants };
