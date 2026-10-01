'use client';

import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';

/** `dir` comes from the locale so arrow keys follow reading order. */
export const RadioGroup = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>((props, ref) => {
  const { dir } = useTranslation();
  return <RadioGroupPrimitive.Root ref={ref} dir={dir} {...props} />;
});
RadioGroup.displayName = 'RadioGroup';

/** Wrap it in a <label> with its text: clicking the label selects it. */
export const RadioGroupItem = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'inline-flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full border border-ink-subtle bg-surface transition-[border-color,box-shadow] duration-(--dur-fast)',
      'hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1',
      'data-[state=checked]:border-accent',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-ink-subtle',
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className='h-2.5 w-2.5 rounded-full bg-accent' />
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = 'RadioGroupItem';
