import type { ReactNode } from 'react';

/**
 * Shared look of the account area: flat sections set apart by space alone,
 * filled fields, ink for the primary actions. Used by every page under /user.
 */

/** A section of an account page: flat — no fill, outline or shadow. */
export const PANEL = '';

/** Filled field: no outline until focus. Pass as `className` to Input. */
export const FIELD =
  'h-11 border-transparent bg-stone-200/60 hover:border-transparent focus-visible:border-ink focus-visible:ring-ink/10';

export const FIELD_LABEL = 'mb-1.5 block text-sm font-medium text-ink';
export const FIELD_ERROR = 'mt-1.5 text-xs font-medium text-rose-700';

/** Neutral pill (counts, "default", payment state). */
export const PILL =
  'inline-flex items-center rounded-full bg-stone-200/60 px-2.5 py-1 text-xs font-medium text-ink-muted';

/** Page title row: heading and intro at the start, one action at the end. */
export function UserPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
      <div className='min-w-0'>
        <h1 className='text-2xl font-semibold tracking-tight text-ink sm:text-title'>
          {title}
        </h1>
        {subtitle && (
          <p className='mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted'>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className='shrink-0'>{action}</div>}
    </div>
  );
}

/** Centered empty state. */
export function UserEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`${PANEL} py-14 text-center sm:py-16`}>
      <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-200/60 text-ink'>
        {icon}
      </div>
      <h2 className='mt-5 text-heading text-ink'>{title}</h2>
      {description && (
        <p className='mx-auto mt-2 max-w-md text-sm text-ink-muted'>
          {description}
        </p>
      )}
      {action && <div className='mt-7 flex justify-center'>{action}</div>}
    </div>
  );
}
