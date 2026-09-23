import { ChevronLeft, ChevronRight } from 'lucide-react';

export type PageMeta = {
  total: number;
  page: number;
  pages: number;
  limit: number;
};

const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Pager for a server-paginated table.
 *
 * Deliberately shows "x–y of n" rather than a numbered page strip: the row
 * range is what tells an admin where they are in a list they are scanning.
 */
export function TablePagination({
  meta,
  onPage,
  onLimit,
  busy = false,
}: {
  meta?: PageMeta;
  onPage: (page: number) => void;
  onLimit?: (limit: number) => void;
  busy?: boolean;
}) {
  if (!meta || meta.total === 0) return null;

  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.total, meta.page * meta.limit);
  const canPrev = meta.page > 1;
  const canNext = meta.page < meta.pages;

  const arrow =
    'inline-flex items-center rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700';

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-700"
    >
      <p
        className="text-sm text-gray-600 dark:text-gray-400"
        aria-live="polite"
        // Screen readers should hear the new range once the rows have settled,
        // not on every keystroke of an in-flight refetch.
        aria-busy={busy}
      >
        {from.toLocaleString()}–{to.toLocaleString()} of{' '}
        {meta.total.toLocaleString()}
      </p>

      <div className="flex items-center gap-2">
        {onLimit && (
          <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
            <span className="sr-only sm:not-sr-only">Rows</span>
            <select
              value={meta.limit}
              onChange={(e) => onLimit(Number(e.target.value))}
              aria-label="Rows per page"
              className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={() => onPage(meta.page - 1)}
          disabled={!canPrev}
          aria-label="Previous page"
          className={arrow}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm tabular-nums text-gray-600 dark:text-gray-400">
          {meta.page} / {meta.pages}
        </span>
        <button
          type="button"
          onClick={() => onPage(meta.page + 1)}
          disabled={!canNext}
          aria-label="Next page"
          className={arrow}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
