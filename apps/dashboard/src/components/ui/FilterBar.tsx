import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useT } from '../../i18n/I18nProvider';
import { cn } from '../../lib/cn';
import { Button } from './Button';
import { Tag } from './StatusBadge';

export type ActiveFilter = {
  key: string;
  /** Already-translated, e.g. "Status: Paid". */
  label: string;
  onRemove: () => void;
};

/**
 * The one toolbar above a table: search and filter controls wrap from the
 * start, results count / view controls sit at the end, and active filters show
 * as removable chips underneath with a "Clear filters" ghost button.
 */
export function FilterBar({
  children,
  end,
  active = [],
  onClear,
  className,
}: {
  /** SearchInput, Select, date inputs… each sized by the caller (e.g. w-full sm:w-64). */
  children: ReactNode;
  /** Results count, density or view toggles. */
  end?: ReactNode;
  active?: ActiveFilter[];
  /** Shown when there is at least one active filter. */
  onClear?: () => void;
  className?: string;
}) {
  const { t } = useT();
  return (
    <div className={cn('space-y-3', className)}>
      <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
        <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3'>{children}</div>
        {end && <div className='flex items-center gap-2 text-body-sm text-muted-foreground'>{end}</div>}
      </div>
      {active.length > 0 && (
        <div className='flex flex-wrap items-center gap-2'>
          {active.map((f) => (
            <Tag key={f.key} onRemove={f.onRemove} removeLabel={t('common.removeFilter', { name: f.label })}>
              {f.label}
            </Tag>
          ))}
          {onClear && (
            <Button variant='ghost' size='sm' onClick={onClear} icon={<X aria-hidden />}>
              {t('common.clearFilters')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Appears above a table while rows are selected: count, bulk actions, clear. */
export function BulkActionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  const { t, formatNumber } = useT();
  if (count === 0) return null;
  return (
    <div
      role='region'
      aria-label={t('common.selected', { count: formatNumber(count) })}
      className='flex flex-wrap items-center gap-3 rounded-badge bg-primary px-4 py-2 text-sm text-primary-foreground'
    >
      <span className='font-medium tabular-nums'>{t('common.selected', { count: formatNumber(count) })}</span>
      <div className='flex flex-wrap items-center gap-2'>{children}</div>
      <button
        type='button'
        onClick={onClear}
        className='ms-auto rounded-control px-2 py-1 text-body-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground'
      >
        {t('common.clearSelection')}
      </button>
    </div>
  );
}
