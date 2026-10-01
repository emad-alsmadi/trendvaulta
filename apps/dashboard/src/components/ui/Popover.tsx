import * as PopoverPrimitive from '@radix-ui/react-popover';
import { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { overlayClass } from './styles';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;
const PopoverClose = PopoverPrimitive.Close;

const PopoverContent = forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'start', sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        overlayClass,
        'z-[100] w-72 rounded-card p-4 outline-none data-[state=open]:animate-pop-in',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

/**
 * Popover for contextual, interactive content (Radix).
 *
 * <Popover>
 *   <PopoverTrigger asChild><Button>Open</Button></PopoverTrigger>
 *   <PopoverContent>Rich content here</PopoverContent>
 * </Popover>
 */
export { Popover, PopoverTrigger, PopoverAnchor, PopoverClose, PopoverContent };
