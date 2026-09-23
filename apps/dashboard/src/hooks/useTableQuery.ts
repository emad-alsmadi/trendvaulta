import { useCallback, useMemo, useState } from 'react';

export type SortOrder = 'asc' | 'desc';

export type TableQueryState = {
  page: number;
  limit: number;
  sort?: string;
  order: SortOrder;
};

export type TableQuery = TableQueryState & {
  /** Query params to hand the API client. */
  params: { page: number; limit: number; sort?: string; order?: SortOrder };
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  /** Sort by a column; clicking the active column flips the direction. */
  toggleSort: (field: string) => void;
  /** Set field and direction outright, for a sort dropdown. */
  setSort: (field: string, order: SortOrder) => void;
  /** Call when a filter or search term changes, so page 1 is shown again. */
  resetPage: () => void;
};

/**
 * Paging and sort state for a server-backed table.
 *
 * Changing the sort or a filter must return to page 1 — staying on page 7 of a
 * newly-filtered set shows an empty table, which reads as "no results" rather
 * than "you are past the end".
 */
export function useTableQuery(
  options: { limit?: number; sort?: string; order?: SortOrder } = {},
): TableQuery {
  const { limit: initialLimit = 25, sort: initialSort, order: initialOrder = 'desc' } =
    options;

  const [state, setState] = useState<TableQueryState>({
    page: 1,
    limit: initialLimit,
    sort: initialSort,
    order: initialOrder,
  });

  const setPage = useCallback((page: number) => {
    setState((s) => ({ ...s, page: Math.max(1, page) }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setState((s) => ({ ...s, limit, page: 1 }));
  }, []);

  const toggleSort = useCallback((field: string) => {
    setState((s) => ({
      ...s,
      page: 1,
      sort: field,
      order: s.sort === field && s.order === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const setSort = useCallback((field: string, order: SortOrder) => {
    setState((s) => ({ ...s, page: 1, sort: field, order }));
  }, []);

  const resetPage = useCallback(() => {
    setState((s) => (s.page === 1 ? s : { ...s, page: 1 }));
  }, []);

  const params = useMemo(
    () => ({
      page: state.page,
      limit: state.limit,
      ...(state.sort ? { sort: state.sort, order: state.order } : {}),
    }),
    [state.page, state.limit, state.sort, state.order],
  );

  return { ...state, params, setPage, setLimit, toggleSort, setSort, resetPage };
}
