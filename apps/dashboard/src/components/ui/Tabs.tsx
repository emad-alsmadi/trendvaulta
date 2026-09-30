import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { focusRing } from './styles';

type Item<V extends string> = { value: V; label: ReactNode; count?: number; disabled?: boolean };

/** Arrow / Home / End move between enabled items and select them (roving tabindex). */
function useRovingKeys<V extends string>(items: Item<V>[], value: V, onChange: (v: V) => void) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
    const at = enabled.indexOf(items.findIndex((it) => it.value === value));
    const rtl = document.documentElement.dir === 'rtl';
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 } as Record<string, number>;
    let next: number | undefined;
    if (e.key in step) next = enabled[(at + step[e.key] + enabled.length) % enabled.length];
    else if (e.key === 'Home') next = enabled[0];
    else if (e.key === 'End') next = enabled[enabled.length - 1];
    if (next === undefined) return;
    e.preventDefault();
    onChange(items[next].value);
    refs.current[next]?.focus();
  };
  return { refs, onKeyDown };
}

/**
 * Underline tabs for page sections. Renders the tab strip only; the caller
 * renders the matching panel (give it role="tabpanel" and aria-labelledby
 * `${idPrefix}-${value}`).
 */
export function Tabs<V extends string>({
  items,
  value,
  onChange,
  label,
  idPrefix = 'tab',
  className,
}: {
  items: Item<V>[];
  value: V;
  onChange: (value: V) => void;
  label: string;
  idPrefix?: string;
  className?: string;
}) {
  const { refs, onKeyDown } = useRovingKeys(items, value, onChange);
  return (
    <div role='tablist' aria-label={label} className={cn('flex gap-6 overflow-x-auto border-b border-border', className)}>
      {items.map((it, i) => {
        const selected = it.value === value;
        return (
          <button
            key={it.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${idPrefix}-${it.value}`}
            type='button'
            role='tab'
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={it.disabled}
            onClick={() => onChange(it.value)}
            onKeyDown={onKeyDown}
            className={cn(
              '-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 text-sm font-medium transition-colors duration-150 ease-out',
              'rounded-t-control disabled:cursor-not-allowed disabled:opacity-50',
              focusRing,
              selected
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground',
            )}
          >
            {it.label}
            {it.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Segmented control for small toggles (period, view, density): a radio group. */
export function SegmentedControl<V extends string>({
  items,
  value,
  onChange,
  label,
  size = 'md',
  className,
}: {
  items: Item<V>[];
  value: V;
  onChange: (value: V) => void;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const { refs, onKeyDown } = useRovingKeys(items, value, onChange);
  return (
    <div
      role='radiogroup'
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-control border border-border bg-muted p-0.5',
        size === 'sm' ? 'h-control-sm' : 'h-control',
        className,
      )}
    >
      {items.map((it, i) => {
        const selected = it.value === value;
        return (
          <button
            key={it.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type='button'
            role='radio'
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={it.disabled}
            onClick={() => onChange(it.value)}
            onKeyDown={onKeyDown}
            className={cn(
              'inline-flex h-full items-center rounded px-3 font-medium transition-colors duration-150 ease-out',
              size === 'sm' ? 'text-xs' : 'text-body-sm',
              'disabled:cursor-not-allowed disabled:opacity-50',
              focusRing,
              selected
                ? 'border border-border bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
