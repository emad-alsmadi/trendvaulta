import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import type { DateRange as DayPickerDateRange } from 'react-day-picker';
import { cn } from '../../lib/cn';
import { Button } from './Button';

export type DateRange = DayPickerDateRange;

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  placeholderAr?: string;
  className?: string;
  lang?: 'en' | 'ar';
  disabled?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Select date range',
  placeholderAr = 'اختر نطاق التاريخ',
  className,
  lang = 'en',
  disabled = false,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const isRTL = lang === 'ar';
  const currentPlaceholder = isRTL ? placeholderAr : placeholder;

  const formatDate = (date: Date) => {
    return format(date, isRTL ? 'dd/MM/yyyy' : 'MM/dd/yyyy');
  };

  const displayValue =
    value?.from && value?.to
      ? `${formatDate(value.from)} - ${formatDate(value.to)}`
      : value?.from
        ? formatDate(value.from)
        : '';

  const handleClear = () => {
    onChange?.(undefined);
  };

  return (
    <div className={cn('relative', className)}>
      <Button
        type='button'
        variant='ghost'
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={cn(
          'w-full justify-start text-left font-normal',
          !displayValue && 'text-muted-foreground',
          isRTL && 'flex-row-reverse',
          'hover:text-brand-purple',
        )}
      >
        <CalendarIcon className='mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0 text-brand-purple' />
        {displayValue || currentPlaceholder}
        {displayValue && (
          <X
            className='ml-auto h-4 w-4 rtl:mr-auto rtl:ml-0'
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          />
        )}
      </Button>

      {open && (
        <div
          className={cn(
            'absolute z-50 mt-2 rounded-lg border bg-background p-4 shadow-lg',
            'animate-in fade-in zoom-in-95 duration-200',
            'border-brand-purple/20',
            isRTL ? 'right-0' : 'left-0',
          )}
        >
          <DayPicker
            mode='range'
            selected={value}
            onSelect={(range) => {
              onChange?.(range);
              if (range?.from && range?.to) {
                setOpen(false);
              }
            }}
            numberOfMonths={2}
            className={cn('rounded-md', isRTL && '[&_[dir=ltr]]:rtl')}
            dir={isRTL ? 'rtl' : 'ltr'}
            disabled={disabled}
          />
          <div className='mt-3 flex justify-end gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setOpen(false)}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              size='sm'
              onClick={() => setOpen(false)}
            >
              {isRTL ? 'تأكيد' : 'Confirm'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
