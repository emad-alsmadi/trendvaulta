import { Fragment, type ReactNode } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { useT } from '../../i18n/I18nProvider';
import { cn } from '../../lib/cn';
import { buttonVariants, overlayClass } from './styles';

export type MenuItem = {
  label: ReactNode;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** Always rendered last, after a separator; pair with a confirm dialog. */
  destructive?: boolean;
};

/**
 * Row-actions (kebab) menu on Radix DropdownMenu: keyboard navigation,
 * typeahead, Escape and focus return come with it. Destructive items are
 * moved to the end behind a divider — placement, icon and wording mark them.
 */
export function RowActionsMenu({
  items,
  label,
  trigger,
  align = 'end',
}: {
  items: MenuItem[];
  /** Accessible name for the trigger, e.g. t('common.editItem', { name }). */
  label?: string;
  trigger?: ReactNode;
  align?: 'start' | 'end';
}) {
  const { t } = useT();
  const safe = items.filter((i) => !i.destructive);
  const destructive = items.filter((i) => i.destructive);
  const groups = [safe, destructive].filter((g) => g.length > 0);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {trigger ?? (
          <button
            type='button'
            aria-label={label ?? t('common.moreActions')}
            className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
          >
            <MoreHorizontal aria-hidden />
          </button>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={4}
          className={cn(overlayClass, 'z-50 min-w-44 p-1')}
        >
          {groups.map((group, gi) => (
            <Fragment key={gi}>
              {gi > 0 && <DropdownMenu.Separator className='-mx-1 my-1 h-px bg-border' />}
              {group.map((item, i) => (
                <DropdownMenu.Item
                  key={i}
                  disabled={item.disabled}
                  onSelect={item.onSelect}
                  className={cn(
                    'flex h-control cursor-pointer select-none items-center gap-2 rounded-control px-2 text-sm text-foreground outline-none transition-colors duration-150',
                    'data-[highlighted]:bg-accent data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
                    '[&_svg]:size-4 [&_svg]:text-muted-foreground',
                    item.destructive && 'font-medium [&_svg]:text-foreground',
                  )}
                >
                  {item.icon}
                  {item.label}
                </DropdownMenu.Item>
              ))}
            </Fragment>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
