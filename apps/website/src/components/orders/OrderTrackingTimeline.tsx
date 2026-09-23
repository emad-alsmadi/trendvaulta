'use client';

import { Check, Circle, PackageX, Truck } from 'lucide-react';
import type { Order } from '@/types';
import {
  buildDemoOrderTracking,
  type OrderTrackingStep,
} from '@/lib/orderTracking';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Props = {
  order: Pick<
    Order,
    | 'status'
    | 'paymentStatus'
    | 'createdAt'
    | 'paidAt'
    | 'updatedAt'
    | 'shippingAddress'
    | '_id'
  >;
  compact?: boolean;
};

function StepIcon({ state }: { state: OrderTrackingStep['state'] }) {
  if (state === 'canceled') {
    return <PackageX className='h-4 w-4' aria-hidden />;
  }
  if (state === 'complete') {
    return <Check className='h-4 w-4' aria-hidden />;
  }
  if (state === 'current') {
    return <Truck className='h-4 w-4' aria-hidden />;
  }
  return <Circle className='h-3.5 w-3.5' aria-hidden />;
}

/**
 * DEMO fulfillment timeline from order status.
 * TODO(api): replace with shipment events from GET /api/orders/:id/tracking
 */
export function OrderTrackingTimeline({ order, compact = false }: Props) {
  const { steps, demoCarrierNote } = buildDemoOrderTracking(order);

  return (
    <section
      aria-labelledby={`tracking-${order._id}`}
      className={cn(
        'rounded-2xl border border-stone-200 bg-white',
        compact ? 'p-4' : 'p-5 sm:p-6',
      )}
    >
      <div className='mb-4 flex flex-wrap items-start justify-between gap-2'>
        <div>
          <p className='text-xs font-medium uppercase tracking-wider text-stone-500'>
            Demo tracking
          </p>
          <h2
            id={`tracking-${order._id}`}
            className={cn(
              'font-extrabold text-stone-900',
              compact ? 'text-base' : 'text-lg sm:text-xl',
            )}
          >
            Order progress
          </h2>
        </div>
        <Link
          href='/shipping'
          className='text-xs font-bold text-fuchsia-700 hover:underline'
        >
          Shipping policy
        </Link>
      </div>

      <ol className='relative space-y-0'>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li key={step.id} className='relative flex gap-3 pb-5 last:pb-0'>
              {!isLast && (
                <span
                  className={cn(
                    'absolute start-[15px] top-8 h-[calc(100%-1.25rem)] w-0.5',
                    step.state === 'complete'
                      ? 'bg-fuchsia-300'
                      : 'bg-stone-200',
                  )}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  'relative z-[1] inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2',
                  step.state === 'complete' &&
                    'bg-fuchsia-600 text-white ring-fuchsia-200',
                  step.state === 'current' &&
                    'bg-white text-fuchsia-700 ring-fuchsia-400',
                  step.state === 'upcoming' &&
                    'bg-stone-50 text-stone-400 ring-stone-200',
                  step.state === 'canceled' &&
                    'bg-rose-600 text-white ring-rose-200',
                )}
              >
                <StepIcon state={step.state} />
              </span>
              <div className='min-w-0 pt-0.5'>
                <p
                  className={cn(
                    'text-sm font-extrabold',
                    step.state === 'upcoming'
                      ? 'text-stone-500'
                      : 'text-stone-900',
                  )}
                >
                  {step.title}
                </p>
                <p className='mt-0.5 text-xs font-semibold text-stone-600'>
                  {step.description}
                </p>
                {step.at ? (
                  <p className='mt-1 text-[11px] font-medium text-stone-400'>
                    {new Date(step.at).toLocaleString()}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {demoCarrierNote ? (
        <p className='mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900'>
          {demoCarrierNote}
        </p>
      ) : (
        <p className='mt-4 text-[11px] font-semibold text-stone-400'>
          Timeline is estimated from order status until live carrier tracking is
          connected.
        </p>
      )}
    </section>
  );
}
