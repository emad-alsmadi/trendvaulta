import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Calm, consistent motion: a soft shadow lift on hover and a small press on
// active — no scale-up/jump, which read as template-like.
const buttonVariants = cva(
  'relative inline-flex select-none items-center justify-center gap-2 rounded-control text-sm font-bold transition-[background-color,border-color,color,box-shadow,transform] duration-(--dur-fast) ease-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white shadow-soft hover:from-fuchsia-700 hover:via-purple-700 hover:to-cyan-600 hover:shadow-raised',
        destructive:
          'bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 text-white shadow-soft hover:from-rose-700 hover:via-red-700 hover:to-pink-700 hover:shadow-raised',
        outline:
          'border-2 border-fuchsia-300 bg-white/80 text-fuchsia-700 hover:border-fuchsia-400 hover:bg-fuchsia-50 hover:text-fuchsia-800',
        secondary:
          'bg-gradient-to-r from-purple-100 via-pink-100 to-cyan-100 text-purple-800 hover:from-purple-200 hover:via-pink-200 hover:to-cyan-200',
        ghost:
          'bg-white/40 text-purple-700 backdrop-blur-sm hover:bg-white/60 hover:text-purple-800',
        link: 'text-fuchsia-600 underline-offset-4 hover:text-fuchsia-700 hover:underline active:scale-100',
      },
      size: {
        default: 'h-12 px-6',
        sm: 'h-10 px-4',
        lg: 'h-14 px-10 text-base',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner, keeps the width, and blocks clicks. */
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
    ref,
  ) => {
    void asChild;
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            {/* Label stays in the flow (invisible) so the width doesn't jump. */}
            <span className='invisible inline-flex items-center gap-2'>{children}</span>
            <Loader2 className='absolute h-4 w-4 animate-spin' aria-hidden />
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
