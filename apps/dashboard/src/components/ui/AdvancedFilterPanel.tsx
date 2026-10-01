import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from './Button';
import { Drawer } from './Drawer';
import { Field, Input, Select } from './Field';
import { useT } from '../../i18n/I18nProvider';

export type FilterGroup = {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: Array<{ value: string; label: string }>;
  value?: string;
  placeholder?: string;
};

export type AdvancedFilterPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: FilterGroup[];
  onApply: (values: Record<string, string>) => void;
  onClear: () => void;
  activeCount?: number;
  className?: string;
};

/**
 * Advanced filters in a slide-over: grouped controls, "clear all" and "apply"
 * pinned at the bottom. Nothing is applied until the admin confirms.
 */
export function AdvancedFilterPanel({
  open,
  onOpenChange,
  groups,
  onApply,
  onClear,
  activeCount = 0,
  className,
}: AdvancedFilterPanelProps) {
  const { t } = useT();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(groups.map((g) => [g.id, g.value ?? ''])),
  );

  const set = (id: string, value: string) =>
    setValues((prev) => ({ ...prev, [id]: value }));

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className='flex items-center gap-2'>
          <SlidersHorizontal
            className='size-4'
            aria-hidden
          />
          {t('common.filters')}
          {activeCount > 0 && (
            <span className='rounded-badge bg-primary px-1.5 py-0.5 text-xs font-medium tabular-nums text-primary-foreground'>
              {activeCount}
            </span>
          )}
        </span>
      }
      footer={
        <>
          <Button
            variant='ghost'
            className='me-auto'
            onClick={() => {
              setValues(Object.fromEntries(groups.map((g) => [g.id, ''])));
              onClear();
            }}
          >
            {t('common.clearAll')}
          </Button>
          <Button
            variant='primary'
            onClick={() => {
              onApply(values);
              onOpenChange(false);
            }}
          >
            {t('common.applyFilters')}
          </Button>
        </>
      }
      className={className}
    >
      <div className='space-y-5'>
        {groups.map((group) => (
          <Field
            key={group.id}
            label={group.label}
          >
            {group.type === 'select' && group.options ? (
              <Select
                value={values[group.id] ?? ''}
                onChange={(e) => set(group.id, e.target.value)}
              >
                <option value=''>
                  {group.placeholder || t('common.select')}
                </option>
                {group.options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                  >
                    {opt.label}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                type={group.type}
                value={values[group.id] ?? ''}
                onChange={(e) => set(group.id, e.target.value)}
                placeholder={group.placeholder}
              />
            )}
          </Field>
        ))}
      </div>
    </Drawer>
  );
}
