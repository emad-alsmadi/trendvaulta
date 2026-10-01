import { Check, ChevronDown } from 'lucide-react';
import { useT } from '../../i18n/I18nProvider';
import { cn } from '../../lib/cn';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { menuItemClass, selectClass } from './styles';

export interface MultiSelectOption {
  value: string;
  /** Already translated. */
  label: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

/** Pick several values from a list: a Radix Popover with a checkable listbox. */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  ...aria
}: MultiSelectProps) {
  const { t } = useT();
  const selected = options.filter((o) => value.includes(o.value));
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          disabled={disabled}
          aria-label={aria['aria-label']}
          className={cn(
            selectClass,
            selected.length === 0 && 'text-muted-foreground',
            className,
          )}
        >
          <span className='min-w-0 truncate'>
            {selected.length === 0
              ? (placeholder ?? t('common.select'))
              : selected.length === 1
                ? selected[0].label
                : t('common.selected', { count: selected.length })}
          </span>
          <ChevronDown
            className='size-4 shrink-0 text-muted-foreground'
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className='max-h-72 w-[var(--radix-popover-trigger-width)] min-w-44 overflow-y-auto rounded-badge p-1'>
        <div
          role='listbox'
          aria-multiselectable
          aria-label={aria['aria-label']}
        >
          {options.map((option) => {
            const checked = value.includes(option.value);
            return (
              <button
                key={option.value}
                type='button'
                role='option'
                aria-selected={checked}
                onClick={() => toggle(option.value)}
                className={cn(
                  menuItemClass,
                  'w-full text-start hover:bg-accent focus-visible:bg-accent',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded border',
                    checked
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input',
                  )}
                >
                  {checked && <Check className='size-3' />}
                </span>
                <span className='min-w-0 truncate'>{option.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
