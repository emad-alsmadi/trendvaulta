import { forwardRef, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { inputClass } from './styles';
import { useT } from '../../i18n/I18nProvider';

export type DatePickerProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label?: string;
  error?: string;
  hint?: string;
  /** ISO date string (YYYY-MM-DD) */
  value?: string;
  wrapperClassName?: string;
};

/**
 * Date picker using native HTML date input with custom styling.
 * Supports all browsers' native date pickers and is keyboard accessible.
 *
 * @example
 * <DatePicker
 *   label="Order date"
 *   value="2026-09-30"
 *   onChange={(date) => console.log(date)}
 * />
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  function DatePicker(
    {
      label,
      error,
      hint,
      value,
      onChange,
      wrapperClassName,
      className,
      ...props
    },
    ref,
  ) {
    const [focused, setFocused] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e as any);
    };

    return (
      <div className={cn('space-y-1.5', wrapperClassName)}>
        {label && (
          <label className='block text-sm font-medium text-foreground'>
            {label}
          </label>
        )}
        <div className='relative'>
          <CalendarIcon
            className={cn(
              'pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground',
              focused && 'text-foreground',
            )}
            aria-hidden
          />
          <input
            ref={ref}
            type='date'
            value={value || ''}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
              inputClass,
              'ps-9 cursor-pointer',
              error && 'border-foreground ring-1 ring-foreground',
              className,
            )}
            {...props}
          />
        </div>
        {error && (
          <p className='flex items-start gap-1.5 text-xs font-medium text-foreground'>
            <span className='mt-px size-3.5 flex items-center justify-center rounded-full border border-foreground'>
              !
            </span>
            <span>{error}</span>
          </p>
        )}
        {hint && !error && (
          <p className='text-xs text-muted-foreground'>{hint}</p>
        )}
      </div>
    );
  },
);

/**
 * Date range picker using two native date inputs.
 */
export function DateRangePicker({
  label,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  error,
  hint,
  className,
}: {
  label?: string;
  startValue?: string;
  endValue?: string;
  onStartChange?: (value: string) => void;
  onEndChange?: (value: string) => void;
  error?: string;
  hint?: string;
  className?: string;
}) {
  const { t } = useT();

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className='block text-sm font-medium text-foreground'>
          {label}
        </label>
      )}
      <div className='flex gap-2'>
        <DatePicker
          placeholder={t('common.from')}
          value={startValue}
          onChange={(e) => onStartChange?.(e.target.value)}
          wrapperClassName='flex-1'
        />
        <DatePicker
          placeholder={t('common.to')}
          value={endValue}
          onChange={(e) => onEndChange?.(e.target.value)}
          wrapperClassName='flex-1'
        />
      </div>
      {error && (
        <p className='flex items-start gap-1.5 text-xs font-medium text-foreground'>
          <span className='mt-px size-3.5 flex items-center justify-center rounded-full border border-foreground'>
            !
          </span>
          <span>{error}</span>
        </p>
      )}
      {hint && !error && (
        <p className='text-xs text-muted-foreground'>{hint}</p>
      )}
    </div>
  );
}

/**
 * Date range preset buttons (Today, Yesterday, Last 7 days, etc.).
 */
export function DateRangePresets({
  onSelect,
  className,
}: {
  onSelect: (
    preset:
      | 'today'
      | 'yesterday'
      | 'last7'
      | 'last30'
      | 'thisMonth'
      | 'lastMonth',
  ) => void;
  className?: string;
}) {
  const { t } = useT();

  const presets = [
    { value: 'today' as const, label: t('common.today') },
    { value: 'yesterday' as const, label: t('common.yesterday') },
    { value: 'last7' as const, label: t('common.last7Days') },
    { value: 'last30' as const, label: t('common.last30Days') },
    { value: 'thisMonth' as const, label: t('common.thisMonth') },
    { value: 'lastMonth' as const, label: t('common.lastMonth') },
  ];

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {presets.map((preset) => (
        <button
          key={preset.value}
          type='button'
          onClick={() => onSelect(preset.value)}
          className='rounded-badge border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
