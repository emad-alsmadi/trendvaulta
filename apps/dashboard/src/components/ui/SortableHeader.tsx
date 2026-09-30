import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { SortOrder } from '../../hooks/useTableQuery';
import { cn } from '../../lib/cn';
import { table } from './styles';

/**
 * A sortable `<th>` in the table header style.
 *
 * `aria-sort` on the cell is what conveys the ordering to assistive tech; the
 * arrow is the sighted equivalent. Inactive columns keep a faint double arrow
 * so they read as sortable rather than decorative; the active one is full
 * strength in the foreground colour.
 */
export function SortableHeader({
  field,
  active,
  order,
  onSort,
  align = 'left',
  className,
  children,
}: {
  field: string;
  active?: string;
  order: SortOrder;
  onSort: (field: string) => void;
  align?: 'left' | 'right';
  className?: string;
  children: React.ReactNode;
}) {
  const isActive = active === field;
  const Icon = !isActive ? ChevronsUpDown : order === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      scope='col'
      aria-sort={isActive ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn(table.th, align === 'right' ? 'text-end' : 'text-start', className)}
    >
      <button
        type='button'
        onClick={() => onSort(field)}
        className={cn(
          'group -mx-1 inline-flex items-center gap-1 rounded px-1 py-1 uppercase transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive ? 'text-foreground' : 'hover:text-foreground',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {children}
        <Icon
          aria-hidden
          className={cn(
            'size-3.5 shrink-0 transition-opacity duration-150',
            isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-100',
          )}
        />
      </button>
    </th>
  );
}
