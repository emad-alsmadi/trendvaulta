'use client';

import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';

/**
 * One select for every single-choice list (sort, reason, subject…).
 * `dir` comes from the locale so keyboard navigation and the check mark
 * follow reading order, as in Dropdown.
 */
export function Select(props: ComponentPropsWithoutRef<typeof SelectPrimitive.Root>) {
  const { dir } = useTranslation();
  return <SelectPrimitive.Root dir={dir} {...props} />;
}

export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'group inline-flex h-10 items-center justify-between gap-2 rounded-control border border-line bg-surface px-3 text-start text-sm font-medium text-ink transition-[border-color,box-shadow] duration-(--dur-fast)',
      'hover:border-ink-subtle focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25',
      'data-[state=open]:border-accent data-[state=open]:ring-2 data-[state=open]:ring-accent/25',
      'data-[placeholder]:font-normal data-[placeholder]:text-ink-subtle disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <span className='min-w-0 truncate'>{children}</span>
    <SelectPrimitive.Icon asChild>
      <ChevronDown
        aria-hidden
        className='h-4 w-4 shrink-0 text-ink-subtle transition-transform duration-(--dur-fast) group-data-[state=open]:rotate-180'
      />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

export const SelectContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', sideOffset = 6, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={sideOffset}
      collisionPadding={12}
      className={cn(
        'z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) origin-(--radix-select-content-transform-origin) overflow-hidden rounded-card border border-line bg-surface text-start shadow-overlay',
        'data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className='p-1.5'>{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = 'SelectContent';

export const SelectItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-control py-2.5 ps-3 pe-9 text-sm font-medium text-ink outline-none transition-colors duration-(--dur-fast)',
      'data-[highlighted]:bg-surface-muted data-[state=checked]:text-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className='absolute end-3 inline-flex items-center'>
      <Check aria-hidden className='h-4 w-4' />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));
SelectItem.displayName = 'SelectItem';
