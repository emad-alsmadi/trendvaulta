import { useState } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import type { DateRange as DayPickerDateRange } from 'react-day-picker';
import { useT } from '../../i18n/I18nProvider';
import { cn } from '../../lib/cn';
import { Button } from './Button';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { selectClass } from './styles';

export type DateRange = DayPickerDateRange;

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/** Calendar range picker in a Radix Popover; closes once both ends are chosen. */
export function DateRangePicker({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
}: DateRangePickerProps) {
  const { t, dir, formatDate } = useT();
  const [open, setOpen] = useState(false);

  const display = value?.from
    ? value.to
      ? `${formatDate(value.from)} – ${formatDate(value.to)}`
      : formatDate(value.from)
    : '';

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <div className={cn('relative', className)}>
        <PopoverTrigger asChild>
          <button
            type='button'
            disabled={disabled}
            className={cn(
              selectClass,
              'justify-start',
              display ? 'pe-9' : 'text-muted-foreground',
            )}
          >
            <CalendarIcon
              className='size-4 shrink-0 text-muted-foreground'
              aria-hidden
            />
            <span className='min-w-0 truncate'>
              {display || placeholder || `${t('common.from')} – ${t('common.to')}`}
            </span>
          </button>
        </PopoverTrigger>
        {display && !disabled && (
          <button
            type='button'
            onClick={() => onChange?.(undefined)}
            aria-label={t('common.clearSelection')}
            className='absolute end-2 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            <X
              className='size-3.5'
              aria-hidden
            />
          </button>
        )}
      </div>
      <PopoverContent className='w-auto'>
        <DayPicker
          mode='range'
          selected={value}
          onSelect={(range) => {
            onChange?.(range);
            if (range?.from && range?.to) setOpen(false);
          }}
          dir={dir}
        />
        <div className='mt-3 flex justify-end'>
          <Button
            size='sm'
            onClick={() => setOpen(false)}
          >
            {t('common.close')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
