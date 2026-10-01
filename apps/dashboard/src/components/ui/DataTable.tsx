import { useEffect, useRef, type ReactNode } from 'react';
import type { SortOrder } from '../../hooks/useTableQuery';
import { useT } from '../../i18n/I18nProvider';
import { cn } from '../../lib/cn';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';
import { SortableHeader } from './SortableHeader';
import { Table, TableCard, THead, Th, Tr, Td } from './Table';
import { TablePagination, type PageMeta } from './TablePagination';
import { checkboxClass } from './styles';

export type DataTableColumn<T> = {
  /** Unique key; also the server sort field when `sortable`. */
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  /** End-aligned tabular figures (numbers, prices). */
  numeric?: boolean;
  /** Shrink-to-fit last column for row actions. */
  actions?: boolean;
  className?: string;
  headerClassName?: string;
};

export type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  getKey: (row: T) => string;
  /** Server-side sort state (useTableQuery). */
  sort?: string;
  order?: SortOrder;
  onSort?: (field: string) => void;
  /** First load: skeleton rows in the table's own layout. */
  loading?: boolean;
  /** Background refetch: the rows stay, a thin progress line shows. */
  fetching?: boolean;
  /** Empty state: what is missing, why, and what to do. */
  emptyIcon?: ReactNode;
  emptyTitle: ReactNode;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  /** FilterBar / bulk actions above the table, inside the card. */
  toolbar?: ReactNode;
  /** Server pagination. */
  meta?: PageMeta;
  onPage?: (page: number) => void;
  onLimit?: (limit: number) => void;
  /** Replaces the pager, e.g. an "x of y" count for client-filtered lists. */
  footer?: ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  /** Row selection for bulk actions. */
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  /** Minimum table width before it scrolls inside the card. */
  minWidthClass?: string;
  /** Read by screen readers as the table's name. */
  caption?: string;
  className?: string;
};

const SKELETON_ROWS = 6;
const SKELETON_WIDTHS = ['w-32', 'w-24', 'w-20', 'w-28', 'w-16'];

function SelectAll({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type='checkbox'
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
      className={checkboxClass}
    />
  );
}

/**
 * The admin list table: sortable headers, skeleton / empty states, optional
 * row selection, a toolbar above and the pager below — all inside one card.
 */
export function DataTable<T>({
  data,
  columns,
  getKey,
  sort,
  order = 'desc',
  onSort,
  loading = false,
  fetching = false,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  toolbar,
  meta,
  onPage,
  onLimit,
  footer,
  onRowClick,
  rowClassName,
  selectedKeys,
  onSelectionChange,
  minWidthClass = 'min-w-[720px]',
  caption,
  className,
}: DataTableProps<T>) {
  const { t } = useT();
  const selectable = Boolean(onSelectionChange);
  const selected = new Set(selectedKeys ?? []);
  const pageKeys = data.map(getKey);
  const selectedOnPage = pageKeys.filter((k) => selected.has(k)).length;
  const allSelected = data.length > 0 && selectedOnPage === data.length;
  const colSpan = columns.length + (selectable ? 1 : 0);

  const toggleAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    const others = (selectedKeys ?? []).filter((k) => !pageKeys.includes(k));
    onSelectionChange(checked ? [...others, ...pageKeys] : others);
  };
  const toggleRow = (key: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const current = selectedKeys ?? [];
    onSelectionChange(
      checked ? [...current, key] : current.filter((k) => k !== key),
    );
  };

  const pager =
    footer ??
    (meta && onPage && meta.total > 0 ? (
      <TablePagination
        meta={meta}
        onPage={onPage}
        onLimit={onLimit}
        busy={fetching}
        className=''
      />
    ) : undefined);

  return (
    <TableCard
      toolbar={toolbar}
      footer={pager}
      className={className}
    >
      {fetching && !loading && (
        <div
          aria-hidden
          className='pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden'
        >
          <div className='h-full w-1/3 animate-progress bg-foreground/60' />
        </div>
      )}
      <Table
        className={minWidthClass}
        aria-busy={loading || fetching || undefined}
      >
        {caption && <caption className='sr-only'>{caption}</caption>}
        <THead>
          <tr>
            {selectable && (
              <Th className='w-10 pe-0'>
                <SelectAll
                  checked={allSelected}
                  indeterminate={selectedOnPage > 0 && !allSelected}
                  onChange={toggleAll}
                  label={t('common.selectAll')}
                />
              </Th>
            )}
            {columns.map((col) =>
              col.sortable && onSort ? (
                <SortableHeader
                  key={col.key}
                  field={col.key}
                  active={sort}
                  order={order}
                  onSort={onSort}
                  align={col.numeric ? 'right' : 'left'}
                  className={col.headerClassName}
                >
                  {col.header}
                </SortableHeader>
              ) : (
                <Th
                  key={col.key}
                  numeric={col.numeric}
                  actions={col.actions}
                  className={col.headerClassName}
                >
                  {col.actions ? (
                    <span className='sr-only'>{col.header}</span>
                  ) : (
                    col.header
                  )}
                </Th>
              ),
            )}
          </tr>
        </THead>
        <tbody>
          {loading ? (
            Array.from({ length: SKELETON_ROWS }).map((_, r) => (
              <Tr
                key={r}
                className='hover:bg-transparent'
              >
                {selectable && (
                  <Td className='pe-0'>
                    <Skeleton
                      variant='custom'
                      className='size-4'
                    />
                  </Td>
                )}
                {columns.map((col, c) => (
                  <Td
                    key={col.key}
                    numeric={col.numeric}
                    actions={col.actions}
                  >
                    <Skeleton
                      variant='custom'
                      className={cn(
                        'h-4',
                        col.actions
                          ? 'ms-auto w-14'
                          : SKELETON_WIDTHS[(r + c) % SKELETON_WIDTHS.length],
                        col.numeric && 'ms-auto',
                      )}
                    />
                  </Td>
                ))}
              </Tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={colSpan}>
                <EmptyState
                  icon={emptyIcon}
                  title={emptyTitle}
                  description={emptyDescription}
                  action={emptyAction}
                />
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const key = getKey(row);
              const isSelected = selected.has(key);
              return (
                <Tr
                  key={key}
                  selected={isSelected}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    onRowClick && 'cursor-pointer',
                    rowClassName?.(row),
                  )}
                >
                  {selectable && (
                    <Td
                      className='pe-0'
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type='checkbox'
                        checked={isSelected}
                        onChange={(e) => toggleRow(key, e.target.checked)}
                        aria-label={t('common.selectRow')}
                        className={checkboxClass}
                      />
                    </Td>
                  )}
                  {columns.map((col) => (
                    <Td
                      key={col.key}
                      numeric={col.numeric}
                      actions={col.actions}
                      className={col.className}
                    >
                      {col.cell(row, index)}
                    </Td>
                  ))}
                </Tr>
              );
            })
          )}
        </tbody>
      </Table>
    </TableCard>
  );
}

/** Footer line for client-filtered lists: "Showing 4 of 12 …". */
export function TableCount({ children }: { children: ReactNode }) {
  return (
    <p
      className='text-body-sm tabular-nums text-muted-foreground'
      aria-live='polite'
    >
      {children}
    </p>
  );
}

/** Edit / delete icon buttons at the end of a row. */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div className='flex items-center justify-end gap-0.5'>{children}</div>
  );
}
