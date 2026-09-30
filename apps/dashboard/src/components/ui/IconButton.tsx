import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { buttonVariants, type ButtonVariantProps } from './styles';

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonVariantProps & {
    /** Leading icon (16px by default). */
    icon: ReactNode;
    /** Accessible label — required for icon-only buttons. */
    'aria-label': string;
    /** Icon size override. */
    iconSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    /** Swaps in a spinner, keeps the width, and blocks further clicks. */
    loading?: boolean;
  };

/**
 * Icon-only button. Always requires an aria-label for accessibility.
 * Sizes: sm (32px), md (36px), lg (40px), plus icon-only variants.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      className,
      variant,
      size,
      icon,
      iconSize = 'sm',
      loading = false,
      disabled,
      'aria-label': ariaLabel,
      type = 'button',
      ...props
    },
    ref,
  ) {
    const iconSizeClasses = {
      xs: 'icon-xs',
      sm: 'icon-sm',
      md: 'icon-md',
      lg: 'icon-lg',
      xl: 'icon-xl',
    } as const;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-label={ariaLabel}
        className={cn(
          buttonVariants({ variant, size: size || 'md' }),
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            'inline-flex items-center justify-center',
            loading && 'invisible',
          )}
        >
          <span
            className={cn(iconSizeClasses[iconSize])}
            aria-hidden
          >
            {icon}
          </span>
        </span>
        {loading && (
          <span className='absolute inset-0 flex items-center justify-center'>
            <Loader2
              className={cn(iconSizeClasses[iconSize], 'animate-spin')}
              aria-hidden
            />
          </span>
        )}
      </button>
    );
  },
);
