'use client';

import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  Heart,
  MapPin,
  Package,
  Shield,
  Star,
  UserRound,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useMyOrders } from '@/hooks/orders/ordersQuery';
import { useMyWishlist } from '@/hooks/wishlist/wishlistQuery';
import { useAddresses } from '@/hooks/profile/addressesQuery';
import { useMyReviews } from '@/hooks/reviews/reviewsQuery';
import { intlLocale } from '@/lib/locale';
import { STATUS_LABELS, statusBadgeClass } from '@/lib/orderStatus';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { UserPageHeader } from './UserPage';

/** `title` and `description` are message keys. */
const SECTIONS = [
  { href: '/user/orders', title: 'common.orders', description: 'orders.subtitle', icon: Package },
  { href: '/user/wishlist', title: 'userArea.sidebar.wishlist', description: 'userArea.overview.wishlistDescription', icon: Heart },
  { href: '/user/reviews', title: 'userArea.reviews.title', description: 'userArea.overview.reviewsDescription', icon: Star },
  { href: '/user/addresses', title: 'common.addresses', description: 'account.overview.addressesDescription', icon: MapPin },
  { href: '/user/profile', title: 'userArea.sidebar.profile', description: 'userArea.overview.profileDescription', icon: UserRound },
  { href: '/user/security', title: 'common.security', description: 'account.overview.securityDescription', icon: Shield },
] as const;

function Stat({
  href,
  label,
  value,
  loading,
}: {
  href: string;
  label: string;
  value?: number;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className='group block rounded-control py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50'
    >
      {loading ? (
        <Skeleton className='h-9 w-12' />
      ) : (
        <span className='block text-title tabular-nums text-ink transition-colors duration-(--dur-fast) group-hover:text-accent'>
          {value ?? 0}
        </span>
      )}
      <span className='mt-1 block text-sm text-ink-muted'>{label}</span>
    </Link>
  );
}

/** /user — account at a glance: counts, the latest order, then every section. */
export default function UserOverviewPage() {
  const { t, locale, formatPrice } = useTranslation();
  const orders = useMyOrders();
  const wishlist = useMyWishlist();
  const addresses = useAddresses();
  const reviews = useMyReviews();

  const latest = [...(orders.data ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];

  return (
    <div className='space-y-8'>
      <UserPageHeader
        title={t('userArea.nav.overview')}
        subtitle={t('account.subtitle')}
      />

      {/* At a glance — numbers carry the hierarchy, no boxes. */}
      <ul className='grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4'>
        {[
          { href: '/user/orders', label: t('common.orders'), q: orders },
          { href: '/user/wishlist', label: t('userArea.sidebar.wishlist'), q: wishlist },
          { href: '/user/addresses', label: t('common.addresses'), q: addresses },
          { href: '/user/reviews', label: t('userArea.reviews.title'), q: reviews },
        ].map(({ href, label, q }) => (
          <li key={href}>
            <Stat href={href} label={label} value={q.data?.length} loading={q.isLoading} />
          </li>
        ))}
      </ul>

      {/* Latest order */}
      <section aria-labelledby='latest-order-heading'>
        <h2 id='latest-order-heading' className='text-eyebrow uppercase text-ink-subtle rtl:tracking-normal'>
          {t('userArea.overview.latestOrder')}
        </h2>
        <Card variant='plain' className='mt-4'>
          {orders.isLoading ? (
            <div aria-hidden className='flex items-center justify-between gap-4'>
              <div className='space-y-2'>
                <Skeleton className='h-5 w-32' />
                <Skeleton className='h-3.5 w-48' />
              </div>
              <Skeleton className='h-9 w-28' />
            </div>
          ) : latest ? (
            <div className='flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between'>
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-3'>
                  <span className='font-mono text-base font-semibold text-ink' dir='ltr'>
                    #{latest._id.slice(-8).toUpperCase()}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      statusBadgeClass(latest.status),
                    )}
                  >
                    {STATUS_LABELS[latest.status] ? t(STATUS_LABELS[latest.status]) : latest.status}
                  </span>
                </div>
                <p className='mt-2 text-sm text-ink-muted'>
                  {new Date(latest.createdAt).toLocaleDateString(intlLocale(locale), {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  <span aria-hidden className='mx-2 text-ink-subtle'>·</span>
                  {t('orders.itemCount', { count: latest.items.length })}
                  <span aria-hidden className='mx-2 text-ink-subtle'>·</span>
                  <span className='font-semibold text-ink'>{formatPrice(latest.totalPrice)}</span>
                </p>
              </div>
              <Link
                href={`/user/orders/${latest._id}`}
                className='group inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-(--dur-fast) hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:self-auto'
              >
                {t('userArea.overview.viewOrder')}
                <ArrowRight
                  aria-hidden
                  className='h-4 w-4 transition-transform duration-(--dur-base) ease-brand rtl:-scale-x-100 ltr:group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5'
                />
              </Link>
            </div>
          ) : (
            <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <p className='font-semibold text-ink'>{t('orders.emptyTitle')}</p>
                <p className='mt-1 text-sm text-ink-muted'>{t('orders.emptyDescription')}</p>
              </div>
              <Link
                href='/products'
                className='inline-flex shrink-0 items-center self-start rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 sm:self-auto'
              >
                {t('orders.startShopping')}
              </Link>
            </div>
          )}
        </Card>
      </section>

      {/* Every section — a plain list: no tiles, no rules. */}
      <nav aria-label={t('account.sectionsLabel')}>
        <ul className='grid gap-x-10 gap-y-2 sm:grid-cols-2'>
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className='group flex h-full items-center gap-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30'
                >
                  <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-200/60 text-ink transition-colors duration-(--dur-fast) group-hover:bg-ink group-hover:text-white'>
                    <Icon className='h-5 w-5' strokeWidth={1.5} aria-hidden />
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block font-semibold text-ink'>{t(section.title)}</span>
                    <span className='mt-1 block text-sm text-ink-muted'>{t(section.description)}</span>
                  </span>
                  <ChevronRight
                    className='h-4 w-4 shrink-0 text-ink-subtle transition-transform duration-(--dur-base) ease-brand group-hover:text-ink rtl:-scale-x-100 ltr:group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5'
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
