import { Button } from './Button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useT } from '../../i18n/I18nProvider';

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showEdges?: boolean;
  disabled?: boolean;
};

/**
 * Professional pagination component with edge navigation and responsive design.
 * Follows the monochrome design system with smooth transitions.
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showEdges = true,
  disabled = false,
}: PaginationProps) {
  const { t } = useT();

  if (totalPages <= 1) return null;

  const pages = getVisiblePages(currentPage, totalPages);

  return (
    <nav
      className={cn('flex items-center justify-center gap-1', className)}
      aria-label='Pagination'
    >
      {showEdges && (
        <Button
          variant='ghost'
          size='sm'
          onClick={() => onPageChange(1)}
          disabled={disabled || currentPage === 1}
          icon={<ChevronsLeft className='icon-sm' aria-hidden />}
          aria-label={t('common.firstPage')}
        />
      )}

      <Button
        variant='ghost'
        size='sm'
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || currentPage === 1}
        icon={<ChevronLeft className='icon-sm' aria-hidden />}
        aria-label={t('common.previousPage')}
      />

      {pages.map((page, index) => {
        if (page === 'ellipsis') {
          return (
            <span
              key={`ellipsis-${index}`}
              className='px-3 py-1.5 text-sm text-muted-foreground'
              aria-hidden
            >
              …
            </span>
          );
        }

        return (
          <Button
            key={page}
            variant={page === currentPage ? 'primary' : 'ghost'}
            size='sm'
            onClick={() => onPageChange(page)}
            disabled={disabled}
            className={cn(
              'min-w-[2.5rem]',
              page === currentPage && 'shadow-md'
            )}
          >
            {page}
          </Button>
        );
      })}

      <Button
        variant='ghost'
        size='sm'
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
        icon={<ChevronRight className='icon-sm' aria-hidden />}
        aria-label={t('common.nextPage')}
      />

      {showEdges && (
        <Button
          variant='ghost'
          size='sm'
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || currentPage === totalPages}
          icon={<ChevronsRight className='icon-sm' aria-hidden />}
          aria-label={t('common.lastPage')}
        />
      )}
    </nav>
  );
}

/**
 * Calculate which page numbers to show with ellipsis for large page counts.
 */
function getVisiblePages(current: number, total: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = [];
  const maxVisible = 7;

  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  // Always show first page
  pages.push(1);

  if (current <= 4) {
    // Near start: 1 2 3 4 5 ... last
    for (let i = 2; i <= 5; i++) {
      pages.push(i);
    }
    pages.push('ellipsis');
    pages.push(total);
  } else if (current >= total - 3) {
    // Near end: 1 ... last-4 last-3 last-2 last-1 last
    pages.push('ellipsis');
    for (let i = total - 4; i <= total; i++) {
      pages.push(i);
    }
  } else {
    // Middle: 1 ... current-1 current current+1 ... last
    pages.push('ellipsis');
    pages.push(current - 1);
    pages.push(current);
    pages.push(current + 1);
    pages.push('ellipsis');
    pages.push(total);
  }

  return pages;
}
