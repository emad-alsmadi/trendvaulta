import type { FormEvent, ReactNode } from 'react';
import { X } from 'lucide-react';
import { useT } from '../../i18n/I18nProvider';
import { cn } from '../../lib/cn';
import { SearchInput } from './Field';
import { Button } from './Button';

export type FilterBarSearch = {
  value: string;
  onChange: (value: string) => void;
  /** Search-on-submit pages pass this; the search button then appears. */
  onSubmit?: () => void;
  placeholder?: string;
  /** Accessible name — the placeholder never replaces a label. */
  label: string;
  /** Text for the submit button (defaults to the label). */
  submitLabel?: string;
};

/**
 * The toolbar above a table: search first, then the filter selects, then a
 * quiet "clear filters" once something is applied. Page-level actions (export,
 * bulk) go in `actions`, pushed to the end.
 */
export function FilterBar({
  search,
  children,
  onClear,
  canClear = false,
  actions,
  className,
}: {
  search?: FilterBarSearch;
  /** Filter controls — give each one <FilterBarItem> for a consistent width. */
  children?: ReactNode;
  onClear?: () => void;
  canClear?: boolean;
  actions?: ReactNode;
  className?: string;
}) {
  const { t } = useT();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    search?.onSubmit?.();
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center',
        className,
      )}
    >
      {search && (
        <form
          role='search'
          onSubmit={submit}
          className='flex min-w-0 gap-2 sm:w-72 sm:flex-none lg:w-80'
        >
          <SearchInput
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder}
            aria-label={search.label}
            wrapperClassName='min-w-0 flex-1'
          />
          {search.onSubmit && (
            <Button
              type='submit'
              variant='secondary'
            >
              {search.submitLabel ?? search.label}
            </Button>
          )}
        </form>
      )}
      {children}
      {canClear && onClear && (
        <Button
          variant='ghost'
          onClick={onClear}
          icon={<X aria-hidden />}
          className='text-muted-foreground hover:text-foreground'
        >
          {t('common.clearFilters')}
        </Button>
      )}
      {actions && (
        <div className='flex flex-wrap items-center gap-2 sm:ms-auto'>
          {actions}
        </div>
      )}
    </div>
  );
}

/** Width wrapper for a filter control: full width on phones, compact beside search. */
export function FilterBarItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('w-full min-w-0 sm:w-44', className)}>{children}</div>
  );
}
