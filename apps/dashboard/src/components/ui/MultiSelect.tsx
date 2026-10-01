import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '../../lib/cn';

export interface MultiSelectOption {
  value: string;
  label: string;
  labelAr: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  placeholderAr?: string;
  className?: string;
  lang?: 'en' | 'ar';
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value = '',
  onChange,
  placeholder = 'Select...',
  placeholderAr = 'اختر...',
  className,
  lang = 'en',
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const isRTL = lang === 'ar';
  const currentPlaceholder = isRTL ? placeholderAr : placeholder;

  return (
    <SelectPrimitive.Root
      open={open}
      onOpenChange={setOpen}
      value={value}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors duration-200',
          'hover:border-brand-purple/50 focus-visible:border-brand-purple',
          isRTL && 'flex-row-reverse',
          className,
        )}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <SelectPrimitive.Value placeholder={currentPlaceholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className='size-4 text-muted-foreground' />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cn(
            'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-lg border bg-background p-1 shadow-lg',
            'animate-in fade-in zoom-in-95 duration-200',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95',
            'border-brand-purple/20',
          )}
          position='popper'
          sideOffset={4}
        >
          <SelectPrimitive.Viewport className='p-1'>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  'relative flex cursor-pointer select-none items-center rounded-md py-1.5 pr-8 pl-2 text-sm outline-none',
                  'focus:bg-accent focus:text-accent-foreground',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  isRTL && 'flex-row-reverse pr-2 pl-8',
                  'transition-colors duration-150',
                )}
              >
                <span className='flex-1'>
                  {isRTL ? option.labelAr : option.label}
                </span>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
