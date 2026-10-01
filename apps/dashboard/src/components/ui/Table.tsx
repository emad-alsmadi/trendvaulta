import type {
  HTMLAttributes,
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import { cn } from '../../lib/cn';
import { Card } from './Card';
import { table } from './styles';

/**
 * Table set for admin lists. Wrap in <TableCard> so the table scrolls sideways
 * inside its card on narrow screens and the page never does. `stickyHeader`
 * caps the height so the caption-style header stays visible while scrolling.
 */
export function TableCard({
  children,
  toolbar,
  footer,
  stickyHeader = false,
  className,
}: {
  children: ReactNode;
  /** FilterBar / BulkActionBar above the table, inside the card. */
  toolbar?: ReactNode;
  /** TablePagination below the table, inside the card. */
  footer?: ReactNode;
  stickyHeader?: boolean;
  className?: string;
}) {
  return (
    <Card
      padded={false}
      className={cn('overflow-hidden', className)}
    >
      {toolbar && (
        <div className='border-b border-border p-3 sm:p-4'>
          {toolbar}
        </div>
      )}
      <div
        className={cn(
          table.wrap,
          stickyHeader && 'max-h-[70vh] overflow-y-auto',
        )}
      >
        {children}
      </div>
      {footer && (
        <div className='border-t border-border px-4 py-3'>
          {footer}
        </div>
      )}
    </Card>
  );
}

export function Table({
  className,
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn(table.root, className)}
      {...props}
    />
  );
}

export function THead({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(table.head, className)}
      {...props}
    />
  );
}

export function Th({
  numeric,
  actions,
  className,
  scope = 'col',
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & {
  numeric?: boolean;
  actions?: boolean;
}) {
  return (
    <th
      scope={scope}
      className={cn(
        table.th,
        numeric && 'text-end',
        actions && 'text-end',
        className,
      )}
      {...props}
    />
  );
}

export function Tr({
  selected,
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }) {
  return (
    <tr
      data-selected={selected || undefined}
      className={cn(table.row, className)}
      {...props}
    />
  );
}

export function Td({
  numeric,
  compact,
  actions,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & {
  /** End-aligned tabular figures for numbers and prices. */
  numeric?: boolean;
  compact?: boolean;
  /** Fixed, shrink-to-fit last column for row actions. */
  actions?: boolean;
}) {
  return (
    <td
      className={cn(
        compact ? table.tdCompact : table.td,
        numeric && table.numeric,
        actions && table.actions,
        className,
      )}
      {...props}
    />
  );
}

/** 40px product thumbnail with a neutral placeholder when there is no image. */
export function Thumbnail({
  src,
  alt = '',
  className,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
}) {
  if (!src)
    return (
      <span
        aria-hidden
        className={cn(table.thumb, 'block', className)}
      />
    );
  return (
    <img
      src={src}
      alt={alt}
      loading='lazy'
      className={cn(table.thumb, className)}
    />
  );
}
