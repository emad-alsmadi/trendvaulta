import { forwardRef, type ReactNode } from 'react';
import { Filter, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { SearchInput } from './Field';
import { Button } from './Button';

export type FilterItem = {
  id: string;
  label: string;
  labelAr: string;
  value: string | number;
};

export interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  searchPlaceholder?: string;
  searchPlaceholderAr?: string;
  filters?: {
    id: string;
    label: string;
    labelAr: string;
    value: string | number | '';
    options: FilterItem[];
    onChange: (value: string | number | '') => void;
  }[];
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  children?: ReactNode;
  className?: string;
  lang?: 'en' | 'ar';
}

export const FilterBar = forwardRef<HTMLDivElement, FilterBarProps>(
  (
    {
      searchValue = '',
      onSearchChange,
      onSearchSubmit,
      searchPlaceholder = 'Search...',
      searchPlaceholderAr = 'بحث...',
      filters = [],
      onClearFilters,
      hasActiveFilters = false,
      children,
      className,
      lang = 'en',
    },
    ref,
  ) => {
    const isRTL = lang === 'ar';
    const currentPlaceholder = isRTL ? searchPlaceholderAr : searchPlaceholder;

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-3 sm:flex-row sm:items-center',
          className,
        )}
      >
        {/* Search Input */}
        {onSearchChange && (
          <form
            className='relative flex-1'
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit?.();
            }}
          >
            <SearchInput
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={currentPlaceholder}
              aria-label={isRTL ? 'بحث' : 'Search'}
              className='w-full focus-visible:ring-brand-purple'
            />
          </form>
        )}

        {/* Filter Dropdowns */}
        <div className='flex flex-wrap gap-2'>
          {filters.map((filter) => (
            <div
              key={filter.id}
              className='relative'
            >
              <label
                htmlFor={filter.id}
                className='sr-only'
              >
                {isRTL ? filter.labelAr : filter.label}
              </label>
              <select
                id={filter.id}
                value={filter.value}
                onChange={(e) =>
                  filter.onChange(
                    e.target.value === ''
                      ? ''
                      : isNaN(Number(e.target.value))
                        ? e.target.value
                        : Number(e.target.value),
                  )
                }
                className={cn(
                  'h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm',
                  'appearance-none pr-8 pl-3',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'transition-colors duration-200',
                  'hover:border-brand-purple/50 focus-visible:border-brand-purple',
                  isRTL ? 'pl-8 pr-3' : 'pr-8 pl-3',
                  'min-w-[140px] sm:min-w-[160px]',
                )}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <option value=''>
                  {isRTL ? filter.labelAr : filter.label}
                </option>
                {filter.options.map((option) => (
                  <option
                    key={option.id}
                    value={option.value}
                  >
                    {isRTL ? option.labelAr : option.label}
                  </option>
                ))}
              </select>
              <Filter
                className={cn(
                  'pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-brand-purple',
                  isRTL ? 'left-2.5' : 'right-2.5',
                )}
                aria-hidden
              />
            </div>
          ))}
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && onClearFilters && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onClearFilters}
            className={cn(
              'gap-1.5 text-muted-foreground hover:text-foreground',
              isRTL && 'flex-row-reverse',
            )}
          >
            <X className='size-4' />
            <span>{isRTL ? 'مسح الفلاتر' : 'Clear Filters'}</span>
          </Button>
        )}

        {/* Additional children */}
        {children}
      </div>
    );
  },
);

FilterBar.displayName = 'FilterBar';
