import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../../lib/cn';
import { text } from './styles';

/** Nothing to show yet: icon, short title, one line of guidance, one action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span className='mb-4 flex size-10 items-center justify-center rounded-control border border-border bg-muted text-muted-foreground [&_svg]:size-5'>
        {icon ?? <Inbox aria-hidden />}
      </span>
      <p className={text.cardTitle}>{title}</p>
      {description && <p className={cn(text.secondary, 'mt-1 max-w-sm')}>{description}</p>}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  );
}
