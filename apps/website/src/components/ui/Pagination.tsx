'use client';

import { Button } from './Button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const { t } = useTranslation();
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }
  const visiblePages = pages.slice(start - 1, end);

  const navButtonClass =
    'h-10 rounded-full border border-white/30 bg-white/50 px-4 text-sm font-extrabold text-indigo-950 shadow-sm backdrop-blur-xl transition hover:bg-white/70';

  const pageButtonBaseClass =
    'h-10 w-10 rounded-full border border-white/30 bg-white/50 text-sm font-extrabold text-indigo-950 shadow-sm backdrop-blur-xl transition hover:bg-white/70';

  const pageButtonActiveClass =
    'border-transparent bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white shadow-md hover:brightness-110';

  return (
    <nav
      aria-label={t('pagination.label')}
      className='flex items-center justify-center gap-2'
    >
      <Button
        variant='outline'
        size='sm'
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(navButtonClass, 'w-auto')}
      >
        {t('pagination.previous')}
      </Button>
      {visiblePages.map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? 'default' : 'outline'}
          size='sm'
          onClick={() => onPageChange(page)}
          aria-label={t('pagination.page', { page })}
          aria-current={page === currentPage ? 'page' : undefined}
          className={cn(
            pageButtonBaseClass,
            page === currentPage && pageButtonActiveClass,
          )}
        >
          {page}
        </Button>
      ))}
      <Button
        variant='outline'
        size='sm'
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(navButtonClass, 'w-auto')}
      >
        {t('pagination.next')}
      </Button>
    </nav>
  );
}
