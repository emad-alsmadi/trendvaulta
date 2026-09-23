import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { SortOrder } from '../../hooks/useTableQuery';

/**
 * A sortable `<th>`.
 *
 * `aria-sort` on the cell is what conveys the ordering to assistive tech; the
 * arrow is the sighted equivalent, and the inactive column keeps a faint
 * double-arrow so it reads as sortable rather than decorative.
 */
export function SortableHeader({
  field,
  active,
  order,
  onSort,
  align = 'left',
  children,
}: {
  field: string;
  active?: string;
  order: SortOrder;
  onSort: (field: string) => void;
  align?: 'left' | 'right';
  children: React.ReactNode;
}) {
  const isActive = active === field;
  const Icon = !isActive ? ChevronsUpDown : order === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={isActive ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={align === 'right' ? 'text-right' : 'text-left'}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`group inline-flex items-center gap-1 py-2 font-medium transition hover:text-gray-900 dark:hover:text-white ${
          isActive
            ? 'text-gray-900 dark:text-white'
            : 'text-gray-500 dark:text-gray-400'
        } ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {children}
        <Icon
          className={`h-3.5 w-3.5 ${
            isActive ? '' : 'opacity-0 transition group-hover:opacity-60'
          }`}
        />
      </button>
    </th>
  );
}
