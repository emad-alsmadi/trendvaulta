import type { HTMLAttributes, ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '../../lib/cn';
import { cardClass, cardPadding, text } from './styles';

type CardProps = HTMLAttributes<HTMLElement> & {
  /** `false` for edge-to-edge content such as a table. */
  padded?: boolean;
  as?: 'section' | 'div' | 'article' | 'aside';
};

/** Bordered surface (12px radius, no shadow). */
export function Card({
  padded = true,
  as: Tag = 'section',
  className,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn(
        cardClass,
        padded && cardPadding,
        'transition-all duration-300 hover:shadow-lg hover:border-primary/20',
        className,
      )}
      {...props}
    />
  );
}

/** Card title row: title + optional description, actions at the end. */
export function CardHeader({
  title,
  description,
  actions,
  icon,
  className,
  titleAs: Title = 'h2',
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
  titleAs?: 'h2' | 'h3';
}) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-start justify-between gap-3',
        className,
      )}
    >
      <div className='min-w-0 space-y-1'>
        <div className='flex items-center gap-2'>
          {icon && (
            <span
              className='text-muted-foreground [&_svg]:size-5'
              aria-hidden
            >
              {icon}
            </span>
          )}
          <Title className={text.section}>{title}</Title>
        </div>
        {description && <p className={text.secondary}>{description}</p>}
      </div>
      {actions && (
        <div className='flex shrink-0 items-center gap-2'>{actions}</div>
      )}
    </div>
  );
}

/** Key–value row for detail cards; stack them inside a `divide-y` list. */
export function KeyValue({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className='flex items-baseline justify-between gap-4 py-2.5'>
      <dt className={text.secondary}>{label}</dt>
      <dd className='min-w-0 text-end text-sm font-medium text-foreground'>
        {children}
      </dd>
    </div>
  );
}

type Delta = { value: number; label?: ReactNode; formatted?: string };

/**
 * KPI tile: caption label, large tabular value, and a monochrome delta
 * (arrow + sign; direction is never shown by colour). `h-full` keeps a row
 * of tiles equal height.
 */
export function StatCard({
  label,
  value,
  icon,
  delta,
  footer,
  className,
  iconClassName,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  delta?: Delta;
  /** Sparkline or supporting line under the value. */
  footer?: ReactNode;
  className?: string;
  iconClassName?: string;
}) {
  const DeltaIcon =
    !delta || delta.value === 0
      ? Minus
      : delta.value > 0
        ? ArrowUpRight
        : ArrowDownRight;
  const sign =
    delta && delta.value > 0 ? '+' : delta && delta.value < 0 ? '−' : '';
  return (
    <Card
      as='div'
      className={cn(
        'flex h-full flex-col gap-3 group relative overflow-hidden',
        className,
      )}
    >
      <div className='absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
      <div className='relative flex items-center justify-between gap-3'>
        <p className={text.caption}>{label}</p>
        {icon && (
          <span
            className={cn(
              'transition-colors duration-300 [&_svg]:size-4',
              iconClassName || 'text-muted-foreground group-hover:text-primary',
            )}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          text.kpi,
          'relative group-hover:scale-105 transition-transform duration-300',
        )}
      >
        {value}
      </p>
      {delta && (
        <p className='relative flex items-center gap-1 text-body-sm text-muted-foreground'>
          <span className='inline-flex items-center gap-0.5 font-medium text-foreground'>
            <DeltaIcon
              className='size-3.5 rtl:-scale-x-100'
              aria-hidden
            />
            {delta.formatted ?? `${sign}${Math.abs(delta.value)}%`}
          </span>
          {delta.label}
        </p>
      )}
      {footer && <div className='relative mt-auto'>{footer}</div>}
    </Card>
  );
}
