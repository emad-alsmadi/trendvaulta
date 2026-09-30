import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { text } from './styles';

/**
 * Top of every page: title, one-line description, actions at the end
 * (secondary first, primary last). Tabs or a filter bar go in `children`.
 */
export function PageHeader({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-8 space-y-4', className)}>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='min-w-0 space-y-1'>
          <h1 className={text.pageTitle}>{title}</h1>
          {description && <p className={text.secondary}>{description}</p>}
        </div>
        {actions && <div className='flex flex-wrap items-center gap-2'>{actions}</div>}
      </div>
      {children}
    </header>
  );
}
