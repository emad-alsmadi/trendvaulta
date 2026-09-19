'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MapPin, ChevronDown, Check, Truck } from 'lucide-react';
import {
  DEMO_DELIVER_REGIONS,
  type DemoDeliverRegion,
} from '@/data/demoStorefront';
import { getDeliverRegion, setDeliverRegionId } from '@/lib/deliverRegion';
import { cn } from '@/lib/utils';

/**
 * Soft “Deliver to” control — Amazon-like shipping expectation cue.
 * DEMO only: localStorage region preference, no geo/availability engine.
 * TODO(api): optional preference sync; never invent live shipping quotes here.
 */
export function DeliverToControl({ className }: { className?: string }) {
  // getDeliverRegion() reads localStorage (SSR-safe, falls back to the same
  // default region on the server and on first client render) — a lazy
  // initializer reads it once on mount instead of committing a null state
  // then correcting it in an effect.
  const [region, setRegion] = useState<DemoDeliverRegion>(() =>
    getDeliverRegion(),
  );
  const [tipOpen, setTipOpen] = useState(false);

  const label = region.label;

  return (
    <div className={cn('relative flex items-center gap-2', className)}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type='button'
            className='group inline-flex max-w-[220px] items-center gap-1.5 rounded-lg px-1.5 py-1 text-left transition hover:bg-stone-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500'
            aria-label={`Deliver to ${label}. Change delivery region.`}
          >
            <MapPin
              className='h-4 w-4 shrink-0 text-fuchsia-700'
              aria-hidden
            />
            <span className='min-w-0'>
              <span className='block text-[10px] font-semibold uppercase tracking-wide text-stone-500'>
                Deliver to
              </span>
              <span className='flex items-center gap-0.5 truncate text-xs font-extrabold text-stone-900'>
                <span className='truncate'>{label}</span>
                <ChevronDown
                  className='h-3.5 w-3.5 shrink-0 text-stone-500'
                  aria-hidden
                />
              </span>
            </span>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align='start'
            sideOffset={8}
            className='z-[60] w-[280px] overflow-hidden rounded-xl border border-stone-200 bg-white p-2 shadow-lg'
          >
            <div className='px-2 pb-2 pt-1'>
              <p className='text-xs font-extrabold text-stone-900'>
                Choose a delivery region
              </p>
              <p className='mt-0.5 text-[11px] font-semibold text-stone-500'>
                Demo preference only — checkout still sets real shipping.
              </p>
            </div>

            {DEMO_DELIVER_REGIONS.map((option) => {
              const selected = region.id === option.id;
              return (
                <DropdownMenu.Item
                  key={option.id}
                  onSelect={() => {
                    const next = setDeliverRegionId(option.id);
                    setRegion(next);
                    setTipOpen(true);
                  }}
                  className={cn(
                    'flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm outline-none transition',
                    selected
                      ? 'bg-fuchsia-50 text-fuchsia-950'
                      : 'text-stone-800 hover:bg-stone-50',
                  )}
                >
                  <Check
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      selected ? 'text-fuchsia-700' : 'text-transparent',
                    )}
                    aria-hidden
                  />
                  <span className='min-w-0'>
                    <span className='block font-bold'>{option.label}</span>
                    <span className='block text-[11px] font-semibold text-stone-500'>
                      {option.hint}
                    </span>
                  </span>
                </DropdownMenu.Item>
              );
            })}

            <DropdownMenu.Separator className='my-2 h-px bg-stone-100' />

            <DropdownMenu.Item asChild>
              <Link
                href='/shipping'
                className='flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold text-fuchsia-700 outline-none hover:bg-stone-50'
              >
                <Truck className='h-3.5 w-3.5' aria-hidden />
                Shipping &amp; delivery policy
              </Link>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {tipOpen ? (
        <div
          role='status'
          className='absolute left-0 top-full z-[55] mt-2 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-stone-200 bg-white p-3 text-xs shadow-lg'
        >
          <p className='font-semibold text-stone-700'>
            Showing shopping with delivery notes for{' '}
            <span className='font-extrabold text-stone-900'>{region.label}</span>
            . This is a demo cue — availability and rates are confirmed at
            checkout.
          </p>
          <div className='mt-2 flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={() => setTipOpen(false)}
              className='rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-bold text-stone-800 hover:bg-stone-50'
            >
              Dismiss
            </button>
            <Link
              href='/shipping'
              className='rounded-full bg-stone-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-stone-800'
              onClick={() => setTipOpen(false)}
            >
              View shipping info
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
