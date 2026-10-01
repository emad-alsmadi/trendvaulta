import { cva, type VariantProps } from 'class-variance-authority';

/*
 * Class recipes for the shared primitives. They live apart from the components
 * (react-refresh only allows components in .tsx modules) and can be applied to
 * elements a component doesn't fit, e.g. a <Link> styled as a button.
 * Everything resolves to the monochrome tokens in index.css — no hex, no hues.
 */

/** 2px ring, 2px offset, on the surface behind the control. */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const disabled = 'disabled:cursor-not-allowed disabled:opacity-50';

export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium',
    'transition-colors duration-fast ease-out aria-busy:cursor-wait',
    '[&_svg]:size-4 [&_svg]:shrink-0',
    focusRing,
    disabled,
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-card hover:bg-primary/90 active:bg-primary/80',
        /** Kept for older call sites; the brand is the primary black. */
        brand:
          'bg-primary text-primary-foreground shadow-card hover:bg-primary/90 active:bg-primary/80',
        secondary:
          'border border-border-strong bg-background text-foreground shadow-card hover:bg-accent active:bg-muted',
        ghost: 'text-foreground hover:bg-accent active:bg-muted',
        subtle:
          'bg-secondary text-secondary-foreground hover:bg-border/60 active:bg-border',
        // No red: the icon, the wording, its place (last) and a confirm dialog carry it.
        destructive:
          'border border-border-strong bg-background text-foreground shadow-card hover:border-foreground hover:bg-accent active:bg-muted',
        link: 'text-foreground underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-control-sm px-3 text-body-sm',
        md: 'h-control px-4 text-sm',
        lg: 'h-control-lg px-5 text-sm',
        'icon-sm': 'size-8',
        icon: 'size-9',
        'icon-lg': 'size-10',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0 shadow-none' }],
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);
export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

/* ---- Form controls: one height, border, radius and focus treatment ---- */

const controlBase = [
  'w-full rounded-control border border-input bg-background text-sm text-foreground shadow-card',
  'placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-fast ease-out',
  'hover:border-foreground/40',
  'focus-visible:border-foreground',
  focusRing,
  'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
  'read-only:bg-muted/60',
  // Errors: a heavier edge, never a colour (the message carries an icon).
  'aria-[invalid=true]:border-foreground aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-foreground',
].join(' ');

export const inputClass = `${controlBase} block h-control px-3`;
export const textareaClass = `${controlBase} block min-h-24 px-3 py-2 leading-5`;
/** The Radix select trigger: text at the start, chevron at the end. */
export const selectClass = `${controlBase} flex h-control cursor-pointer items-center justify-between gap-2 px-3 text-start`;
export const checkboxClass = `size-4 shrink-0 cursor-pointer rounded border-input accent-primary ${focusRing} ${disabled}`;

export const labelClass = 'block text-sm font-medium text-foreground';
export const hintClass = 'text-xs text-muted-foreground';

/* ---- Surfaces ---- */

export const cardClass =
  'rounded-card border border-border bg-card text-card-foreground shadow-card';
export const cardPadding = 'p-5 sm:p-6';
/** Dropdowns, popovers, tooltips: the only surfaces with a deep shadow. */
export const overlayClass =
  'rounded-badge border border-border bg-popover text-popover-foreground shadow-overlay';
/** One row inside a menu or select list. */
export const menuItemClass =
  'relative flex min-h-8 cursor-pointer select-none items-center gap-2 rounded-control px-2 py-1.5 text-sm text-foreground outline-none transition-colors duration-fast data-[highlighted]:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

/* ---- Tables ---- */

export const table = {
  /** Scrolls sideways inside its card on narrow screens — never the page. */
  wrap: 'relative w-full overflow-x-auto',
  root: 'w-full border-collapse text-sm',
  head: 'sticky top-0 z-10 bg-muted/60 backdrop-blur',
  th: 'h-10 whitespace-nowrap border-b border-border px-4 text-start align-middle text-caption uppercase text-muted-foreground',
  row: 'border-b border-border transition-colors duration-fast last:border-0 hover:bg-muted/50 data-[selected=true]:bg-muted',
  td: 'px-4 py-3 align-middle',
  tdCompact: 'px-4 py-2 align-middle',
  /** Numbers, prices, quantities: end-aligned on tabular figures. */
  numeric: 'text-end tabular-nums',
  /** Fixed last column for row actions. */
  actions: 'w-px whitespace-nowrap text-end',
  thumb:
    'size-10 shrink-0 rounded-control border border-border bg-muted object-cover',
} as const;

/* ---- Typography helpers ---- */

export const text = {
  pageTitle: 'text-page-title text-foreground',
  section: 'text-section text-foreground',
  cardTitle: 'text-card-title text-foreground',
  secondary: 'text-body-sm text-muted-foreground',
  caption: 'text-caption uppercase text-muted-foreground',
  kpi: 'text-kpi tabular-nums text-foreground',
} as const;
