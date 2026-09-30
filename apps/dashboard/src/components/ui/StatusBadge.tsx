import type { ReactNode } from 'react';
import { AlertTriangle, Ban, X } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Status without colour. Each tone differs in fill, mark and weight, and the
 * text label is always rendered, so no state relies on shade alone:
 *
 *   solid      ● filled dot, inverted fill   — done / live        (delivered, paid, active)
 *   outline    ◐ half dot, outlined          — moving             (shipped, approved, received)
 *   tint       ○ hollow dot, grey fill       — waiting            (pending, requested, draft)
 *   attention  ⚠ icon, heavy outline, bold   — needs a person     (needs_attention, failed, low stock)
 *   ended      ⃠ icon, dashed outline, muted — void / closed out  (canceled, refunded, inactive)
 *   neutral    no mark, grey fill            — plain tag          (categories, brands, roles)
 */
export type BadgeTone = 'solid' | 'outline' | 'tint' | 'attention' | 'ended' | 'neutral';

/** The one map from a status value to its treatment — extend it here, not per page. */
const STATUS_TONE: Record<string, BadgeTone> = {
  // done / live
  delivered: 'solid',
  paid: 'solid',
  completed: 'solid',
  active: 'solid',
  published: 'solid',
  subscribed: 'solid',
  in_stock: 'solid',
  // moving
  shipped: 'outline',
  processing: 'outline',
  approved: 'outline',
  received: 'outline',
  new: 'outline',
  scheduled: 'outline',
  // waiting
  pending: 'tint',
  requested: 'tint',
  unpaid: 'tint',
  draft: 'tint',
  read: 'tint',
  // needs a person
  needs_attention: 'attention',
  failed: 'attention',
  refund_failed: 'attention',
  low_stock: 'attention',
  out_of_stock: 'attention',
  // void / closed out
  canceled: 'ended',
  cancelled: 'ended',
  rejected: 'ended',
  refunded: 'ended',
  closed: 'ended',
  unsubscribed: 'ended',
  inactive: 'ended',
  expired: 'ended',
  hidden: 'ended',
};

// eslint-disable-next-line react-refresh/only-export-components -- lookup co-located with the badge it drives
export const statusTone = (status: string | null | undefined): BadgeTone =>
  STATUS_TONE[String(status ?? '').toLowerCase()] ?? 'tint';

const TONE_CLASS: Record<BadgeTone, string> = {
  solid: 'bg-primary text-primary-foreground',
  outline: 'border border-input text-foreground',
  tint: 'bg-muted text-foreground',
  attention: 'border border-foreground font-semibold text-foreground',
  ended: 'border border-dashed border-input text-muted-foreground',
  neutral: 'bg-muted text-muted-foreground',
};

function Mark({ tone }: { tone: BadgeTone }) {
  switch (tone) {
    case 'solid':
      return <span aria-hidden className='size-2 shrink-0 rounded-full bg-current' />;
    case 'outline':
      return (
        <span aria-hidden className='flex size-2 shrink-0 overflow-hidden rounded-full border border-current'>
          <span className='h-full w-1/2 bg-current' />
        </span>
      );
    case 'tint':
      return <span aria-hidden className='size-2 shrink-0 rounded-full border border-current' />;
    case 'attention':
      return <AlertTriangle aria-hidden className='size-3 shrink-0' />;
    case 'ended':
      return <Ban aria-hidden className='size-3 shrink-0' />;
    default:
      return null;
  }
}

type BadgeProps = {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  /** Hide the leading mark (e.g. dense tag lists). */
  plain?: boolean;
  title?: string;
};

/** Generic badge in one of the tones. Prefer <StatusBadge> for a status value. */
export function Badge({ tone = 'neutral', children, className, plain, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-6 max-w-full items-center gap-1.5 whitespace-nowrap rounded-badge px-2 text-xs font-medium',
        TONE_CLASS[tone],
        className,
      )}
    >
      {!plain && <Mark tone={tone} />}
      <span className='truncate'>{children}</span>
    </span>
  );
}

/**
 * A status value rendered through the shared map. `children` is the
 * translated label (e.g. tv('orderStatus', order.status)); `tone` overrides
 * the map for one-off cases.
 */
export function StatusBadge({
  status,
  children,
  tone,
  className,
}: {
  status: string | null | undefined;
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <Badge tone={tone ?? statusTone(status)} className={className}>
      {children}
    </Badge>
  );
}

/** Neutral tag for categories, brands and roles; removable when `onRemove` is set. */
export function Tag({
  children,
  onRemove,
  removeLabel,
  className,
}: {
  children: ReactNode;
  onRemove?: () => void;
  /** Accessible name for the remove button, e.g. t('common.removeFilter', { name }). */
  removeLabel?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 max-w-full items-center gap-1 rounded-badge border border-border bg-background px-2 text-xs font-medium text-foreground',
        onRemove && 'pe-1',
        className,
      )}
    >
      <span className='truncate'>{children}</span>
      {onRemove && (
        <button
          type='button'
          onClick={onRemove}
          aria-label={removeLabel}
          className='inline-flex size-4 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          <X className='size-3' aria-hidden />
        </button>
      )}
    </span>
  );
}
