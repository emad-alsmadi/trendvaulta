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
  const user = data?.user;
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
    <div className='mx-auto max-w-[1400px] space-y-8 pb-12'>
      {/* Account header — flat and typographic; aligned to the inline start. */}
      <header className='flex flex-col gap-5 border-b border-line pb-6 pt-2 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex min-w-0 items-center gap-4'>
          <span
            aria-hidden
            className='inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg font-bold text-accent ring-1 ring-fuchsia-200/60'
          >
            {name ? initialsOf(name) : <UserRound className='h-6 w-6' />}
          </span>
          <div className='min-w-0'>
            <p className='text-eyebrow uppercase text-ink-subtle'>{t('nav.account')}</p>
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
          className='inline-flex items-center gap-2 self-start rounded-control px-3 py-2 text-sm font-semibold text-ink-muted transition-colors duration-(--dur-fast) hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 sm:self-auto'
        >
          <LogOut className='h-4 w-4 rtl:-scale-x-100' aria-hidden />
          {t('account.signOut')}
        </button>
      </header>

      {/* Strictly false: older accounts (no flag) count as confirmed */}
      {user?.emailVerified === false && user.email && (
        <VerifyEmailBanner email={user.email} />
      )}

      <div className='grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12'>
        <nav aria-label={t('account.sectionsLabel')} className='lg:sticky lg:top-40 lg:self-start'>
          {/* Mobile: underline tabs that scroll. Desktop: a quiet vertical list
              with an inline-start indicator on the active item. */}
          <ul className='hide-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-0 lg:px-0'>
            {SECTIONS.map((section) => {
              const active = isActive(section.href, 'exact' in section && section.exact);
              const Icon = section.icon;
              return (
                <li key={section.href} className='shrink-0'>
                  <Link
                    href={section.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center gap-3 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors duration-(--dur-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                      // Mobile tab underline / desktop inline-start bar.
                      'after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors lg:after:inset-x-auto lg:after:inset-y-2 lg:after:bottom-auto lg:after:start-0 lg:after:h-auto lg:after:w-0.5',
                      'lg:rounded-control lg:py-2.5 lg:ps-4',
                      active
                        ? 'text-ink after:bg-accent lg:bg-surface-muted'
                        : 'text-ink-muted after:bg-transparent hover:text-ink lg:hover:bg-surface-muted/60',
                    )}
                  >
                    <Icon
                      className={cn('h-4 w-4 shrink-0', active ? 'text-accent' : 'text-ink-subtle')}
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
