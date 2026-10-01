import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useT } from '../../i18n/I18nProvider';
import { buttonVariants } from './styles';

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  disabled?: boolean;
};

/** 1 … 4 5 [6] 7 8 … 20 — first, last and one either side of the current page. */
function getVisiblePages(current: number, total: number): (number | 'gap')[] {
  const out: (number | 'gap')[] = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - current) <= 1) out.push(p);
    else if (out[out.length - 1] !== 'gap') out.push('gap');
  }
  return out;
}

/**
 * Page buttons for a card grid (no "rows per page" or range). Tables use
 * <TablePagination>, which shares the same button treatment.
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  disabled = false,
}: PaginationProps) {
  const { t, formatNumber } = useT();

  if (totalPages <= 1) return null;

  const square = buttonVariants({ variant: 'ghost', size: 'icon-sm' });
  const edge = buttonVariants({ variant: 'secondary', size: 'icon-sm' });

  return (
    <nav
      className={cn('flex items-center justify-center gap-1', className)}
      aria-label={t('pagination.label')}
    >
      <button
        type='button'
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || currentPage === 1}
        aria-label={t('pagination.previous')}
        className={edge}
      >
        <ChevronLeft
          className='rtl:-scale-x-100'
          aria-hidden
        />
      </button>

      <ul className='hidden items-center gap-1 sm:flex'>
        {getVisiblePages(currentPage, totalPages).map((page, index) =>
          page === 'gap' ? (
            <li
              key={`gap-${index}`}
              aria-hidden
              className='w-8 text-center text-body-sm text-muted-foreground'
            >
              …
            </li>
          ) : (
            <li key={page}>
              <button
                type='button'
                onClick={() => onPageChange(page)}
                disabled={disabled}
                aria-label={t('pagination.page', { page: formatNumber(page) })}
                aria-current={page === currentPage ? 'page' : undefined}
                className={cn(
                  square,
                  'text-body-sm tabular-nums',
                  page === currentPage &&
                    'bg-primary text-primary-foreground hover:bg-primary/90',
                )}
              >
                {formatNumber(page)}
              </button>
            </li>
          ),
        )}
      </ul>
      <span className='px-2 text-body-sm tabular-nums text-muted-foreground sm:hidden'>
        {currentPage} / {totalPages}
      </span>

      <button
        type='button'
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
        aria-label={t('pagination.next')}
        className={edge}
      >
        <ChevronRight
          className='rtl:-scale-x-100'
          aria-hidden
        />
      </button>
    </nav>
  );
}
