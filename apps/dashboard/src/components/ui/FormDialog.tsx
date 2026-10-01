import type { ReactNode } from 'react';
import { useT } from '../../i18n/I18nProvider';
import { cn } from '../../lib/cn';
import { Button } from './Button';
import { Dialog } from './Dialog';

type Props = {
  /** Usually rendered only while open (`{editing && <FormDialog …>}`). */
  open?: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** While a save is in flight: Escape, outside click and ✕ don't close. */
  busy?: boolean;
  /** 'form' 640px (default) · 'editor' 880px for complex editors. */
  size?: 'form' | 'editor';
  /** Legacy width class; mapped onto the two standard widths. */
  maxWidthClass?: string;
  children: ReactNode;
};

const LEGACY: Record<string, 'form' | 'editor'> = {
  'max-w-lg': 'form',
  'max-w-xl': 'form',
  'max-w-2xl': 'form',
  'max-w-3xl': 'editor',
  'max-w-4xl': 'editor',
};

/**
 * Edit/create dialog for the admin CRUD pages: the shared <Dialog> shell with
 * the form as its scrolling body. End the form with <FormDialogFooter>.
 */
export function FormDialog({
  open = true,
  onClose,
  title,
  description,
  busy = false,
  size,
  maxWidthClass,
  children,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      busy={busy}
      size={size ?? (maxWidthClass ? LEGACY[maxWidthClass] : undefined) ?? 'form'}
    >
      {children}
    </Dialog>
  );
}

/**
 * Actions row for the end of a FormDialog form: pinned to the bottom of the
 * scrolling body, actions end-aligned (cancel, then the primary action).
 */
export function FormDialogFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 -mx-6 -mb-5 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card px-6 py-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The usual footer: a quiet Cancel, then the primary submit with its spinner. */
export function FormActions({
  onCancel,
  saving = false,
  submitLabel,
  disabled = false,
}: {
  onCancel: () => void;
  saving?: boolean;
  /** Defaults to "Save". */
  submitLabel?: ReactNode;
  disabled?: boolean;
}) {
  const { t } = useT();
  return (
    <FormDialogFooter>
      <Button
        variant='ghost'
        disabled={saving}
        onClick={onCancel}
      >
        {t('common.cancel')}
      </Button>
      <Button
        type='submit'
        variant='primary'
        loading={saving}
        disabled={disabled}
      >
        {submitLabel ?? t('common.save')}
      </Button>
    </FormDialogFooter>
  );
}

/** A titled group of fields inside a long form. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role='group'
      className={cn(
        'space-y-4 border-t border-border pt-5 first:border-0 first:pt-0',
        className,
      )}
    >
      <div>
        <h3 className='text-card-title font-semibold text-foreground'>{title}</h3>
        {description && (
          <p className='mt-0.5 text-body-sm text-muted-foreground'>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
