import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { buttonVariants, type ButtonVariantProps } from './styles';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonVariantProps & {
    /** Swaps in a spinner, keeps the width, and blocks further clicks. */
    loading?: boolean;
    /** Leading icon (16px). For icon-only buttons pass it as children with an aria-label. */
    icon?: ReactNode;
  };

/**
 * The one button: primary · secondary · ghost · subtle · destructive · link,
 * in sm (32) · md (36) · lg (40) and square icon sizes.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      size,
      loading = false,
      icon,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {/* The label stays in the flow (invisible) so the width doesn't jump. */}
        <span
          className={cn(
            'inline-flex items-center gap-2',
            loading && 'invisible',
          )}
        >
          {icon}
          {children}
        </span>
        {loading && (
          <span className='absolute inset-0 flex items-center justify-center'>
            <Loader2
              className='animate-spin'
              aria-hidden
            />
          </span>
        )}
      </button>
    );
  },
);

/** Inline spinner for loading text and regions (16px, current text colour). */
export function Spinner({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      role={label ? 'status' : undefined}
      className='inline-flex items-center gap-2'
    >
      <Loader2
        className={cn('size-4 animate-spin text-muted-foreground', className)}
        aria-hidden
      />
      {label && (
        <span className='text-body-sm text-muted-foreground'>{label}</span>
      )}
    </span>
  );
}
