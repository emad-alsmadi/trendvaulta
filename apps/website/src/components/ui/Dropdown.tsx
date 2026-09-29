'use client';

import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';

/**
 * One dropdown for every menu (account, categories, more…).
 *
 * RTL: `dir` comes from the locale, so arrow-key navigation follows reading
 * order; placement `align="end"` is logical (Floating UI mirrors it under
 * dir=rtl), and items lay out icon → label from the inline start, i.e.
 * icon on the far right in Arabic.
 */
export function Dropdown(props: ComponentPropsWithoutRef<typeof DropdownMenu.Root>) {
  const { dir } = useTranslation();
  return <DropdownMenu.Root dir={dir} {...props} />;
}

export const DropdownTrigger = DropdownMenu.Trigger;

export const DropdownContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenu.Content>
>(({ className, align = 'end', sideOffset = 8, ...props }, ref) => (
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={12}
      className={cn(
        'z-50 min-w-56 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-card border border-line bg-surface p-1.5 text-start shadow-overlay',
        'data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out',
        className,
      )}
      {...props}
    />
  </DropdownMenu.Portal>
));
DropdownContent.displayName = 'DropdownContent';

const itemClass =
  'group relative flex w-full cursor-pointer select-none items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium text-ink outline-none transition-colors duration-(--dur-fast) ' +
  'data-[highlighted]:bg-surface-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

type ItemProps = ComponentPropsWithoutRef<typeof DropdownMenu.Item> & {
  /** Leading icon — sits at the inline start (right in RTL). */
  icon?: LucideIcon;
  /** Secondary text under the label. */
  hint?: ReactNode;
  tone?: 'default' | 'danger';
};

export const DropdownItem = forwardRef<HTMLDivElement, ItemProps>(
  ({ className, icon: Icon, hint, tone = 'default', children, asChild, ...props }, ref) => {
    const cls = cn(
      itemClass,
      tone === 'danger' && 'text-red-600 data-[highlighted]:bg-red-50',
      className,
    );
    // asChild (e.g. wrapping a <Link>) or no icon/hint: the children own
    // their layout — no icon + truncated-label wrapper.
    if (asChild || (!Icon && !hint)) {
      return (
        <DropdownMenu.Item ref={ref} asChild={asChild} className={cls} {...props}>
          {children}
        </DropdownMenu.Item>
      );
    }
    return (
      <DropdownMenu.Item ref={ref} className={cls} {...props}>
        <DropdownItemContent icon={Icon} hint={hint} tone={tone}>
          {children}
        </DropdownItemContent>
      </DropdownMenu.Item>
    );
  },
);
DropdownItem.displayName = 'DropdownItem';

/** Icon + label (+ hint) layout — use inside an asChild <Link>. */
export function DropdownItemContent({
  icon: Icon,
  hint,
  tone = 'default',
  children,
}: Pick<ItemProps, 'icon' | 'hint' | 'tone'> & { children: ReactNode }) {
  return (
    <>
      {Icon && (
        <Icon
          aria-hidden
          className={cn(
            'h-4 w-4 shrink-0 transition-colors',
            tone === 'danger' ? 'text-red-500' : 'text-ink-subtle group-data-[highlighted]:text-ink',
          )}
        />
      )}
      <span className='min-w-0 flex-1'>
        <span className='block truncate'>{children}</span>
        {hint && <span className='mt-0.5 block truncate text-xs font-normal text-ink-muted'>{hint}</span>}
      </span>
    </>
  );
}

export function DropdownLabel({ className, ...props }: ComponentPropsWithoutRef<typeof DropdownMenu.Label>) {
  return (
    <DropdownMenu.Label
      className={cn('px-3 pb-1.5 pt-2 text-eyebrow uppercase text-ink-subtle', className)}
      {...props}
    />
  );
}

export function DropdownSeparator({ className, ...props }: ComponentPropsWithoutRef<typeof DropdownMenu.Separator>) {
  return <DropdownMenu.Separator className={cn('-mx-1.5 my-1.5 h-px bg-line', className)} {...props} />;
}
