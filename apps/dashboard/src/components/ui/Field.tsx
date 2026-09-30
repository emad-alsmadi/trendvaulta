import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { AlertCircle, ChevronDown, Search } from 'lucide-react';
import { cn } from '../../lib/cn';
import {
  checkboxClass,
  focusRing,
  hintClass,
  inputClass,
  labelClass,
  selectClass,
  textareaClass,
} from './styles';

type FieldProps = {
  label: ReactNode;
  /** One control; it receives id, aria-describedby and aria-invalid. */
  children: ReactElement<{
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }>;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
};

/** Label above (6px), control, then helper or error text (12px). */
export function Field({
  label,
  children,
  hint,
  error,
  required,
  className,
}: FieldProps) {
  const autoId = useId();
  const id = children.props.id ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [children.props['aria-describedby'], errorId, hintId]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={id}
        className={labelClass}
      >
        {label}
        {required && (
          <span
            aria-hidden
            className='ms-0.5 text-muted-foreground'
          >
            *
          </span>
        )}
      </label>
      {isValidElement(children)
        ? cloneElement(children, {
            id,
            'aria-describedby': describedBy,
            'aria-invalid': error ? true : children.props['aria-invalid'],
          })
        : children}
      {error ? (
        <FieldError id={errorId}>{error}</FieldError>
      ) : hint ? (
        <p
          id={hintId}
          className={hintClass}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Error text: an icon and a heavier weight instead of a colour. */
export function FieldError({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      className='flex items-start gap-1.5 text-xs font-medium text-foreground'
    >
      <AlertCircle
        className='mt-px size-3.5 shrink-0'
        aria-hidden
      />
      <span>{children}</span>
    </p>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(inputClass, className)}
      {...props}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(textareaClass, className)}
      {...props}
    />
  );
});

/** Native select (keyboard and mobile pickers for free) with a drawn chevron. */
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }
>(function Select({ className, wrapperClassName, children, ...props }, ref) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select
        ref={ref}
        className={cn(selectClass, className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className='pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
        aria-hidden
      />
    </div>
  );
});

/** Search box with a leading icon; the placeholder never replaces a label. */
export const SearchInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { wrapperClassName?: string }
>(function SearchInput(
  { className, wrapperClassName, type = 'search', ...props },
  ref,
) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <Search
        className='pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
        aria-hidden
      />
      <input
        ref={ref}
        type={type}
        className={cn(inputClass, 'ps-9', className)}
        {...props}
      />
    </div>
  );
});

type CheckProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: ReactNode;
};

/** Checkbox (or radio via `type`) with an optional inline label. */
export const Checkbox = forwardRef<
  HTMLInputElement,
  CheckProps & { type?: 'checkbox' | 'radio' }
>(function Checkbox({ className, label, type = 'checkbox', ...props }, ref) {
  const box = (
    <input
      ref={ref}
      type={type}
      className={cn(
        checkboxClass,
        type === 'radio' && 'rounded-full',
        className,
      )}
      {...props}
    />
  );
  if (!label) return box;
  return (
    <label className='inline-flex min-h-control cursor-pointer items-center gap-2 text-sm text-foreground has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50'>
      {box}
      <span>{label}</span>
    </label>
  );
});

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
};

/** On = solid track with the knob at the end; off = outlined track. */
export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
  id,
  className,
  ...aria
}: SwitchProps) {
  const button = (
    <button
      type='button'
      role='switch'
      id={id}
      aria-checked={checked}
      aria-label={aria['aria-label']}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-fast ease-out',
        'disabled:cursor-not-allowed disabled:opacity-50',
        focusRing,
        checked ? 'border-primary bg-primary' : 'border-input bg-muted',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'block size-3.5 rounded-full shadow-sm transition-transform duration-fast ease-out',
          checked
            ? 'translate-x-[1.125rem] bg-primary-foreground rtl:-translate-x-[1.125rem]'
            : 'translate-x-0.5 bg-foreground/70 rtl:-translate-x-0.5',
        )}
      />
    </button>
  );
  if (!label) return button;
  return (
    <label className='inline-flex min-h-control cursor-pointer items-center gap-3 text-sm text-foreground'>
      {button}
      <span>{label}</span>
    </label>
  );
}
