import { useState } from 'react';
import { Filter, ChevronDown, X } from 'lucide-react';
import { Button } from './Button';
import { Drawer } from './Drawer';
import { Field } from './Field';
import { Input } from './Field';
import { Select } from './Field';
import { useT } from '../../i18n/I18nProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/cn';

export type FilterGroup = {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: Array<{ value: string; label: string }>;
  value?: string | string[];
  placeholder?: string;
};

export type AdvancedFilterPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: FilterGroup[];
  onApply: (values: Record<string, string | string[]>) => void;
  onClear: () => void;
  activeCount?: number;
  className?: string;
};

/**
 * Advanced filter panel with grouped filters, clear all, and apply actions.
 * Opens as a drawer on mobile and a popover on desktop.
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
  const [values, setValues] = useState<Record<string, string | string[]>>(
    () => {
      const initial: Record<string, string | string[]> = {};
      groups.forEach((group) => {
        if (group.value !== undefined) {
          initial[group.id] = group.value;
        }
      });
      return initial;
    },
  );

  const handleChange = (id: string, value: string | string[]) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleApply = () => {
    onApply(values);
    onOpenChange(false);
  };

  const handleClear = () => {
    const cleared: Record<string, string | string[]> = {};
    groups.forEach((group) => {
      cleared[group.id] = '';
    });
    setValues(cleared);
    onClear();
  };

  const hasActiveFilters = activeCount > 0;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      side='right'
      title={
        <div className='flex items-center gap-2'>
          <Filter
            className='icon-sm'
            aria-hidden
          />
          <span className='font-semibold'>{t('common.filters')}</span>
          {hasActiveFilters && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className='rounded-badge bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground'
            >
              {activeCount}
            </motion.span>
          )}
        </div>
      }
      footer={
        <div className='flex items-center justify-between gap-3'>
          <Button
            variant='ghost'
            onClick={handleClear}
            icon={
              <X
                className='icon-sm'
                aria-hidden
              />
            }
            disabled={!hasActiveFilters}
          >
            {t('common.clearAll')}
          </Button>
          <Button
            variant='primary'
            onClick={handleApply}
          >
            {t('common.applyFilters')}
          </Button>
        </div>
      }
      className={className}
    >
      <div className='space-y-6'>
        <AnimatePresence mode='popLayout'>
          {groups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
            >
              <FilterGroupControl
                group={group}
                value={values[group.id]}
                onChange={(v) => handleChange(group.id, v)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Drawer>
  );
}

function FilterGroupControl({
  group,
  value,
  onChange,
}: {
  group: FilterGroup;
  value?: string | string[];
  onChange: (value: string | string[]) => void;
}) {
  const { t } = useT();
  const hasValue = value && value !== '';

  if (group.type === 'select' && group.options) {
    return (
      <Field label={group.label}>
        <div className='relative'>
          <Select
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'appearance-none pr-8 transition-all duration-200',
              'focus:ring-2 focus:ring-primary focus:ring-offset-2',
              hasValue && 'border-primary',
            )}
          >
            <option value=''>{group.placeholder || t('common.select')}</option>
            {group.options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
              >
                {opt.label}
              </option>
            ))}
          </Select>
          <ChevronDown
            className={cn(
              'absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200',
              'icon-sm text-muted-foreground',
              hasValue && 'text-primary',
            )}
            aria-hidden
          />
        </div>
      </Field>
    );
  }

  if (group.type === 'date') {
    return (
      <Field label={group.label}>
        <Input
          type='date'
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'transition-all duration-200',
            'focus:ring-2 focus:ring-primary focus:ring-offset-2',
            hasValue && 'border-primary',
          )}
        />
      </Field>
    );
  }

  if (group.type === 'number') {
    return (
      <Field label={group.label}>
        <Input
          type='number'
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={group.placeholder}
          className={cn(
            'transition-all duration-200',
            'focus:ring-2 focus:ring-primary focus:ring-offset-2',
            hasValue && 'border-primary',
          )}
        />
      </Field>
    );
  }

  // Default: text input
  return (
    <Field label={group.label}>
      <Input
        type='text'
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={group.placeholder}
        className={cn(
          'transition-all duration-200',
          'focus:ring-2 focus:ring-primary focus:ring-offset-2',
          hasValue && 'border-primary',
        )}
      />
    </Field>
  );
}
