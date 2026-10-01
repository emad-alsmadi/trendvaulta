import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Tip } from './Tooltip';
import { buttonVariants, type ButtonVariantProps } from './styles';

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> &
  Pick<ButtonVariantProps, 'variant'> & {
    icon: ReactNode;
    /** Accessible name; also shown as the tooltip. */
    label: string;
    size?: 'sm' | 'md' | 'lg';
    /** Swaps in a spinner and blocks further clicks. */
    loading?: boolean;
    /** Set `false` when the label is already visible next to the button. */
    tooltip?: boolean;
  };

const SIZE = { sm: 'icon-sm', md: 'icon', lg: 'icon-lg' } as const;

/**
 * Icon-only button (row actions, toolbars): 32 · 36 · 40px square, always
 * named, with the name shown as a tooltip on hover and focus.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      className,
      variant = 'ghost',
      size = 'sm',
      icon,
      label,
      loading = false,
      tooltip = true,
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) {
    const button = (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-label={label}
        className={cn(
          buttonVariants({ variant, size: SIZE[size] }),
          variant === 'ghost' && 'text-muted-foreground hover:text-foreground',
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2
            className='animate-spin'
            aria-hidden
          />
        ) : (
          icon
        )}
      </button>
    );
    return tooltip ? <Tip label={label}>{button}</Tip> : button;
  },
);
