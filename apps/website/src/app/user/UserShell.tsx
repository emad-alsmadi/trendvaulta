'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Heart,
  LayoutGrid,
  LogOut,
  MapPin,
  Package,
  Shield,
  Star,
  UserRound,
} from 'lucide-react';
import { VerifyEmailBanner } from '@/components/account/VerifyEmailBanner';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { useTranslation } from '@/contexts/TranslationContext';
import { useLogout, useMe } from '@/hooks/auth/authQuery';
import { useHasAuthToken } from '@/hooks/auth/useHasAuthToken';
import { getAuthToken } from '@/lib/authCookies';
import { buildLoginUrl } from '@/lib/safeRedirect';
import { cn } from '@/lib/utils';

/** `label` is a message key. `exact` marks the overview, which would otherwise match every page. */
const SECTIONS = [
  { href: '/user', label: 'userArea.nav.overview', icon: LayoutGrid, exact: true },
  { href: '/user/orders', label: 'common.orders', icon: Package },
  { href: '/user/wishlist', label: 'userArea.sidebar.wishlist', icon: Heart },
  { href: '/user/reviews', label: 'userArea.reviews.title', icon: Star },
  { href: '/user/addresses', label: 'common.addresses', icon: MapPin },
  { href: '/user/profile', label: 'userArea.sidebar.profile', icon: UserRound },
  { href: '/user/security', label: 'common.security', icon: Shield },
] as const;

function initialsOf(value: string) {
  const parts = value.trim().split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : value.slice(0, 2);
  return letters.toUpperCase() || 'U';
}

/** Header + section navigation shared by every page under /user. */
export function UserShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();
  const logout = useLogout();
  const { t } = useTranslation();
  const { data } = useMe();
  // The server renders signed-out (it can't read the token cookie), while a
  // cached `me` is ready on the client's first render; holding the user back
  // until the token is confirmed keeps hydration in step.
  const hasToken = useHasAuthToken();
  const user = hasToken ? data?.user : undefined;
  const name = user?.username || user?.email?.split('@')[0] || '';

  // proxy.ts guards /user on the server; this covers a token that expires
  // while the page is open.
  useEffect(() => {
    if (!getAuthToken()) router.replace(buildLoginUrl(pathname));
  }, [router, pathname]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const signOut = () =>
    confirm({
      variant: 'danger',
      title: t('nav.logoutConfirm.title'),
      description: t('nav.logoutConfirm.description'),
      confirmLabel: t('nav.logoutConfirm.confirm'),
      cancelLabel: t('nav.logoutConfirm.cancel'),
      closeOnBackdrop: false,
      onConfirm: async () => {
        await logout();
        router.push('/');
      },
    });

  return (
    <div className='pb-12'>
      {/* Account header and the verify notice run edge to edge as square,
          ruled bands: the negative margins cancel the page gutters (and the
          top padding, so the header sits flush under the navbar), while the
          copy inside lines up with the content below. */}
      <div className='-mx-4 -mt-6 sm:-mx-6 lg:-mx-20'>
      <header className='border-b border-line bg-surface'>
        <div className='px-4 sm:px-6 lg:px-20'>
          <div className='mx-auto flex max-w-[1400px] flex-col gap-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:py-8'>
        <div className='flex min-w-0 items-center gap-4'>
          <span
            aria-hidden
            className='inline-flex h-14 w-14 shrink-0 items-center justify-center bg-ink text-lg font-semibold text-white'
          >
            {name ? initialsOf(name) : <UserRound className='h-6 w-6' />}
          </span>
          <div className='min-w-0'>
            <p className='text-eyebrow uppercase text-ink-subtle rtl:tracking-normal'>
              {t('nav.account')}
            </p>
            <p className='mt-1 truncate text-heading text-ink sm:text-2xl'>
              {t('account.welcomeBack', {
                name: name || t('account.customerFallback'),
              })}
            </p>
            {user?.email && (
              <p className='mt-0.5 truncate text-sm text-ink-muted'>{user.email}</p>
            )}
          </div>
        </div>
        <button
          type='button'
          onClick={() => void signOut()}
          className='inline-flex items-center gap-2 self-start border border-ink px-4 py-2.5 text-sm font-semibold text-ink transition-colors duration-(--dur-fast) hover:bg-ink hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 sm:self-auto'
        >
          <LogOut className='h-4 w-4 rtl:-scale-x-100' aria-hidden />
          {t('account.signOut')}
        </button>
          </div>
        </div>
      </header>

      {/* Strictly false: older accounts (no flag) count as confirmed */}
      {user?.emailVerified === false && user.email && (
        <VerifyEmailBanner email={user.email} />
      )}
      </div>

      {/* minmax(0,…) on phones too: the scrolling pill row would otherwise
          stretch the single column to its full content width. */}
      <div className='mx-auto mt-8 grid max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8'>
        <nav aria-label={t('account.sectionsLabel')} className='min-w-0 lg:sticky lg:top-40 lg:self-start'>
          {/* Mobile: pills that scroll sideways. Desktop: a plain list with
              the active section filled in ink. */}
          <ul className='hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible'>
            {SECTIONS.map((section) => {
              const active = isActive(section.href, 'exact' in section && section.exact);
              const Icon = section.icon;
              return (
                <li key={section.href} className='shrink-0'>
                  <Link
                    href={section.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-(--dur-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 lg:rounded-control',
                      active
                        ? 'bg-ink text-white'
                        : 'text-ink-muted hover:bg-stone-200/50 hover:text-ink',
                    )}
                  >
                    <Icon
                      className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-ink-subtle')}
                      aria-hidden
                    />
                    {t(section.label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className='min-w-0'>{children}</div>
      </div>
    </div>
  );
}
