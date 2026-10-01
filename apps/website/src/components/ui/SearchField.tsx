import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input, type InputProps } from './Input';

type SearchFieldProps = Omit<InputProps, 'type'> & {
  /** Shows a clear button while the field has a value. */
  onClear?: () => void;
  /** Accessible name of the clear button (required with `onClear`). */
  clearLabel?: string;
  /** Classes for the input itself; `className` sizes the wrapper. */
  inputClassName?: string;
};

/** Search input with a leading icon and an optional clear button. */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ className, inputClassName, onClear, clearLabel, value, ...props }, ref) => (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden
        className='pointer-events-none absolute start-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-subtle'
      />
      <Input
        ref={ref}
        type='search'
        value={value}
        className={cn(
          'ps-10 [&::-webkit-search-cancel-button]:appearance-none',
          onClear && 'pe-10',
          inputClassName,
        )}
        {...props}
      />
      {onClear && value ? (
        <button
          type='button'
          onClick={onClear}
          aria-label={clearLabel}
          className='absolute end-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-subtle transition-colors duration-(--dur-fast) hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30'
        >
          <X aria-hidden className='h-4 w-4' />
        </button>
      ) : null}
    </div>
  ),
);
SearchField.displayName = 'SearchField';
