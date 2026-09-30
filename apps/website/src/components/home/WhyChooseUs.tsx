'use client';

import { motion } from 'framer-motion';
import {
  Shield,
  Truck,
  HeadphonesIcon,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';
import { DEMO_FALLBACK_ENABLED } from '@/data/demoStorefront';
import { useWhyChooseUs } from '@/hooks/storefront/whyChooseUsQuery';
import { useTranslation } from '@/contexts/TranslationContext';

const ICON_MAP: Record<string, LucideIcon> = {
  truck: Truck,
  refresh: RotateCcw,
  shield: Shield,
  headset: HeadphonesIcon,
};

const FALLBACK = [
  {
    id: 'delivery',
    icon: 'truck',
    titleKey: 'home.whyChooseUs.deliveryTitle',
    descriptionKey: 'home.whyChooseUs.deliveryDescription',
  },
  {
    id: 'returns',
    icon: 'refresh',
    titleKey: 'home.whyChooseUs.returnsTitle',
    descriptionKey: 'home.whyChooseUs.returnsDescription',
  },
  {
    id: 'payments',
    icon: 'shield',
    titleKey: 'home.whyChooseUs.paymentsTitle',
    descriptionKey: 'home.whyChooseUs.paymentsDescription',
  },
  {
    id: 'support',
    icon: 'headset',
    titleKey: 'home.whyChooseUs.supportTitle',
    descriptionKey: 'home.whyChooseUs.supportDescription',
  },
];

export function WhyChooseUs() {
  const { t } = useTranslation();
  const q = useWhyChooseUs();
  const hasLive = Boolean(q.data && q.data.length > 0);
  // Production: no live data (or still loading) → no section.
  if (!hasLive && (q.isLoading || !DEMO_FALLBACK_ENABLED)) return null;
  const features =
    q.data && q.data.length > 0
      ? q.data.map((item) => {
          // Default items share ids with FALLBACK → use the locale's copy.
          const known = FALLBACK.find((f) => f.id === item.id);
          return known
            ? { ...item, title: t(known.titleKey), description: t(known.descriptionKey) }
            : item;
        })
      : FALLBACK.map(({ id, icon, titleKey, descriptionKey }) => ({
          id,
          icon,
          title: t(titleKey),
          description: t(descriptionKey),
        }));

  return (
    <section
      aria-labelledby='why-choose-us-heading'
      className='bg-surface-sunken py-12 sm:py-16'
    >
      <div className='mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8'>
        <div className='mb-10 max-w-2xl'>
          <h2
            id='why-choose-us-heading'
            className='text-2xl font-extrabold text-ink sm:text-3xl'
          >
            {t('home.whyChooseUs.title')}
          </h2>
          <p className='mt-2 text-base text-ink-muted'>
            {t('home.whyChooseUs.subtitle')}
          </p>
        </div>

        {/* Editorial list, not boxed cards: a hairline, a quiet icon, and
            type doing the hierarchy. Flows from the inline start in RTL. */}
        <ul className='grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4'>
          {features.map((feature, index) => {
            const Icon =
              ICON_MAP[feature.icon || ''] || ICON_MAP.truck || Truck;
            return (
              <motion.li
                key={feature.id || feature.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className='border-t border-line pt-6'
              >
                <Icon className='h-6 w-6 text-accent' strokeWidth={1.75} aria-hidden />
                <h3 className='mt-5 text-heading text-ink'>{feature.title}</h3>
                <p className='mt-2 text-sm leading-relaxed text-ink-muted'>
                  {feature.description}
                </p>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
