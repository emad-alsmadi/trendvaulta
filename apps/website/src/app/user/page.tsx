'use client';

import Link from 'next/link';
import {
  ChevronRight,
  Heart,
  MapPin,
  Package,
  Shield,
  Star,
  UserRound,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

/** `title` and `description` are message keys. */
const CARDS = [
  { href: '/user/orders', title: 'common.orders', description: 'orders.subtitle', icon: Package },
  { href: '/user/wishlist', title: 'userArea.sidebar.wishlist', description: 'userArea.overview.wishlistDescription', icon: Heart },
  { href: '/user/reviews', title: 'userArea.reviews.title', description: 'userArea.overview.reviewsDescription', icon: Star },
  { href: '/user/addresses', title: 'common.addresses', description: 'account.overview.addressesDescription', icon: MapPin },
  { href: '/user/profile', title: 'userArea.sidebar.profile', description: 'userArea.overview.profileDescription', icon: UserRound },
  { href: '/user/security', title: 'common.security', description: 'account.overview.securityDescription', icon: Shield },
] as const;

/** /user — one card per account section. */
export default function UserOverviewPage() {
  const { t } = useTranslation();

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-extrabold tracking-tight text-indigo-950'>
          {t('userArea.nav.overview')}
        </h1>
        <p className='mt-1 text-sm font-semibold text-indigo-950/70'>{t('account.subtitle')}</p>
      </div>

      <ul className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <li key={card.href}>
              <Link
                href={card.href}
                className='group flex h-full flex-col rounded-3xl border border-white/40 bg-white/55 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/75 hover:shadow-md'
              >
                <span className='inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700'>
                  <Icon className='h-5 w-5' aria-hidden />
                </span>
                <span className='mt-4 flex items-center justify-between gap-2 text-base font-bold text-indigo-950'>
                  {t(card.title)}
                  <ChevronRight
                    className='h-4 w-4 text-indigo-950/40 transition group-hover:text-indigo-700 rtl:-scale-x-100'
                    aria-hidden
                  />
                </span>
                <span className='mt-1 text-sm text-indigo-950/70'>{t(card.description)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
