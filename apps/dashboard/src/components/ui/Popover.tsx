import * as PopoverPrimitive from '@radix-ui/react-popover';
import { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { cardClass } from './styles';

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align as any}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-card border border-border bg-popover p-4 text-popover-foreground shadow-overlay',
        'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        cardClass,
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

/**
 * Popover for contextual content (similar to tooltip but with rich content).
 *
 * @example
 * <Popover>
 *   <PopoverTrigger>Trigger</PopoverTrigger>
 *   <PopoverContent>Rich content here</PopoverContent>
 * </Popover>
 */
export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };
