import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface FilterChip {
  id: string;
  label: string;
  labelAr: string;
  onRemove: () => void;
}

export interface FilterChipsProps {
  chips: FilterChip[];
  onClearAll?: () => void;
  clearAllLabel?: string;
  clearAllLabelAr?: string;
  className?: string;
  lang?: 'en' | 'ar';
}

export function FilterChips({
  chips,
  onClearAll,
  clearAllLabel = 'Clear all',
  clearAllLabelAr = 'مسح الكل',
  className,
  lang = 'en',
}: FilterChipsProps) {
  const isRTL = lang === 'ar';
  const currentClearAllLabel = isRTL ? clearAllLabelAr : clearAllLabel;

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className='text-sm text-muted-foreground'>
        {isRTL ? 'الفلاتر النشطة:' : 'Active filters:'}
      </span>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type='button'
          onClick={chip.onRemove}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border border-brand-purple/20 bg-brand-purple/5 px-3 py-1 text-xs font-medium text-brand-purple',
            'hover:bg-brand-purple/10 hover:border-brand-purple/30',
            'transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2',
            isRTL && 'flex-row-reverse',
          )}
        >
          {isRTL ? chip.labelAr : chip.label}
          <X className='size-3' />
        </button>
      ))}
      {onClearAll && chips.length > 1 && (
        <button
          type='button'
          onClick={onClearAll}
          className={cn(
            'text-xs font-medium text-muted-foreground underline-offset-4 hover:underline',
            'transition-colors duration-200',
          )}
        >
          {currentClearAllLabel}
        </button>
      )}
    </div>
  );
}
