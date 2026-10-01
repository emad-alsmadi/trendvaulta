import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { forwardRef, type ReactElement, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        // Inverted, so it reads on both the light canvas and the dark sidebar.
        'z-[110] max-w-xs rounded-control bg-foreground px-2 py-1 text-xs font-medium text-background shadow-overlay',
        'animate-pop-in',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * Tooltip root (Radix): hover/focus information for a control.
 *
 * <Tooltip>
 *   <TooltipTrigger asChild><IconButton … /></TooltipTrigger>
 *   <TooltipContent>Additional information</TooltipContent>
 * </Tooltip>
 */
export function Tooltip({
  children,
  ...props
}: React.ComponentProps<typeof TooltipRoot>) {
  return (
    <TooltipProvider delayDuration={200}>
      <TooltipRoot {...props}>{children}</TooltipRoot>
    </TooltipProvider>
  );
}

/** One-line form: `<Tip label='Edit'><button …/></Tip>`. No label, no tooltip. */
export function Tip({
  label,
  side = 'top',
  children,
}: {
  label?: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  children: ReactElement;
}) {
  if (!label) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

export { TooltipTrigger, TooltipContent };
