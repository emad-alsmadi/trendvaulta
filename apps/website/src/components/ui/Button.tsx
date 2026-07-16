import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-extrabold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-md',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white hover:from-fuchsia-700 hover:via-purple-700 hover:to-cyan-600 hover:scale-105',
        destructive:
          'bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 text-white hover:from-rose-700 hover:via-red-700 hover:to-pink-700 hover:scale-105',
        outline:
          'border-2 border-fuchsia-300 bg-white/80 text-fuchsia-700 hover:bg-fuchsia-50 hover:border-fuchsia-400 hover:text-fuchsia-800 hover:scale-105',
        secondary:
          'bg-gradient-to-r from-purple-100 via-pink-100 to-cyan-100 text-purple-800 hover:from-purple-200 hover:via-pink-200 hover:to-cyan-200 hover:scale-105',
        ghost:
          'bg-white/40 text-purple-700 hover:bg-white/60 hover:text-purple-800 backdrop-blur-sm hover:scale-105',
        link: 'underline-offset-4 hover:underline text-fuchsia-600 font-extrabold hover:text-fuchsia-700',
      },
      size: {
        default: 'h-12 py-3 px-6',
        sm: 'h-10 px-4 rounded-lg',
        lg: 'h-14 px-10 rounded-2xl',
        icon: 'h-12 w-12 rounded-xl',
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
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
