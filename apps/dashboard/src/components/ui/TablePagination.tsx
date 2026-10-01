import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '../../i18n/I18nProvider';
import { cn } from '../../lib/cn';
import { Select } from './Field';
import { buttonVariants } from './styles';

export type PageMeta = {
  total: number;
  page: number;
  pages: number;
  limit: number;
};

const PAGE_SIZES = [10, 25, 50, 100];

/** 1 … 4 5 [6] 7 8 … 20 — first, last and two either side of the current page. */
function pageList(page: number, pages: number): Array<number | 'gap'> {
  const out: Array<number | 'gap'> = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) out.push(p);
    else if (out[out.length - 1] !== 'gap') out.push('gap');
  }
  return out;
}

/**
 * Pager for a server-paginated table.
 *
 * The "x–y of n" range leads: it tells an admin where they are in a list
 * they are scanning. Page buttons follow on wider screens; phones keep
 * prev / "page / pages" / next.
 */
export function TablePagination({
  meta,
  onPage,
  onLimit,
  busy = false,
  className = 'mt-4 border-t border-border pt-4',
}: {
  meta?: PageMeta;
  onPage: (page: number) => void;
  onLimit?: (limit: number) => void;
  busy?: boolean;
  /** The default separates it from a bare table; pass '' inside <TableCard footer>. */
  className?: string;
}) {
  const { t, formatNumber } = useT();
  if (!meta || meta.total === 0) return null;

  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.total, meta.page * meta.limit);
  const canPrev = meta.page > 1;
  const canNext = meta.page < meta.pages;

  const square = buttonVariants({ variant: 'ghost', size: 'icon-sm' });

  return (
    <nav
      aria-label={t('pagination.label')}
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
    >
      <p
        className='text-body-sm tabular-nums text-muted-foreground'
        aria-live='polite'
        // Screen readers should hear the new range once the rows have settled,
        // not on every keystroke of an in-flight refetch.
        aria-busy={busy}
      >
        {t('pagination.range', {
          from: formatNumber(from),
          to: formatNumber(to),
          total: formatNumber(meta.total),
        })}
      </p>

      <div className='flex flex-wrap items-center gap-3'>
        {onLimit && (
          <div className='flex items-center gap-2 text-body-sm text-muted-foreground'>
            <span
              aria-hidden
              className='hidden sm:inline'
            >
              {t('pagination.rows')}
            </span>
            <Select
              value={meta.limit}
              onChange={(e) => onLimit(Number(e.target.value))}
              aria-label={t('pagination.rowsPerPage')}
              size='sm'
              className='w-[4.5rem]'
            >
              {(PAGE_SIZES.includes(meta.limit)
                ? PAGE_SIZES
                : [...PAGE_SIZES, meta.limit].sort((a, b) => a - b)
              ).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className='flex items-center gap-1'>
          <button
            type='button'
            onClick={() => onPage(meta.page - 1)}
            disabled={!canPrev}
            aria-label={t('pagination.previous')}
            className={cn(buttonVariants({ variant: 'secondary', size: 'icon-sm' }))}
          >
            <ChevronLeft className='rtl:-scale-x-100' aria-hidden />
          </button>

          <ul className='hidden items-center gap-1 sm:flex'>
            {pageList(meta.page, meta.pages).map((p, i) =>
              p === 'gap' ? (
                <li key={`gap-${i}`} aria-hidden className='w-8 text-center text-body-sm text-muted-foreground'>
                  …
                </li>
              ) : (
                <li key={p}>
                  <button
                    type='button'
                    onClick={() => onPage(p)}
                    aria-label={t('pagination.page', { page: formatNumber(p) })}
                    aria-current={p === meta.page ? 'page' : undefined}
                    className={cn(
                      square,
                      'text-body-sm tabular-nums',
                      p === meta.page && 'bg-primary text-primary-foreground hover:bg-primary/90',
                    )}
                  >
                    {formatNumber(p)}
                  </button>
                </li>
              ),
            )}
          </ul>
          <span className='px-2 text-body-sm tabular-nums text-muted-foreground sm:hidden'>
            {meta.page} / {meta.pages}
          </span>

          <button
            type='button'
            onClick={() => onPage(meta.page + 1)}
            disabled={!canNext}
            aria-label={t('pagination.next')}
            className={cn(buttonVariants({ variant: 'secondary', size: 'icon-sm' }))}
          >
            <ChevronRight className='rtl:-scale-x-100' aria-hidden />
          </button>
        </div>
      </div>
    </nav>
  );
}
