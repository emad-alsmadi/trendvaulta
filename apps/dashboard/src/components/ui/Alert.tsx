import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../../lib/cn';

type AlertTone = 'info' | 'success' | 'warning' | 'error';

const ALERT_ICON = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: AlertCircle } as const;

/**
 * Inline banner. Tone changes the icon and the weight of the edge, not the
 * colour: errors and warnings get a full-strength border and a bold title.
 * Pass already-translated, user-facing text (errorMessage()), never raw errors.
 */
export function Alert({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const Icon = ALERT_ICON[tone];
  const strong = tone === 'error' || tone === 'warning';
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-badge border p-4 text-sm',
        strong ? 'border-foreground bg-background' : 'border-border bg-muted',
        className,
      )}
    >
      <Icon className='mt-0.5 size-4 shrink-0 text-foreground' aria-hidden />
      <div className='min-w-0 flex-1 space-y-1'>
        {title && <p className='font-semibold text-foreground'>{title}</p>}
        {children && <div className='text-foreground/80'>{children}</div>}
      </div>
      {action && <div className='shrink-0'>{action}</div>}
    </div>
  );
}
