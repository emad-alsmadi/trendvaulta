import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useMemo,
  type ReactNode,
} from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { useT } from '../../i18n/I18nProvider';
import { cn } from '../../lib/cn';
import { menuItemClass, overlayClass, selectClass } from './styles';

export type SelectOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

type OptionGroup = { label?: ReactNode; options: SelectOption[] };

/** The slice of a native change event the pages read: `e.target.value`. */
export type SelectChangeEvent = {
  target: { value: string; name?: string };
  currentTarget: { value: string; name?: string };
};

export type SelectProps = {
  value?: string | number | null;
  /** Native-style handler, so a `<select>` can be swapped without rewiring. */
  onChange?: (event: SelectChangeEvent) => void;
  onValueChange?: (value: string) => void;
  /** Either pass `options`, or `<option>` / `<optgroup>` children. */
  options?: SelectOption[];
  children?: ReactNode;
  placeholder?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  /** 'sm' 32px (toolbars, pagination) · 'md' 36px (forms). */
  size?: 'sm' | 'md';
  className?: string;
  wrapperClassName?: string;
  title?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

/** Radix rejects '' as an item value; the "All …" option is usually exactly that. */
const EMPTY = '__empty__';
const toItem = (value: string) => (value === '' ? EMPTY : value);
const fromItem = (value: string) => (value === EMPTY ? '' : value);

type OptionElementProps = {
  value?: string | number;
  label?: ReactNode;
  disabled?: boolean;
  children?: ReactNode;
};

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return '';
}

/** Reads `<option>` / `<optgroup>` children into groups (the first is unlabelled). */
function parseChildren(children: ReactNode): OptionGroup[] {
  const groups: OptionGroup[] = [{ options: [] }];
  const walk = (nodes: ReactNode, into: OptionGroup) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement<OptionElementProps>(child)) return;
      if (child.type === Fragment) {
        walk(child.props.children, into);
      } else if (child.type === 'optgroup') {
        const group: OptionGroup = { label: child.props.label, options: [] };
        groups.push(group);
        walk(child.props.children, group);
      } else if (child.type === 'option') {
        const label = child.props.children;
        into.options.push({
          value: String(child.props.value ?? textOf(label)),
          label,
          disabled: child.props.disabled,
        });
      }
    });
  };
  walk(children, groups[0]);
  return groups.filter((g) => g.options.length > 0);
}

/**
 * The one select: a Radix Select (keyboard, typeahead, portalled list, RTL)
 * styled like the other form controls. It keeps the native `<select>` shape —
 * `<option>` children and `onChange(e)` with `e.target.value` — so forms read
 * the same as before.
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  function Select(
    {
      value,
      onChange,
      onValueChange,
      options,
      children,
      placeholder,
      disabled,
      required,
      name,
      id,
      size = 'md',
      className,
      wrapperClassName,
      title,
      ...aria
    },
    ref,
  ) {
    const { dir } = useT();
    const groups = useMemo<OptionGroup[]>(
      () => (options ? [{ options }] : parseChildren(children)),
      [options, children],
    );
    const all = groups.flatMap((g) => g.options);
    const current = value == null ? '' : String(value);
    const selected = all.find((o) => o.value === current);

    const handleChange = (next: string) => {
      const v = fromItem(next);
      onValueChange?.(v);
      const target = { value: v, name };
      onChange?.({ target, currentTarget: target });
    };

    return (
      <div className={cn('relative min-w-0', wrapperClassName)}>
        <SelectPrimitive.Root
          // '' resets Radix to its placeholder when no option carries ''.
          value={selected ? toItem(current) : ''}
          onValueChange={handleChange}
          disabled={disabled}
          required={required}
          name={name}
          dir={dir}
        >
          <SelectPrimitive.Trigger
            ref={ref}
            id={id}
            title={title}
            aria-label={aria['aria-label']}
            aria-labelledby={aria['aria-labelledby']}
            aria-describedby={aria['aria-describedby']}
            aria-invalid={aria['aria-invalid'] || undefined}
            className={cn(
              selectClass,
              size === 'sm' && 'h-control-sm px-2.5 text-body-sm',
              'data-[placeholder]:text-muted-foreground data-[state=open]:border-foreground',
              '[&>span:first-child]:min-w-0 [&>span:first-child]:truncate',
              className,
            )}
          >
            <SelectPrimitive.Value placeholder={placeholder}>
              {selected?.label}
            </SelectPrimitive.Value>
            <SelectPrimitive.Icon asChild>
              <ChevronDown
                className='size-4 shrink-0 text-muted-foreground'
                aria-hidden
              />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position='popper'
              sideOffset={4}
              className={cn(
                overlayClass,
                'z-[100] max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[max(8rem,var(--radix-select-trigger-width))] overflow-hidden',
                'data-[state=open]:animate-pop-in',
              )}
            >
              <SelectPrimitive.Viewport className='p-1'>
                {groups.map((group, gi) => (
                  <SelectPrimitive.Group key={gi}>
                    {group.label && (
                      <SelectPrimitive.Label className='px-2 pb-1 pt-2 text-caption uppercase text-muted-foreground'>
                        {group.label}
                      </SelectPrimitive.Label>
                    )}
                    {group.options.map((option) => (
                      <SelectPrimitive.Item
                        key={option.value}
                        value={toItem(option.value)}
                        disabled={option.disabled}
                        className={cn(menuItemClass, 'pe-8')}
                      >
                        <SelectPrimitive.ItemText>
                          {option.label}
                        </SelectPrimitive.ItemText>
                        <SelectPrimitive.ItemIndicator className='absolute end-2 inline-flex items-center'>
                          <Check
                            className='size-4'
                            aria-hidden
                          />
                        </SelectPrimitive.ItemIndicator>
                      </SelectPrimitive.Item>
                    ))}
                  </SelectPrimitive.Group>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      </div>
    );
  },
);
