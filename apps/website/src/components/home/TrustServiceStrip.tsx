'use client';

import { Truck, RefreshCw, ShieldCheck, Headphones } from 'lucide-react';
import {
  DEMO_FALLBACK_ENABLED,
  DEMO_TRUST_ITEMS,
  type DemoTrustItem,
} from '@/data/demoStorefront';
import { useStorefrontTrust } from '@/hooks/storefront/trustQuery';
import { useTranslation } from '@/contexts/TranslationContext';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';

const ICONS = {
  truck: Truck,
  refresh: RefreshCw,
  shield: ShieldCheck,
  headset: Headphones,
} as const;

type Props = {
  /** Optional override (tests / storybook). When omitted, fetches trust strip. */
  items?: DemoTrustItem[];
};

/** Trust / service strip — GET /api/storefront/trust with demo fallback */
export function TrustServiceStrip({ items: itemsProp }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useStorefrontTrust();

  const liveItems = data && data.length > 0 ? data : null;
  const items =
    itemsProp ??
    liveItems ??
    (!isLoading && DEMO_FALLBACK_ENABLED ? DEMO_TRUST_ITEMS : null);
  const usingFallback = !itemsProp && !liveItems && !isLoading;

  // Production: no data → no strip (never demo promises).
  if (!isLoading && !items) return null;

  return (
    <section
      aria-label={t('home.trust.ariaLabel')}
      className='border-y border-stone-200 bg-stone-50'
    >
      <div className='mx-auto grid max-w-[1400px] grid-cols-2 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-4 lg:px-8 lg:py-8'>
        {isLoading && !items ? (
          <SkeletonGroup label={t('home.trust.loading')} className='contents'>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} aria-hidden className='flex items-start gap-3'>
                <Skeleton className='h-10 w-10 shrink-0 rounded-lg' />
                <div className='min-w-0 flex-1'>
                  <Skeleton className='h-3.5 w-2/3' />
                  <Skeleton className='mt-2 h-3 w-5/6' />
                </div>
              </div>
            ))}
          </SkeletonGroup>
        ) : items ? (
          items.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <div
                key={item.id}
                className='flex items-start gap-3'
              >
                <span className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-stone-800 shadow-sm ring-1 ring-stone-200'>
                  <Icon
                    className='h-5 w-5'
                    aria-hidden
                  />
                </span>
                <div>
                  <h3 className='text-sm font-semibold text-stone-900'>
                    {t(item.title)}
                  </h3>
                  <p className='mt-0.5 text-xs text-stone-600 sm:text-sm'>
                    {t(item.description)}
                  </p>
                </div>
              </div>
            );
          })
        ) : null}
      </div>
      {(isError || usingFallback) && (
        <p className='sr-only'>
          {t('home.trust.demoNotice')}
        </p>
      )}
    </section>
  );
}
