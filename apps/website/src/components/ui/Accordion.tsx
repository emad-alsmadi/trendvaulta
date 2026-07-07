'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Accordion = AccordionPrimitive.Root;
export const AccordionItem = AccordionPrimitive.Item;

export function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className='flex'>
      <AccordionPrimitive.Trigger
        className={cn(
          'flex flex-1 items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-extrabold text-indigo-950 transition hover:bg-white/50',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown className='h-4 w-4 text-fuchsia-700 transition-transform data-[state=open]:rotate-180' />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.AccordionContentProps) {
  return (
    <AccordionPrimitive.Content
      className={cn(
        'overflow-hidden px-4 pb-4 text-sm font-semibold text-indigo-950/80 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
        className,
      )}
      {...props}
    >
      <div className='pt-3'>{children}</div>
    </AccordionPrimitive.Content>
  );
}
