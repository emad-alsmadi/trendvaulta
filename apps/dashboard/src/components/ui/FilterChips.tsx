import { useT } from '../../i18n/I18nProvider';
import { cn } from '../../lib/cn';
import { Tag } from './StatusBadge';

export interface FilterChip {
  id: string;
  /** Already translated, e.g. "Status: Pending". */
  label: string;
  onRemove: () => void;
}

/** Applied filters as removable chips, with "clear all" once there are several. */
export function FilterChips({
  chips,
  onClearAll,
  className,
}: {
  chips: FilterChip[];
  onClearAll?: () => void;
  className?: string;
}) {
  const { t } = useT();
  if (chips.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {chips.map((chip) => (
        <Tag
          key={chip.id}
          onRemove={chip.onRemove}
          removeLabel={t('common.removeFilter', { name: chip.label })}
        >
          {chip.label}
        </Tag>
      ))}
      {onClearAll && chips.length > 1 && (
        <button
          type='button'
          onClick={onClearAll}
          className='rounded text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          {t('common.clearAll')}
        </button>
      )}
    </div>
  );
}
